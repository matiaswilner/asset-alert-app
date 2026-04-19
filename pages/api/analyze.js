import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { callSonnet } from '../../lib/ai'
import { buildAnalysisPrompt, ANALYSIS_PROMPT_VERSION } from '../../lib/prompts/analysis'
import { getPrice } from '../../lib/prices'
import { logError } from '../../lib/logger'

async function fetchMarketauxNews(symbol) {
  try {
    const response = await fetch(
      `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`
    )
    const data = await response.json()
    if (!data.data || data.data.length === 0) return []
    return data.data.slice(0, 4).map(a => `[Marketaux] ${a.title}: ${a.description || ''}`)
  } catch (err) {
    await logError({ source: 'analyze:marketaux', category: 'external_api', message: err.message })
    return []
  }
}

async function fetchFinnhubNews(symbol) {
  try {
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
    )
    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return []
    return data.slice(0, 4).map(a => `[Finnhub] ${a.headline}: ${a.summary || ''}`)
  } catch (err) {
    await logError({ source: 'analyze:finnhub', category: 'external_api', message: err.message })
    return []
  }
}

async function fetchNews(symbol) {
  const [marketauxNews, finnhubNews] = await Promise.all([
    fetchMarketauxNews(symbol),
    fetchFinnhubNews(symbol),
  ])
  const combined = [...marketauxNews, ...finnhubNews]
  if (combined.length === 0) return 'No recent news found.'
  return combined.map(n => `- ${n}`).join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol, assetType, priceChange, timeframe, currentPrice, previousPrice, alertId, triggeredBy = 'manual', userId } = req.body

  if (!symbol || !timeframe) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    let resolvedPriceChange = priceChange
    let resolvedCurrentPrice = currentPrice
    let resolvedPreviousPrice = previousPrice

    if (triggeredBy === 'manual' || !currentPrice) {
      try {
        const price = await getPrice(symbol, assetType || 'stock')
        resolvedCurrentPrice = price.currentPrice.toFixed(2)
        resolvedPreviousPrice = (price.currentPrice / (1 + price.changeDay / 100)).toFixed(2)
        resolvedPriceChange = `${price.changeDay.toFixed(2)}% en el día`
      } catch (err) {
        await logError({ source: 'analyze:getPrice', category: 'external_api', message: err.message, details: { symbol } })
        return res.status(500).json({ error: err.message })
      }
    }

    const newsData = await fetchNews(symbol)

    const prompt = buildAnalysisPrompt({
      symbol,
      priceChange: resolvedPriceChange,
      timeframe,
      newsData,
      currentPrice: resolvedCurrentPrice,
      previousPrice: resolvedPreviousPrice,
    })

    let analysis
    try {
      analysis = await callSonnet(prompt)
    } catch (err) {
      await logError({ source: 'analyze:claude', category: 'external_api', message: err.message, details: { symbol } })
      return res.status(500).json({ error: err.message })
    }

    const { data, error } = await supabase
      .from('alert_analyses')
      .insert([{
        alert_id: alertId || null,
        asset_symbol: symbol,
        movement_type: analysis.context,
        summary: analysis.summary,
        explanation: analysis.explanation,
        context: analysis.context,
        interpretation: analysis.interpretation,
        recommendation: analysis.recommendation,
        score: analysis.score,
        confidence: analysis.confidence,
        triggered_by: triggeredBy,
        prompt_version: ANALYSIS_PROMPT_VERSION,
        user_id: userId || null,
      }])
      .select()
      .single()

    if (error) {
      await logError({ source: 'analyze:insertAnalysis', category: 'database', message: error.message })
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ analysis: data })
  } catch (err) {
    await logError({ source: 'analyze', category: 'internal', message: err.message })
    return res.status(500).json({ error: err.message })
  }
}

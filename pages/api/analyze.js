import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { callClaude } from '../../lib/ai'
import { buildAnalysisPrompt, ANALYSIS_PROMPT_VERSION } from '../../lib/prompts/analysis'
import { getPrice } from '../../lib/prices'

async function fetchMarketauxNews(symbol) {
  try {
    const response = await fetch(
      `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`
    )
    const data = await response.json()
    if (!data.data || data.data.length === 0) return []
    return data.data
      .slice(0, 4)
      .map(a => `[Marketaux] ${a.title}: ${a.description || ''}`)
  } catch {
    return []
  }
}

async function fetchAlphaVantageNews(symbol) {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&limit=4&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    )
    const data = await response.json()
    if (!data.feed || data.feed.length === 0) return []
    return data.feed
      .slice(0, 4)
      .map(a => `[AlphaVantage] ${a.title}: ${a.summary || ''}`)
  } catch {
    return []
  }
}

async function fetchNews(symbol) {
  const [marketauxNews, alphaVantageNews] = await Promise.all([
    fetchMarketauxNews(symbol),
    fetchAlphaVantageNews(symbol),
  ])
  const combined = [...marketauxNews, ...alphaVantageNews]
  if (combined.length === 0) return 'No recent news found.'
  return combined.map(n => `- ${n}`).join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol, assetType, priceChange, timeframe, currentPrice, previousPrice, alertId, triggeredBy = 'manual' } = req.body

  if (!symbol || !timeframe) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Si es manual, buscamos el precio real
    let resolvedPriceChange = priceChange
    let resolvedCurrentPrice = currentPrice
    let resolvedPreviousPrice = previousPrice

    if (triggeredBy === 'manual' || !currentPrice) {
      const price = await getPrice(symbol, assetType || 'stock')
      resolvedCurrentPrice = price.currentPrice.toFixed(2)
      resolvedPreviousPrice = (price.currentPrice / (1 + price.changeDay / 100)).toFixed(2)
      resolvedPriceChange = `${price.changeDay.toFixed(2)}% en el día`
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
    const analysis = await callClaude(prompt)

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
      }])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ analysis: data })
  } catch (err) {
    console.error('Analyze error:', err.message, err.stack)
    return res.status(500).json({ error: err.message })
  }
}

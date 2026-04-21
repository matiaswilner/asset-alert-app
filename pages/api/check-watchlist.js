import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { getPrices } from '../../lib/prices'
import { buildSmartAlertEvalPrompt } from '../../lib/prompts/smartAlert'
import { buildAnalysisPrompt, ANALYSIS_PROMPT_VERSION } from '../../lib/prompts/analysis'
import { callHaiku, callSonnet, sendPushNotification } from '../../lib/ai'
import { logError } from '../../lib/logger'

async function fetchMarketauxNews(symbol) {
  try {
    const response = await fetch(
      `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`
    )
    const data = await response.json()
    if (!data.data || data.data.length === 0) return []
    return data.data.slice(0, 3).map(a => `[Marketaux] ${a.title}: ${a.description || ''}`)
  } catch (err) {
    await logError({ source: 'check-watchlist.js:fetchMarketauxNews', category: 'external_api', message: err.message, details: { symbol } })
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
    return data.slice(0, 3).map(a => `[Finnhub] ${a.headline}: ${a.summary || ''}`)
  } catch (err) {
    await logError({ source: 'check-watchlist.js:fetchFinnhubNews', category: 'external_api', message: err.message, details: { symbol } })
    return []
  }
}

async function fetchNews(symbol) {
  const [marketauxNews, finnhubNews] = await Promise.all([
    fetchMarketauxNews(symbol),
    fetchFinnhubNews(symbol),
  ])
  const combined = [...marketauxNews, ...finnhubNews]
  return combined.length === 0 ? 'No recent news found.' : combined.map(n => `- ${n}`).join('\n')
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: watchlist, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('is_active', true)

  if (error) {
    await logError({ source: 'check-watchlist.js:fetchWatchlist', category: 'database', message: error.message })
    return res.status(500).json({ error: error.message })
  }

  if (!watchlist.length) return res.status(200).json({ message: 'No active watchlist items' })

  // Obtener símbolos únicos para batch
  const uniqueSymbols = [...new Map(
    watchlist.map(i => [i.asset_symbol, { symbol: i.asset_symbol, assetType: i.asset_type }])
  ).values()]

  // Fetch de precios en batch
  let prices = {}
  try {
    prices = await getPrices(uniqueSymbols)
  } catch (err) {
    await logError({ source: 'check-watchlist.js:getPrices', category: 'external_api', message: err.message })
    return res.status(500).json({ error: err.message })
  }

  const results = []

  for (const item of watchlist) {
    const price = prices[item.asset_symbol]

    if (!price || price.error) {
      results.push({ symbol: item.asset_symbol, status: 'error', message: price?.error || 'Price not available' })
      continue
    }

    try {
      const newsData = await fetchNews(item.asset_symbol)

      const evalPrompt = buildSmartAlertEvalPrompt({
        symbol: item.asset_symbol,
        assetType: item.asset_type,
        changeDay: price.changeDay.toFixed(2),
        changeWeek: price.changeWeek.toFixed(2),
        currentPrice: price.currentPrice.toFixed(2),
        newsData,
      })

      let evaluation
      try {
        evaluation = await callHaiku(evalPrompt)
      } catch (err) {
        await logError({ source: 'check-watchlist.js:callHaiku', category: 'external_api', message: err.message, details: { symbol: item.asset_symbol } })
        results.push({ symbol: item.asset_symbol, status: 'error', message: err.message })
        continue
      }

      if (!evaluation.should_notify) {
        results.push({ symbol: item.asset_symbol, status: 'skipped', reason: evaluation.reason })
        continue
      }

      const previousPrice = (price.currentPrice / (1 + price.changeDay / 100)).toFixed(2)
      const analysisPrompt = buildAnalysisPrompt({
        symbol: item.asset_symbol,
        priceChange: `${price.changeDay.toFixed(2)}%`,
        timeframe: '1 day',
        newsData,
        currentPrice: price.currentPrice.toFixed(2),
        previousPrice,
      })

      let analysis
      try {
        analysis = await callSonnet(analysisPrompt)
      } catch (err) {
        await logError({ source: 'check-watchlist.js:callSonnet', category: 'external_api', message: err.message, details: { symbol: item.asset_symbol } })
        results.push({ symbol: item.asset_symbol, status: 'error', message: err.message })
        continue
      }

      const { error: insertError } = await supabase.from('alert_analyses').insert([{
        alert_id: null,
        asset_symbol: item.asset_symbol,
        movement_type: analysis.context,
        summary: analysis.summary,
        explanation: analysis.explanation,
        context: analysis.context,
        interpretation: analysis.interpretation,
        recommendation: analysis.recommendation,
        score: analysis.score,
        confidence: analysis.confidence,
        triggered_by: 'smart_alert',
        prompt_version: ANALYSIS_PROMPT_VERSION,
        user_id: item.user_id,
      }])

      if (insertError) {
        await logError({ source: 'check-watchlist.js:insertAnalysis', category: 'database', message: insertError.message, details: { symbol: item.asset_symbol } })
      }

      await sendPushNotification({
        title: '🧠 Smart Alert',
        body: `${item.asset_symbol}: ${analysis.recommendation} — ${analysis.summary}`,
        assetSymbol: item.asset_symbol,
        triggeredBy: 'smart_alert',
        userId: item.user_id,
      })

      results.push({ symbol: item.asset_symbol, status: 'notified', reason: evaluation.reason })
    } catch (err) {
      await logError({ source: 'check-watchlist.js:processItem', category: 'internal', message: err.message, details: { symbol: item.asset_symbol } })
      results.push({ symbol: item.asset_symbol, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}

import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { getPrice } from '../../lib/prices'
import { buildSmartAlertEvalPrompt } from '../../lib/prompts/smartAlert'
import { buildAnalysisPrompt, ANALYSIS_PROMPT_VERSION } from '../../lib/prompts/analysis'
import { callHaiku, callSonnet, sendPushNotification } from '../../lib/ai'

async function fetchMarketauxNews(symbol) {
  try {
    const response = await fetch(
      `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`
    )
    const data = await response.json()
    if (!data.data || data.data.length === 0) return []
    return data.data.slice(0, 3).map(a => `[Marketaux] ${a.title}: ${a.description || ''}`)
  } catch { return [] }
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
  } catch { return [] }
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
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: watchlist, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('is_active', true)

  if (error) return res.status(500).json({ error: error.message })
  if (!watchlist.length) return res.status(200).json({ message: 'No active watchlist items' })

  const results = []

  for (const item of watchlist) {
    try {
      const price = await getPrice(item.asset_symbol, item.asset_type)
      const newsData = await fetchNews(item.asset_symbol)

      const evalPrompt = buildSmartAlertEvalPrompt({
        symbol: item.asset_symbol,
        assetType: item.asset_type,
        changeDay: price.changeDay.toFixed(2),
        changeWeek: price.changeWeek.toFixed(2),
        currentPrice: price.currentPrice.toFixed(2),
        newsData,
      })

      const evaluation = await callHaiku(evalPrompt)

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

      const analysis = await callSonnet(analysisPrompt)

      await supabase.from('alert_analyses').insert([{
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
      }])

      await sendPushNotification({
        title: '🧠 Smart Alert',
        body: `${item.asset_symbol}: ${analysis.recommendation} — ${analysis.summary.slice(0, 80)}...`,
        assetSymbol: item.asset_symbol,
        triggeredBy: 'smart_alert',
        url: '/notifications',
      })

      results.push({ symbol: item.asset_symbol, status: 'notified', reason: evaluation.reason })
    } catch (err) {
      results.push({ symbol: item.asset_symbol, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}

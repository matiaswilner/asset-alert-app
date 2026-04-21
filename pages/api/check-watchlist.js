import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { getPrices } from '../../lib/prices'
import { buildSmartAlertEvalPrompt } from '../../lib/prompts/smartAlert'
import { callHaiku } from '../../lib/ai'
import { logError } from '../../lib/logger'

export const config = {
  maxDuration: 60,
}

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

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
        await logError({
          source: 'check-watchlist.js:callHaiku',
          category: 'external_api',
          message: err.message,
          details: { symbol: item.asset_symbol },
        })
        results.push({ symbol: item.asset_symbol, status: 'error', message: err.message })
        continue
      }

      if (!evaluation.should_notify) {
        results.push({ symbol: item.asset_symbol, status: 'skipped', reason: evaluation.reason })
        continue
      }

      // Fire and forget — disparamos el análisis sin esperar
      const previousPrice = (price.currentPrice / (1 + price.changeDay / 100)).toFixed(2)

      fetch(`${baseUrl}/api/analyze-watchlist-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          symbol: item.asset_symbol,
          assetType: item.asset_type,
          currentPrice: price.currentPrice.toFixed(2),
          previousPrice,
          changeDay: price.changeDay.toFixed(2),
          newsData,
          userId: item.user_id,
        }),
      }).catch(async err => {
        await logError({
          source: 'check-watchlist.js:fireAndForget',
          category: 'internal',
          message: err.message,
          details: { symbol: item.asset_symbol },
        })
      })

      results.push({ symbol: item.asset_symbol, status: 'analysis_dispatched' })
    } catch (err) {
      await logError({
        source: 'check-watchlist.js:processItem',
        category: 'internal',
        message: err.message,
        details: { symbol: item.asset_symbol },
      })
      results.push({ symbol: item.asset_symbol, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}

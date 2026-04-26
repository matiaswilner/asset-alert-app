import { supabaseServer as supabase } from '../../lib/supabaseServer'

async function fetchYahooHistory(symbol, assetType) {
  const yahooSymbol = assetType === 'crypto' ? `${symbol}-USD` : symbol
  const now = Math.floor(Date.now() / 1000)
  const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60)

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${tenYearsAgo}&period2=${now}&interval=1d`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  const data = await response.json()

  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)

  const timestamps = result.timestamp
  const quotes = result.indicators.quote[0]

  return timestamps.map((ts, i) => ({
    asset_symbol: symbol,
    date: new Date(ts * 1000).toISOString().split('T')[0],
    open_price: quotes.open[i] ? parseFloat(quotes.open[i].toFixed(4)) : null,
    high_price: quotes.high[i] ? parseFloat(quotes.high[i].toFixed(4)) : null,
    low_price: quotes.low[i] ? parseFloat(quotes.low[i].toFixed(4)) : null,
    close_price: quotes.close[i] ? parseFloat(quotes.close[i].toFixed(4)) : null,
    volume: quotes.volume[i] || null,
  })).filter(row => row.close_price !== null)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { symbol, assetType } = req.body
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  try {
    const { count } = await supabase
      .from('price_history')
      .select('*', { count: 'exact', head: true })
      .eq('asset_symbol', symbol)

    if (count > 0) {
      return res.status(200).json({ message: `${symbol} already has history`, count })
    }

    const rows = await fetchYahooHistory(symbol, assetType || 'stock')

    const { error } = await supabase
      .from('price_history')
      .upsert(rows, { onConflict: 'asset_symbol,date' })

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ message: `Initialized ${symbol}`, rows: rows.length })
  } catch (err) {
    console.error('init-price-history error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

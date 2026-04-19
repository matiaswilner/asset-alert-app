import { supabaseServer as supabase } from '../../lib/supabaseServer'

async function fetchYesterdayPrice(symbol, assetType) {
  const yahooSymbol = assetType === 'crypto' ? `${symbol}-USD` : symbol
  const now = Math.floor(Date.now() / 1000)
  const threeDaysAgo = now - (3 * 24 * 60 * 60)

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${threeDaysAgo}&period2=${now}&interval=1d`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  const data = await response.json()

  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)

  const timestamps = result.timestamp
  const quotes = result.indicators.quote[0]

  const rows = timestamps.map((ts, i) => ({
    asset_symbol: symbol,
    date: new Date(ts * 1000).toISOString().split('T')[0],
    open_price: quotes.open[i] ? parseFloat(quotes.open[i].toFixed(4)) : null,
    high_price: quotes.high[i] ? parseFloat(quotes.high[i].toFixed(4)) : null,
    low_price: quotes.low[i] ? parseFloat(quotes.low[i].toFixed(4)) : null,
    close_price: quotes.close[i] ? parseFloat(quotes.close[i].toFixed(4)) : null,
    volume: quotes.volume[i] || null,
  })).filter(row => row.close_price !== null)

  return rows
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: symbols, error } = await supabase
    .from('price_history')
    .select('asset_symbol')
    .order('asset_symbol')

  if (error) return res.status(500).json({ error: error.message })

  const uniqueSymbols = [...new Set(symbols.map(s => s.asset_symbol))]

  if (!uniqueSymbols.length) return res.status(200).json({ message: 'No symbols to update' })

  const results = []

  for (const symbol of uniqueSymbols) {
    try {
      const { data: existing } = await supabase
        .from('price_history')
        .select('asset_symbol, asset_type:asset_symbol')
        .eq('asset_symbol', symbol)
        .limit(1)
        .single()

      const rows = await fetchYesterdayPrice(symbol, 'stock')

      const { error: upsertError } = await supabase
        .from('price_history')
        .upsert(rows, { onConflict: 'asset_symbol,date' })

      if (upsertError) throw new Error(upsertError.message)

      results.push({ symbol, status: 'updated', rows: rows.length })
    } catch (err) {
      results.push({ symbol, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}

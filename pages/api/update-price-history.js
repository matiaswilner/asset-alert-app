import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { logError } from '../../lib/logger'

export const config = {
  maxDuration: 60,
}

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

  try {
    // Obtener símbolos únicos desde alertas, watchlist y portfolio
    const [
      { data: alertSymbols },
      { data: watchlistSymbols },
      { data: portfolioSymbols },
    ] = await Promise.all([
      supabase.from('alerts').select('asset_symbol').eq('is_active', true),
      supabase.from('watchlist').select('asset_symbol').eq('is_active', true),
      supabase.from('portfolio_positions').select('asset_symbol'),
    ])

    const allSymbols = [
      ...(alertSymbols || []),
      ...(watchlistSymbols || []),
      ...(portfolioSymbols || []),
    ].map(s => s.asset_symbol)

    const uniqueSymbols = [...new Set(allSymbols)]

    if (!uniqueSymbols.length) {
      return res.status(200).json({ message: 'No symbols to update' })
    }

    // Obtener asset_type para cada símbolo desde asset_directory
    const { data: directoryEntries } = await supabase
      .from('asset_directory')
      .select('asset_symbol, asset_type')
      .in('asset_symbol', uniqueSymbols)

    const assetTypeMap = {}
    for (const entry of directoryEntries || []) {
      assetTypeMap[entry.asset_symbol] = entry.asset_type
    }

    const results = []

    for (const symbol of uniqueSymbols) {
      try {
        const assetType = assetTypeMap[symbol] || 'stock'
        const rows = await fetchYesterdayPrice(symbol, assetType)

        const { error: upsertError } = await supabase
          .from('price_history')
          .upsert(rows, { onConflict: 'asset_symbol,date' })

        if (upsertError) throw new Error(upsertError.message)

        results.push({ symbol, status: 'updated', rows: rows.length })
      } catch (err) {
        await logError({
          source: 'update-price-history.js',
          category: 'external_api',
          message: err.message,
          details: { symbol },
        })
        results.push({ symbol, status: 'error', message: err.message })
      }
    }

    return res.status(200).json({
      message: `Procesados ${uniqueSymbols.length} símbolos`,
      updated: results.filter(r => r.status === 'updated').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    })

  } catch (err) {
    await logError({
      source: 'update-price-history.js:handler',
      category: 'internal',
      message: err.message,
      details: {},
    })
    return res.status(500).json({ error: err.message })
  }
}

import { supabaseServer as supabase } from './supabaseServer'

const API_KEY = process.env.TWELVE_DATA_API_KEY

export async function getPrice(symbol, assetType) {
  const adjustedSymbol = assetType === 'crypto' ? `${symbol}/USD` : symbol

  const response = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${adjustedSymbol}&interval=1day&outputsize=181&apikey=${API_KEY}`
  )

  const data = await response.json()

  if (data.status === 'error') {
    throw new Error(`Price fetch failed for ${symbol}: ${data.message}`)
  }

  const values = data.values
  const currentPrice = parseFloat(values[0].close)
  const yesterdayPrice = parseFloat(values[1].close)
  const weekAgoPrice = parseFloat(values[7].close)

  const getMin = (days) => Math.min(...values.slice(1, days + 1).map(v => parseFloat(v.low)))

  const changeDay = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100
  const changeWeek = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100

  await supabase.from('asset_prices').upsert({
    asset_symbol: symbol,
    asset_type: assetType,
    current_price: currentPrice,
    change_day: changeDay,
    change_week: changeWeek,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'asset_symbol' })

  return {
    symbol,
    currentPrice,
    changeDay,
    changeWeek,
    min14d: getMin(14),
    min30d: getMin(30),
    min60d: getMin(60),
    min90d: getMin(90),
    min180d: getMin(180),
  }
}

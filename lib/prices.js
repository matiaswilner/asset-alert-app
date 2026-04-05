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

  const getMin = (days) => {
    return Math.min(...values.slice(1, days + 1).map(v => parseFloat(v.low)))
  }

  return {
    symbol,
    currentPrice,
    changeDay: ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100,
    changeWeek: ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100,
    min14d: getMin(14),
    min30d: getMin(30),
    min60d: getMin(60),
    min90d: getMin(90),
    min180d: getMin(180),
  }
}

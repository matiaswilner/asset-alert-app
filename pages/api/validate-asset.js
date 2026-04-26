export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { symbol, assetType } = req.body
  if (!symbol || !assetType) return res.status(400).json({ error: 'symbol and assetType required' })

  const yahooSymbol = assetType === 'crypto' ? `${symbol.toUpperCase()}-USD` : symbol.toUpperCase()
  const now = Math.floor(Date.now() / 1000)
  const start = now - (14 * 24 * 60 * 60)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${start}&period2=${now}&interval=1d`

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const data = await response.json()

    const result = data?.chart?.result?.[0]
    if (!result) {
      const yahooError = data?.chart?.error?.description || 'Symbol not found'
      return res.status(404).json({ error: yahooError })
    }

    const meta = result.meta
    const quotes = result.indicators.quote[0]
    const closes = (quotes.close || []).filter(v => v !== null)

    if (closes.length === 0) {
      return res.status(404).json({ error: 'No price data available for this symbol' })
    }

    const currentPrice = closes[closes.length - 1]
    const companyName = meta.longName || meta.shortName || symbol.toUpperCase()
    const currency = meta.currency || 'USD'

    return res.status(200).json({
      symbol: symbol.toUpperCase(),
      assetType,
      name: companyName,
      price: parseFloat(currentPrice.toFixed(2)),
      currency,
      valid: true,
    })
  } catch (err) {
    return res.status(500).json({ error: `Validation failed: ${err.message}` })
  }
}

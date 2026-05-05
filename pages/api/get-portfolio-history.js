import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { isV4Enabled } from '../../lib/config'
import { logError } from '../../lib/logger'

const PERIOD_DAYS = {
  '1M': 30, '3M': 90, '6M': 180, '1A': 365, '2A': 730, '5A': 1825,
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, period = '1A', benchmark = 'SPY' } = req.query

  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!isV4Enabled(userId)) return res.status(403).json({ error: 'Feature not available yet' })

  try {
    const days = PERIOD_DAYS[period] || 365
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    const fromStr = fromDate.toISOString().split('T')[0]

    // 1 — Obtener posiciones actuales con sus pesos
    const { data: positions, error: posError } = await supabase
      .from('portfolio_positions')
      .select('asset_symbol, quantity, market_value, weight_pct')
      .eq('user_id', userId)

    if (posError) throw new Error(posError.message)
    if (!positions || positions.length === 0) {
      return res.status(200).json({ portfolioHistory: [], portfolioValueHistory: [], benchmarkHistory: [], portfolioReturn: 0, benchmarkReturn: 0 })
    }

    const symbols = positions.map(p => p.asset_symbol)
    const totalPositionsValue = positions.reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0)

    // 2 — Obtener price_history para todas las posiciones
    const { data: priceHistory, error: priceError } = await supabase
      .from('price_history')
      .select('asset_symbol, date, close_price')
      .in('asset_symbol', symbols)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .limit(50000)

    if (priceError) throw new Error(priceError.message)

    // 3 — Obtener price_history del benchmark
    const { data: benchmarkPrices, error: benchmarkError } = await supabase
      .from('price_history')
      .select('date, close_price')
      .eq('asset_symbol', benchmark)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .limit(2000)

    if (benchmarkError) throw new Error(benchmarkError.message)

    // 4 — Construir mapa de precios por fecha y símbolo
    const priceMap = {}
    for (const row of priceHistory || []) {
      if (!priceMap[row.date]) priceMap[row.date] = {}
      priceMap[row.date][row.asset_symbol] = parseFloat(row.close_price)
    }

    const allDates = [...new Set(Object.keys(priceMap))].sort()
    if (allDates.length === 0) {
      return res.status(200).json({ portfolioHistory: [], portfolioValueHistory: [], benchmarkHistory: [], portfolioReturn: 0, benchmarkReturn: 0 })
    }

    // 5 — Encontrar precios del primer día disponible para cada símbolo
    const firstPrices = {}
    for (const symbol of symbols) {
      for (const date of allDates) {
        if (priceMap[date]?.[symbol]) {
          firstPrices[symbol] = priceMap[date][symbol]
          break
        }
      }
    }

    // 6 — Calcular retorno del portfolio por día
    // Usamos pesos actuales × retorno de precio de cada activo desde el inicio del período
    const portfolioHistory = []
    const portfolioValueHistory = []

    for (const date of allDates) {
      let weightedReturn = 0
      let totalWeight = 0
      let totalValue = 0

      for (const pos of positions) {
        const symbol = pos.asset_symbol
        const weight = parseFloat(pos.weight_pct) / 100
        const qty = parseFloat(pos.quantity)
        const firstPrice = firstPrices[symbol]
        const currentPrice = priceMap[date]?.[symbol]

        if (!firstPrice || !currentPrice) continue

        const priceReturn = currentPrice / firstPrice
        weightedReturn += weight * priceReturn
        totalWeight += weight
        totalValue += qty * currentPrice
      }

      if (totalWeight === 0) continue

      // Normalizar el retorno ponderado a base 100
      const normalized = parseFloat(((weightedReturn / totalWeight) * 100).toFixed(2))

      portfolioHistory.push({ date, normalized })
      portfolioValueHistory.push({ date, value: parseFloat(totalValue.toFixed(2)) })
    }

    // 7 — Normalizar benchmark a base 100
    const benchmarkHistory = (benchmarkPrices || []).map((r, i, arr) => ({
      date: r.date,
      normalized: parseFloat(((parseFloat(r.close_price) / parseFloat(arr[0].close_price)) * 100).toFixed(2)),
    }))

    // 8 — Retornos totales del período
    const portfolioReturn = portfolioHistory.length > 1
      ? parseFloat((portfolioHistory[portfolioHistory.length - 1].normalized - 100).toFixed(2))
      : 0

    const benchmarkReturn = benchmarkHistory.length > 1
      ? parseFloat((benchmarkHistory[benchmarkHistory.length - 1].normalized - 100).toFixed(2))
      : 0

    return res.status(200).json({
      portfolioHistory,
      portfolioValueHistory,
      benchmarkHistory,
      portfolioReturn,
      benchmarkReturn,
      benchmark,
      period,
    })

  } catch (err) {
    await logError({
      source: 'get-portfolio-history.js:handler',
      category: 'internal',
      message: err.message,
      details: { userId, period, benchmark },
    })
    return res.status(500).json({ error: err.message })
  }
}

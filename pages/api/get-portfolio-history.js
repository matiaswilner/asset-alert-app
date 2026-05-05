import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { isV4Enabled } from '../../lib/config'
import { logError } from '../../lib/logger'

const PERIOD_DAYS = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1A': 365,
  '2A': 730,
  '5A': 1825,
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

    // 1 — Obtener todos los trades del usuario
    const { data: trades, error: tradesError } = await supabase
      .from('portfolio_trades')
      .select('asset_symbol, trade_date, buy_sell, quantity')
      .eq('user_id', userId)
      .eq('buy_sell', 'BUY')
      .order('trade_date', { ascending: true })

    if (tradesError) throw new Error(tradesError.message)
    if (!trades || trades.length === 0) {
      return res.status(200).json({ portfolioHistory: [], benchmarkHistory: [] })
    }

    // 2 — Obtener símbolos únicos del portfolio
    const symbols = [...new Set(trades.map(t => t.asset_symbol))]

    // 3 — Obtener price_history para todos los símbolos del período
    const { data: priceHistory, error: priceError } = await supabase
      .from('price_history')
      .select('asset_symbol, date, close_price')
      .in('asset_symbol', symbols)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .limit(50000)

    if (priceError) throw new Error(priceError.message)

    // 4 — Obtener price_history del benchmark
    const { data: benchmarkHistory, error: benchmarkError } = await supabase
      .from('price_history')
      .select('date, close_price')
      .eq('asset_symbol', benchmark)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .limit(2000)

    if (benchmarkError) throw new Error(benchmarkError.message)

    // 5 — Construir mapa de precios por símbolo y fecha
    const priceMap = {}
    for (const row of priceHistory || []) {
      if (!priceMap[row.date]) priceMap[row.date] = {}
      priceMap[row.date][row.asset_symbol] = parseFloat(row.close_price)
    }

    // 6 — Calcular posiciones acumuladas por día
    // Para cada día del período, calculamos cuántas acciones teníamos
    const allDates = [...new Set(Object.keys(priceMap))].sort()

    const portfolioHistory = []

    for (const date of allDates) {
      // Calcular posiciones acumuladas hasta este día
      const positions = {}
      for (const trade of trades) {
        if (trade.trade_date <= date) {
          if (!positions[trade.asset_symbol]) positions[trade.asset_symbol] = 0
          positions[trade.asset_symbol] += parseFloat(trade.quantity)
        }
      }

      // Calcular valor del portfolio ese día
      let totalValue = 0
      let hasAllPrices = false

      for (const [symbol, qty] of Object.entries(positions)) {
        if (qty <= 0) continue
        const price = priceMap[date]?.[symbol]
        if (price) {
          totalValue += qty * price
          hasAllPrices = true
        }
      }

      if (hasAllPrices && totalValue > 0) {
        portfolioHistory.push({ date, value: parseFloat(totalValue.toFixed(2)) })
      }
    }

    // 7 — Normalizar ambas líneas a base 100
    const normalizeHistory = (history, valueKey = 'value') => {
      if (!history || history.length === 0) return []
      const firstValue = history[0][valueKey]
      if (!firstValue || firstValue === 0) return history
      return history.map(row => ({
        ...row,
        normalized: parseFloat(((row[valueKey] / firstValue) * 100).toFixed(2)),
      }))
    }

    const normalizedPortfolio = normalizeHistory(portfolioHistory)
    const normalizedBenchmark = normalizeHistory(
      (benchmarkHistory || []).map(r => ({ date: r.date, value: parseFloat(r.close_price) }))
    )

    // 8 — Calcular rendimiento total del período
    const portfolioReturn = portfolioHistory.length > 1
      ? (((portfolioHistory[portfolioHistory.length - 1].value - portfolioHistory[0].value) / portfolioHistory[0].value) * 100).toFixed(2)
      : 0

    const benchmarkReturn = benchmarkHistory?.length > 1
      ? (((parseFloat(benchmarkHistory[benchmarkHistory.length - 1].close_price) - parseFloat(benchmarkHistory[0].close_price)) / parseFloat(benchmarkHistory[0].close_price)) * 100).toFixed(2)
      : 0

    return res.status(200).json({
      portfolioHistory: normalizedPortfolio,
      benchmarkHistory: normalizedBenchmark,
      portfolioReturn: parseFloat(portfolioReturn),
      benchmarkReturn: parseFloat(benchmarkReturn),
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

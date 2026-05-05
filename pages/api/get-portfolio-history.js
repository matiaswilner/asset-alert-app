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

    // 1 — Obtener todos los trades ordenados por fecha
    const { data: trades, error: tradesError } = await supabase
      .from('portfolio_trades')
      .select('asset_symbol, trade_date, buy_sell, quantity, price')
      .eq('user_id', userId)
      .order('trade_date', { ascending: true })

    if (tradesError) throw new Error(tradesError.message)
    if (!trades || trades.length === 0) {
      return res.status(200).json({ portfolioHistory: [], benchmarkHistory: [], portfolioReturn: 0, benchmarkReturn: 0 })
    }

    // 2 — Obtener cash y posiciones actuales
    const { data: positions } = await supabase
      .from('portfolio_positions')
      .select('asset_symbol, market_value, quantity')
      .eq('user_id', userId)

    const { data: snapshots } = await supabase
      .from('portfolio_snapshots')
      .select('cash_balance')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)

    const currentCash = parseFloat(snapshots?.[0]?.cash_balance || 0)

    // 3 — Reconstruir cash histórico
    // El cash actual = cash inicial + depósitos - compras
    // Aproximamos restando las compras al cash actual en orden inverso
    const buyTrades = trades.filter(t => t.buy_sell === 'BUY').sort((a, b) => b.trade_date.localeCompare(a.trade_date))
    const cashByDate = {}
    let rollingCash = currentCash
    const allTradeDates = [...new Set(buyTrades.map(t => t.trade_date))].sort((a, b) => b.localeCompare(a))

    for (const date of allTradeDates) {
      const tradesOnDate = buyTrades.filter(t => t.trade_date === date)
      const spent = tradesOnDate.reduce((sum, t) => sum + parseFloat(t.quantity) * parseFloat(t.price), 0)
      cashByDate[date] = rollingCash
      rollingCash += spent // antes de esa compra tenías más cash
    }

    // 4 — Obtener símbolos únicos
    const symbols = [...new Set(trades.map(t => t.asset_symbol))]

    // 5 — Obtener price_history para todos los símbolos
    const { data: priceHistory, error: priceError } = await supabase
      .from('price_history')
      .select('asset_symbol, date, close_price')
      .in('asset_symbol', symbols)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .limit(50000)

    if (priceError) throw new Error(priceError.message)

    // 6 — Obtener price_history del benchmark
    const { data: benchmarkHistory, error: benchmarkError } = await supabase
      .from('price_history')
      .select('date, close_price')
      .eq('asset_symbol', benchmark)
      .gte('date', fromStr)
      .order('date', { ascending: true })
      .limit(2000)

    if (benchmarkError) throw new Error(benchmarkError.message)

    // 7 — Construir mapa de precios por fecha y símbolo
    const priceMap = {}
    for (const row of priceHistory || []) {
      if (!priceMap[row.date]) priceMap[row.date] = {}
      priceMap[row.date][row.asset_symbol] = parseFloat(row.close_price)
    }

    const allDates = [...new Set(Object.keys(priceMap))].sort()

    // 8 — Calcular valor de posiciones por día (sin cash)
    const positionValueByDate = []
    for (const date of allDates) {
      const positions = {}
      for (const trade of trades) {
        if (trade.trade_date > date) continue
        if (!positions[trade.asset_symbol]) positions[trade.asset_symbol] = 0
        const qty = parseFloat(trade.quantity)
        positions[trade.asset_symbol] += trade.buy_sell === 'BUY' ? qty : -qty
      }

      let posValue = 0
      let hasData = false
      for (const [symbol, qty] of Object.entries(positions)) {
        if (qty <= 0) continue
        const price = priceMap[date]?.[symbol]
        if (price) { posValue += qty * price; hasData = true }
      }

      if (hasData) positionValueByDate.push({ date, posValue })
    }

    // 9 — Calcular valor total (posiciones + cash aproximado)
    const totalValueHistory = positionValueByDate.map(row => {
      // Encontrar el cash más cercano a esa fecha
      let cashForDate = currentCash
      const tradeDatesBeforeOrOn = Object.keys(cashByDate).filter(d => d <= row.date).sort()
      if (tradeDatesBeforeOrOn.length > 0) {
        cashForDate = cashByDate[tradeDatesBeforeOrOn[tradeDatesBeforeOrOn.length - 1]]
      }
      return {
        date: row.date,
        value: parseFloat((row.posValue + cashForDate).toFixed(2)),
      }
    })

    // 10 — TWR (Time-Weighted Return) para retorno vs benchmark
    // Dividimos en sub-períodos por cada fecha de compra
    const buyDates = [...new Set(trades.filter(t => t.buy_sell === 'BUY').map(t => t.trade_date))].sort()

    // Sub-períodos: [fromStr, buyDate1], [buyDate1, buyDate2], ..., [lastBuyDate, today]
    const subPeriodBoundaries = [fromStr, ...buyDates.filter(d => d >= fromStr), allDates[allDates.length - 1]].filter((d, i, arr) => arr.indexOf(d) === i).sort()

    let cumulativeTWR = 1

    const twrByDate = {}
    let prevSubPeriodReturn = 1

    for (let i = 0; i < subPeriodBoundaries.length - 1; i++) {
      const subStart = subPeriodBoundaries[i]
      const subEnd = subPeriodBoundaries[i + 1]

      const startRow = positionValueByDate.find(r => r.date >= subStart)
      const endRow = [...positionValueByDate].reverse().find(r => r.date <= subEnd)

      if (!startRow || !endRow || startRow.posValue === 0) continue

      const subReturn = endRow.posValue / startRow.posValue

      // Guardar TWR acumulado para cada fecha del sub-período
      const datesInSubPeriod = positionValueByDate.filter(r => r.date >= subStart && r.date <= subEnd)
      for (const row of datesInSubPeriod) {
        const dayReturn = row.posValue / startRow.posValue
        twrByDate[row.date] = prevSubPeriodReturn * dayReturn
      }

      prevSubPeriodReturn *= subReturn
    }

    // 11 — Construir portfolio history normalizado con TWR
    const portfolioHistory = positionValueByDate
      .filter(row => twrByDate[row.date])
      .map(row => ({
        date: row.date,
        value: row.posValue,
        normalized: parseFloat((twrByDate[row.date] * 100).toFixed(2)),
      }))

    // 12 — Normalizar benchmark
    const normalizedBenchmark = (benchmarkHistory || []).map((r, i, arr) => ({
      date: r.date,
      value: parseFloat(r.close_price),
      normalized: parseFloat(((parseFloat(r.close_price) / parseFloat(arr[0].close_price)) * 100).toFixed(2)),
    }))

    // 13 — Retornos totales del período
    const portfolioReturn = portfolioHistory.length > 1
      ? parseFloat((portfolioHistory[portfolioHistory.length - 1].normalized - 100).toFixed(2))
      : 0

    const benchmarkReturn = normalizedBenchmark.length > 1
      ? parseFloat((normalizedBenchmark[normalizedBenchmark.length - 1].normalized - 100).toFixed(2))
      : 0

    return res.status(200).json({
      portfolioHistory,
      portfolioValueHistory: totalValueHistory,
      benchmarkHistory: normalizedBenchmark,
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

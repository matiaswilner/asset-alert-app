import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { sendPushNotification } from '../../lib/ai'
import { logError } from '../../lib/logger'

async function triggerAnalysis(symbol, assetType, priceChange, timeframe, alertId, currentPrice, previousPrice, userId) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, assetType, priceChange, timeframe, currentPrice, previousPrice, alertId, triggeredBy: 'automatic', userId }),
    })
  } catch (err) {
    await logError({ source: 'check-alerts.js:triggerAnalysis', category: 'internal', message: err.message, details: { symbol, alertId } })
  }
}

const MIN_PERIOD_MAP = {
  min_14d:  { days: 14,  label: '14 días' },
  min_30d:  { days: 30,  label: '30 días' },
  min_60d:  { days: 60,  label: '60 días' },
  min_90d:  { days: 90,  label: '90 días' },
  min_180d: { days: 180, label: '180 días' },
}

const MIN_PRICE_MAP = {
  min_14d:  (price) => price.min14d,
  min_30d:  (price) => price.min30d,
  min_60d:  (price) => price.min60d,
  min_90d:  (price) => price.min90d,
  min_180d: (price) => price.min180d,
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_active', true)

  if (error) {
    await logError({ source: 'check-alerts.js:fetchAlerts', category: 'database', message: error.message })
    return res.status(500).json({ error: error.message })
  }

  if (!alerts.length) return res.status(200).json({ message: 'No active alerts' })

  // Filtrar alertas que ya se dispararon hoy
  const today = new Date()
  const pendingAlerts = alerts.filter(alert => {
    if (!alert.last_triggered_at) return true
    const lastTriggered = new Date(alert.last_triggered_at)
    return !(
      lastTriggered.getDate() === today.getDate() &&
      lastTriggered.getMonth() === today.getMonth() &&
      lastTriggered.getFullYear() === today.getFullYear()
    )
  })

  if (!pendingAlerts.length) return res.status(200).json({ message: 'All alerts already triggered today' })

  // Leer precios desde asset_prices (ya fetcheados por fetch-all-prices)
  const symbols = [...new Set(pendingAlerts.map(a => a.asset_symbol))]
  const { data: priceRows, error: pricesError } = await supabase
    .from('asset_prices')
    .select('*')
    .in('asset_symbol', symbols)

  if (pricesError) {
    await logError({ source: 'check-alerts.js:fetchPrices', category: 'database', message: pricesError.message })
    return res.status(500).json({ error: pricesError.message })
  }

  const prices = {}
  for (const row of priceRows || []) {
    prices[row.asset_symbol] = row
  }

  // Para alertas de mínimos históricos necesitamos los datos completos de price_history
  const minAlerts = pendingAlerts.filter(a => Object.keys(MIN_PERIOD_MAP).includes(a.condition))
  const minPrices = {}

  if (minAlerts.length > 0) {
    const minSymbols = [...new Set(minAlerts.map(a => a.asset_symbol))]
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 181)

    for (const symbol of minSymbols) {
      const { data: history } = await supabase
        .from('price_history')
        .select('date, low_price')
        .eq('asset_symbol', symbol)
        .gte('date', fromDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (history && history.length > 0) {
        const getMin = (days) => Math.min(...history.slice(0, days).map(r => parseFloat(r.low_price)).filter(v => !isNaN(v)))
        minPrices[symbol] = {
          min14d: getMin(14),
          min30d: getMin(30),
          min60d: getMin(60),
          min90d: getMin(90),
          min180d: getMin(180),
        }
      }
    }
  }

  const results = []

  for (const alert of pendingAlerts) {
    const priceRow = prices[alert.asset_symbol]

    if (!priceRow) {
      results.push({ symbol: alert.asset_symbol, status: 'error', message: 'No price data available — run fetch-all-prices first' })
      continue
    }

    try {
      const currentPrice = parseFloat(priceRow.current_price)
      const changeDay = parseFloat(priceRow.change_day)
      const changeWeek = parseFloat(priceRow.change_week)
      const previousPrice = (currentPrice / (1 + changeDay / 100)).toFixed(2)

      let triggered = false
      let actualChange = 0
      let notifBody = ''
      let timeframe = ''

      if (alert.condition === 'drop_day') {
        actualChange = changeDay
        triggered = changeDay <= -alert.threshold_percent
        notifBody = `${alert.asset_symbol} cayó ${Math.abs(actualChange).toFixed(2)}% hoy — hay un análisis disponible`
        timeframe = '1 day'
      } else if (alert.condition === 'drop_week') {
        actualChange = changeWeek
        triggered = changeWeek <= -alert.threshold_percent
        notifBody = `${alert.asset_symbol} cayó ${Math.abs(actualChange).toFixed(2)}% esta semana — hay un análisis disponible`
        timeframe = '1 week'
      } else if (alert.condition === 'rise_day') {
        actualChange = changeDay
        triggered = changeDay >= alert.threshold_percent
        notifBody = `${alert.asset_symbol} subió ${actualChange.toFixed(2)}% hoy — hay un análisis disponible`
        timeframe = '1 day'
      } else if (alert.condition === 'rise_week') {
        actualChange = changeWeek
        triggered = changeWeek >= alert.threshold_percent
        notifBody = `${alert.asset_symbol} subió ${actualChange.toFixed(2)}% esta semana — hay un análisis disponible`
        timeframe = '1 week'
      } else if (MIN_PERIOD_MAP[alert.condition]) {
        const period = MIN_PERIOD_MAP[alert.condition]
        const minData = minPrices[alert.asset_symbol]
        if (!minData) {
          results.push({ symbol: alert.asset_symbol, status: 'error', message: 'No price history data for min calculation' })
          continue
        }
        const minPrice = MIN_PRICE_MAP[alert.condition](minData)
        triggered = currentPrice <= minPrice
        notifBody = `${alert.asset_symbol} tocó su mínimo de los últimos ${period.label} — hay un análisis disponible`
        timeframe = `${period.days} days`
        actualChange = changeDay
      }

      if (triggered) {
        await triggerAnalysis(alert.asset_symbol, alert.asset_type, `${actualChange.toFixed(2)}%`, timeframe, alert.id, currentPrice, previousPrice, alert.user_id)
        await sendPushNotification({
          title: '⚠️ Alerta de precio',
          body: notifBody,
          assetSymbol: alert.asset_symbol,
          triggeredBy: 'automatic',
          userId: alert.user_id,
        })
        await supabase.from('alerts').update({ last_triggered_at: new Date().toISOString() }).eq('id', alert.id)
        results.push({ symbol: alert.asset_symbol, status: 'triggered', change: actualChange.toFixed(2) + '%' })
      } else {
        results.push({ symbol: alert.asset_symbol, status: 'ok', change: actualChange ? actualChange.toFixed(2) + '%' : 'above min' })
      }
    } catch (err) {
      await logError({ source: 'check-alerts.js:processAlert', category: 'internal', message: err.message, details: { symbol: alert.asset_symbol, alertId: alert.id } })
      results.push({ symbol: alert.asset_symbol, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}

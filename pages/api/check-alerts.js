import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { getPrice } from '../../lib/prices'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

async function sendNotification(title, body) {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')

  for (const sub of subscriptions || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body })
      )
    } catch (err) {
      console.error('Push failed:', err.message)
    }
  }
}

async function triggerAnalysis(symbol, assetType, priceChange, timeframe, alertId, currentPrice, previousPrice) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asset-alert-app-red.vercel.app'
    await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        assetType,
        priceChange,
        timeframe,
        currentPrice,
        previousPrice,
        alertId,
        triggeredBy: 'automatic',
      }),
    })
  } catch (err) {
    console.error('Analysis failed:', err.message)
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

  if (error) return res.status(500).json({ error: error.message })
  if (!alerts.length) return res.status(200).json({ message: 'No active alerts' })

  const results = []

  for (const alert of alerts) {
    try {
      if (alert.last_triggered_at) {
        const lastTriggered = new Date(alert.last_triggered_at)
        const today = new Date()
        const isSameDay =
          lastTriggered.getDate() === today.getDate() &&
          lastTriggered.getMonth() === today.getMonth() &&
          lastTriggered.getFullYear() === today.getFullYear()
        if (isSameDay) {
          results.push({ symbol: alert.asset_symbol, status: 'skipped - already triggered today' })
          continue
        }
      }

      const price = await getPrice(alert.asset_symbol, alert.asset_type)

      let triggered = false
      let actualChange = 0
      let notifBody = ''
      let timeframe = ''

      if (alert.condition === 'drop_day') {
        actualChange = price.changeDay
        triggered = price.changeDay <= -alert.threshold_percent
        notifBody = `${alert.asset_symbol} cayó ${Math.abs(actualChange).toFixed(2)}% hoy — hay un análisis disponible`
        timeframe = '1 day'
      } else if (alert.condition === 'drop_week') {
        actualChange = price.changeWeek
        triggered = price.changeWeek <= -alert.threshold_percent
        notifBody = `${alert.asset_symbol} cayó ${Math.abs(actualChange).toFixed(2)}% esta semana — hay un análisis disponible`
        timeframe = '1 week'
      } else if (alert.condition === 'rise_day') {
        actualChange = price.changeDay
        triggered = price.changeDay >= alert.threshold_percent
        notifBody = `${alert.asset_symbol} subió ${actualChange.toFixed(2)}% hoy — hay un análisis disponible`
        timeframe = '1 day'
      } else if (alert.condition === 'rise_week') {
        actualChange = price.changeWeek
        triggered = price.changeWeek >= alert.threshold_percent
        notifBody = `${alert.asset_symbol} subió ${actualChange.toFixed(2)}% esta semana — hay un análisis disponible`
        timeframe = '1 week'
      } else if (MIN_PERIOD_MAP[alert.condition]) {
        const period = MIN_PERIOD_MAP[alert.condition]
        const minPrice = MIN_PRICE_MAP[alert.condition](price)
        triggered = price.currentPrice <= minPrice
        notifBody = `${alert.asset_symbol} tocó su mínimo de los últimos ${period.label} — hay un análisis disponible`
        timeframe = `${period.days} days`
        actualChange = price.changeDay
      }

      if (triggered) {
        const yesterdayPrice = (price.currentPrice / (1 + actualChange / 100)).toFixed(2)
        await triggerAnalysis(alert.asset_symbol, alert.asset_type, `${actualChange.toFixed(2)}%`, timeframe, alert.id, price.currentPrice, yesterdayPrice)
        await sendNotification('⚠️ Alerta de precio', notifBody)
        await supabase
          .from('alerts')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', alert.id)

        results.push({ symbol: alert.asset_symbol, status: 'triggered', change: actualChange.toFixed(2) + '%' })
      } else {
        results.push({ symbol: alert.asset_symbol, status: 'ok', change: actualChange ? actualChange.toFixed(2) + '%' : 'above min' })
      }
    } catch (err) {
      results.push({ symbol: alert.asset_symbol, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}

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
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title, body })
      )
    } catch (err) {
      console.error('Push failed:', err.message)
    }
  }
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

      if (alert.condition === 'drop_day') {
        actualChange = price.changeDay
        triggered = price.changeDay <= -alert.threshold_percent
        notifBody = `${alert.asset_symbol} cayó ${Math.abs(actualChange).toFixed(2)}% hoy`
      } else if (alert.condition === 'drop_week') {
        actualChange = price.changeWeek
        triggered = price.changeWeek <= -alert.threshold_percent
        notifBody = `${alert.asset_symbol} cayó ${Math.abs(actualChange).toFixed(2)}% esta semana`
      } else if (alert.condition === 'rise_day') {
        actualChange = price.changeDay
        triggered = price.changeDay >= alert.threshold_percent
        notifBody = `${alert.asset_symbol} subió ${actualChange.toFixed(2)}% hoy`
      } else if (alert.condition === 'rise_week') {
        actualChange = price.changeWeek
        triggered = price.changeWeek >= alert.threshold_percent
        notifBody = `${alert.asset_symbol} subió ${actualChange.toFixed(2)}% esta semana`
      }

      if (triggered) {
        await sendNotification('⚠️ Alerta de precio', notifBody)
        await supabase
          .from('alerts')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', alert.id)

        results.push({
          symbol: alert.asset_symbol,
          status: 'triggered',
          change: actualChange.toFixed(2) + '%',
        })
      } else {
        results.push({
          symbol: alert.asset_symbol,
          status: 'ok',
          change: actualChange.toFixed(2) + '%',
        })
      }
    } catch (err) {
      results.push({ symbol: alert.asset_symbol, status: 'error', message: err.message })
    }
  }

  return res.status(200).json({ results })
}

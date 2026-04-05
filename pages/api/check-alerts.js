import { supabase } from '../../lib/supabaseClient'
import { getPrice } from '../../lib/prices'

export default async function handler(req, res) {
  // Verificar que la llamada viene autorizada
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Traer todas las alertas activas
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_active', true)

  if (error) return res.status(500).json({ error: error.message })
  if (!alerts.length) return res.status(200).json({ message: 'No active alerts' })

  const results = []

  for (const alert of alerts) {
    try {
      // Verificar que no se disparó hoy
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

      // Obtener precio actual
      const price = await getPrice(alert.asset_symbol, alert.asset_type)

      // Evaluar condición
      let triggered = false
      let actualChange = 0

      if (alert.condition === 'drop_day') {
        actualChange = price.changeDay
        triggered = price.changeDay <= -alert.threshold_percent
      } else if (alert.condition === 'drop_week') {
        actualChange = price.changeWeek
        triggered = price.changeWeek <= -alert.threshold_percent
      } else if (alert.condition === 'rise_day') {
        actualChange = price.changeDay
        triggered = price.changeDay >= alert.threshold_percent
      } else if (alert.condition === 'rise_week') {
        actualChange = price.changeWeek
        triggered = price.changeWeek >= alert.threshold_percent
      }

      if (triggered) {
        // Actualizar last_triggered_at
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

import { sendPushNotification } from '../../lib/ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, title, body } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  await sendPushNotification({
    title: title || '🔔 Notificación de prueba',
    body: body || 'Las notificaciones de Assetic están funcionando correctamente.',
    assetSymbol: null,
    triggeredBy: 'manual',
    userId,
  })

  return res.status(200).json({ success: true })
}

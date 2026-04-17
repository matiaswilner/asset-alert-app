import { supabaseServer } from '../../lib/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { endpoint, keys, userId } = req.body

  const { error } = await supabaseServer
    .from('push_subscriptions')
    .insert([{
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_id: userId || null,
    }])

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ message: 'Subscription saved' })
}

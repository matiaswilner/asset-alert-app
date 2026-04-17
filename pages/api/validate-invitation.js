import { supabaseServer } from '../../lib/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token required' })

  const { data, error } = await supabaseServer
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single()

  if (error || !data) return res.status(400).json({ valid: false })

  return res.status(200).json({ valid: true })
}

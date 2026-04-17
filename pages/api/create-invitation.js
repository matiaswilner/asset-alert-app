import { supabaseServer } from '../../lib/supabaseServer'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { adminSecret } = req.body
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = crypto.randomBytes(32).toString('hex')

  const { data, error } = await supabaseServer
    .from('invitations')
    .insert([{ token }])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/register?token=${token}`
  return res.status(200).json({ token, inviteUrl })
}

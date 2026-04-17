import { supabaseServer } from '../../lib/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password, token } = req.body

  if (!email || !password || !token) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data: invitation, error: invError } = await supabaseServer
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single()

  if (invError || !invitation) {
    return res.status(400).json({ error: 'Invalid or used invitation token' })
  }

  const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return res.status(400).json({ error: authError.message })

  await supabaseServer.from('user_profiles').insert([{
    id: authData.user.id,
    email,
    onboarding_completed: false,
  }])

  await supabaseServer
    .from('invitations')
    .update({ used: true })
    .eq('token', token)

  return res.status(200).json({ success: true })
}

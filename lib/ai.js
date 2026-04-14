import { supabaseServer as supabase } from './supabaseServer'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

async function callClaude(model, maxTokens, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

  if (!data.content || !data.content[0]) {
    throw new Error('Claude API error: ' + JSON.stringify(data))
  }

  const text = data.content[0].text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Failed to parse Claude response: ' + text)
  }
}

export function callHaiku(prompt) {
  return callClaude('claude-haiku-4-5-20251001', 200, prompt)
}

export function callSonnet(prompt) {
  return callClaude('claude-sonnet-4-20250514', 1000, prompt)
}

export async function sendPushNotification({ title, body, assetSymbol, triggeredBy = 'automatic' }) {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')

  const { data: notif } = await supabase.from('notifications').insert([{
    asset_symbol: assetSymbol || null,
    title,
    body,
    triggered_by: triggeredBy,
    url: '/notifications',
  }]).select().single()

  const notifUrl = notif ? `/notifications?notifId=${notif.id}` : '/notifications'

  for (const sub of subscriptions || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: notifUrl })
      )
    } catch (err) {
      console.error('Push failed:', err.message)
    }
  }
}

import { supabaseServer as supabase } from '../../lib/supabaseServer'

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const since = new Date()
  since.setHours(since.getHours() - 24)

  const { data: errors } = await supabase
    .from('error_logs')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (!errors || errors.length === 0) {
    return res.status(200).json({ message: 'No errors in last 24 hours' })
  }

  const grouped = errors.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = []
    acc[e.category].push(e)
    return acc
  }, {})

  const categoryLabels = {
    external_api: '🔴 APIs Externas',
    database: '🟠 Base de datos',
    internal: '🟡 Errores internos',
  }

  const htmlSections = Object.entries(grouped).map(([cat, items]) => `
    <h3 style="color: #333; margin-top: 24px;">${categoryLabels[cat] || cat} (${items.length})</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Hora</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Origen</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Error</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(e => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(e.created_at).toLocaleTimeString('es-AR')}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${e.source}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${e.message}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">⚠️ Reporte de errores — Assetic</h2>
      <p style="color: #666;">Se detectaron <strong>${errors.length} errores</strong> en las últimas 24 horas.</p>
      ${htmlSections}
      <p style="color: #999; font-size: 12px; margin-top: 32px;">Este reporte se genera automáticamente cada día.</p>
    </div>
  `

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Assetic <onboarding@resend.dev>',
      to: [process.env.ERROR_REPORT_EMAIL],
      subject: `⚠️ Assetic: ${errors.length} errores en las últimas 24hs`,
      html,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.json()
    return res.status(500).json({ error: err })
  }

  return res.status(200).json({ message: `Report sent with ${errors.length} errors` })
}

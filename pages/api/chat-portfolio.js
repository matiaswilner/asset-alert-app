import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { isV4Enabled } from '../../lib/config'
import { logError } from '../../lib/logger'

export const config = {
  maxDuration: 60,
}

function buildSystemPrompt({ positions, totalValue, cashBalance, cashPct }) {
  const positionsList = positions
    .map(p => {
      const pnlPct = parseFloat(p.avg_cost) > 0
        ? ((parseFloat(p.current_price) - parseFloat(p.avg_cost)) / parseFloat(p.avg_cost) * 100).toFixed(2)
        : '0'
      const isUnderwater = parseFloat(p.current_price) < parseFloat(p.avg_cost)
      return `- ${p.asset_symbol}: ${parseFloat(p.weight_pct).toFixed(1)}% | avg $${parseFloat(p.avg_cost).toFixed(2)} | actual $${parseFloat(p.current_price).toFixed(2)} | P&L ${isUnderwater ? '' : '+'}${pnlPct}% | valor $${parseFloat(p.market_value).toFixed(2)}`
    })
    .join('\n')

  return `Eres un asesor financiero personal especializado en inversiones de largo plazo. Estás ayudando a un inversor específico con su portfolio real.

PERFIL DEL INVERSOR:
- Estrategia: acumulación gradual en caídas, largo plazo
- Nunca hace trading de corto plazo
- Evita comprar después de subidas fuertes
- Prefiere ETFs y algo de exposición crypto

PORTFOLIO ACTUAL:
- Valor total: $${parseFloat(totalValue).toFixed(2)}
- Cash disponible: $${parseFloat(cashBalance).toFixed(2)} (${parseFloat(cashPct).toFixed(1)}%)
- Posiciones:
${positionsList}

INSTRUCCIONES:
- Respondé siempre en español
- Sé directo y específico — nunca digas "depende" sin dar una respuesta concreta después
- Cada respuesta debe considerar el portfolio real del usuario
- Podés responder cualquier pregunta sobre inversiones, pero siempre con el contexto de este portfolio en mente
- Nunca des consejos genéricos — si hablás de diversificación, mencioná qué activo específico le falta a este usuario
- Cuando recomiendes comprar algo, especificá un monto o porcentaje del portfolio
- Sé conciso — máximo 3-4 párrafos por respuesta salvo que el usuario pida más detalle`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, messages } = req.body

  if (!userId || !messages) return res.status(400).json({ error: 'userId and messages required' })
  if (!isV4Enabled(userId)) return res.status(403).json({ error: 'Feature not available yet' })

  try {
    // Obtener posiciones actualizadas
    const { data: positions } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)
      .order('weight_pct', { ascending: false })

    const { data: snapshot } = await supabase
      .from('portfolio_snapshots')
      .select('cash_balance')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const cashBalance = parseFloat(snapshot?.cash_balance || 0)
    const positionsValue = (positions || []).reduce((sum, p) => sum + parseFloat(p.market_value), 0)
    const totalValue = positionsValue + cashBalance
    const cashPct = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0

    const systemPrompt = buildSystemPrompt({
      positions: positions || [],
      totalValue,
      cashBalance,
      cashPct,
    })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()

    if (!data.content?.[0]?.text) {
      throw new Error('Claude API error: ' + JSON.stringify(data))
    }

    return res.status(200).json({ reply: data.content[0].text })

  } catch (err) {
    await logError({
      source: 'chat-portfolio.js:handler',
      category: 'internal',
      message: err.message,
      details: { userId },
    })
    return res.status(500).json({ error: err.message })
  }
}

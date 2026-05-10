import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { callSonnet } from '../../lib/ai'
import { buildPortfolioAnalysisPrompt } from '../../lib/prompts/portfolio'
import { isV4Enabled } from '../../lib/config'
import { logError } from '../../lib/logger'

export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body

  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!isV4Enabled(userId)) return res.status(403).json({ error: 'Feature not available yet' })

  try {
    const { data: positions, error: posError } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)
      .order('weight_pct', { ascending: false })

    if (posError) throw new Error(posError.message)
    if (!positions || positions.length === 0) {
      return res.status(400).json({ error: 'No hay posiciones en el portfolio' })
    }

    const { data: snapshot } = await supabase
      .from('portfolio_snapshots')
      .select('cash_balance')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const cashBalance = parseFloat(snapshot?.cash_balance || 0)
    const positionsValue = positions.reduce((sum, p) => sum + parseFloat(p.market_value), 0)
    const totalValue = positionsValue + cashBalance
    const cashPct = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0

    const prompt = buildPortfolioAnalysisPrompt({
      positions,
      totalValue,
      cashBalance,
      cashPct,
    })

    let analysis
    try {
      analysis = await callSonnet(prompt)
    } catch (err) {
      await logError({
        source: 'analyze-portfolio.js:callSonnet',
        category: 'external_api',
        message: err.message,
        details: { userId },
      })
      return res.status(500).json({ error: err.message })
    }

    return res.status(200).json({ analysis })

  } catch (err) {
    await logError({
      source: 'analyze-portfolio.js:handler',
      category: 'internal',
      message: err.message,
      details: { userId },
    })
    return res.status(500).json({ error: err.message })
  }
}

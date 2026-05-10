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
    // 1 — Obtener posiciones actuales
    const { data: positions, error: posError } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)
      .order('weight_pct', { ascending: false })

    if (posError) throw new Error(posError.message)
    if (!positions || positions.length === 0) {
      return res.status(400).json({ error: 'No hay posiciones en el portfolio' })
    }

    // 2 — Obtener precios actualizados desde price_history
    const symbols = positions.map(p => p.asset_symbol)
    const { data: latestPrices } = await supabase
      .from('price_history')
      .select('asset_symbol, close_price, date')
      .in('asset_symbol', symbols)
      .order('date', { ascending: false })
      .limit(symbols.length * 5)

    const priceMap = {}
    for (const row of latestPrices || []) {
      if (!priceMap[row.asset_symbol]) {
        priceMap[row.asset_symbol] = parseFloat(row.close_price)
      }
    }

    // 3 — Enriquecer posiciones con precios actuales
    const enrichedPositions = positions.map(p => ({
      ...p,
      current_price: priceMap[p.asset_symbol] || parseFloat(p.current_price),
      market_value: (priceMap[p.asset_symbol] || parseFloat(p.current_price)) * parseFloat(p.quantity),
    }))

    const totalPositionsValue = enrichedPositions.reduce((sum, p) => sum + p.market_value, 0)
    const finalPositions = enrichedPositions.map(p => ({
      ...p,
      weight_pct: (p.market_value / totalPositionsValue) * 100,
    }))

    // 4 — Obtener cash
    const { data: snapshot } = await supabase
      .from('portfolio_snapshots')
      .select('cash_balance')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const cashBalance = parseFloat(snapshot?.cash_balance || 0)
    const totalValue = totalPositionsValue + cashBalance
    const cashPct = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0

    // 5 — Llamar a Claude
    const prompt = buildPortfolioAnalysisPrompt({
      positions: finalPositions,
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

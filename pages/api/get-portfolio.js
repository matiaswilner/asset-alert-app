import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { isV4Enabled } from '../../lib/config'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.query

  if (!userId) return res.status(400).json({ error: 'userId required' })

  if (!isV4Enabled(userId)) {
    return res.status(403).json({ error: 'Feature not available yet' })
  }

  const [
    { data: positions },
    { data: snapshots },
    { data: syncLog },
  ] = await Promise.all([
    supabase
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)
      .order('weight_pct', { ascending: false }),
    supabase
      .from('portfolio_snapshots')
      .select('total_value, cash_balance, snapshot_date')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(365),
    supabase
      .from('portfolio_sync_log')
      .select('created_at, status, positions_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  // Obtener el último precio de cierre de price_history para cada activo
  const symbols = (positions || []).map(p => p.asset_symbol)

  const { data: latestPrices } = await supabase
    .from('price_history')
    .select('asset_symbol, close_price, date')
    .in('asset_symbol', symbols)
    .order('date', { ascending: false })
    .limit(symbols.length * 5) // Traemos varios días por si algún activo no tiene el último día

  // Quedarnos con el precio más reciente por símbolo
  const priceMap = {}
  for (const row of latestPrices || []) {
    if (!priceMap[row.asset_symbol]) {
      priceMap[row.asset_symbol] = parseFloat(row.close_price)
    }
  }

  // Enriquecer posiciones con precios actuales y recalcular P&L y weights
  const enrichedPositions = (positions || []).map(p => {
    const currentPrice = priceMap[p.asset_symbol] || parseFloat(p.current_price)
    const quantity = parseFloat(p.quantity)
    const avgCost = parseFloat(p.avg_cost)
    const marketValue = quantity * currentPrice
    const unrealizedPnl = (currentPrice - avgCost) * quantity

    return {
      ...p,
      current_price: currentPrice,
      market_value: parseFloat(marketValue.toFixed(2)),
      unrealized_pnl: parseFloat(unrealizedPnl.toFixed(2)),
    }
  })

  // Recalcular weights con precios actualizados
  const totalPositionsValue = enrichedPositions.reduce((sum, p) => sum + p.market_value, 0)
  const finalPositions = enrichedPositions.map(p => ({
    ...p,
    weight_pct: parseFloat(((p.market_value / totalPositionsValue) * 100).toFixed(2)),
  })).sort((a, b) => b.weight_pct - a.weight_pct)

  const lastSync = syncLog?.[0] || null
  const cashBalance = parseFloat(snapshots?.[0]?.cash_balance || 0)
  const totalValue = totalPositionsValue + cashBalance

  return res.status(200).json({
    positions: finalPositions,
    snapshots: snapshots || [],
    totalValue: parseFloat(totalValue.toFixed(2)),
    positionsValue: parseFloat(totalPositionsValue.toFixed(2)),
    cashBalance,
    lastSync,
  })
}

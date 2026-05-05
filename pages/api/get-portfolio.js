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

  const lastSync = syncLog?.[0] || null
  const totalValue = positions?.reduce((sum, p) => sum + (parseFloat(p.market_value) || 0), 0) || 0
  const cashBalance = snapshots?.[0]?.cash_balance || 0

  return res.status(200).json({
    positions: positions || [],
    snapshots: snapshots || [],
    totalValue,
    cashBalance,
    lastSync,
  })
}

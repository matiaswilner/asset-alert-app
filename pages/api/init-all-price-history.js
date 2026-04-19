import { supabaseServer as supabase } from '../../lib/supabaseServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { adminSecret } = req.body
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const [{ data: watchlistItems }, { data: alertItems }] = await Promise.all([
    supabase.from('watchlist').select('asset_symbol, asset_type'),
    supabase.from('alerts').select('asset_symbol, asset_type'),
  ])

  const allItems = [...(watchlistItems || []), ...(alertItems || [])]
  const unique = [...new Map(allItems.map(i => [i.asset_symbol, i])).values()]

  const spyExists = unique.find(i => i.asset_symbol === 'SPY')
  if (!spyExists) unique.push({ asset_symbol: 'SPY', asset_type: 'etf' })

  const results = []
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  for (const item of unique) {
    try {
      const res2 = await fetch(`${baseUrl}/api/init-price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: item.asset_symbol, assetType: item.asset_type }),
      })
      const data = await res2.json()
      results.push({ symbol: item.asset_symbol, ...data })
    } catch (err) {
      results.push({ symbol: item.asset_symbol, error: err.message })
    }
  }

  return res.status(200).json({ results })
}

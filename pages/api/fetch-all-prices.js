import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { getPrices } from '../../lib/prices'
import { logError } from '../../lib/logger'

export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Obtener todos los símbolos únicos de alertas y watchlist
    const [{ data: alerts }, { data: watchlist }] = await Promise.all([
      supabase.from('alerts').select('asset_symbol, asset_type').eq('is_active', true),
      supabase.from('watchlist').select('asset_symbol, asset_type').eq('is_active', true),
    ])

    if ((!alerts || alerts.length === 0) && (!watchlist || watchlist.length === 0)) {
      return res.status(200).json({ message: 'No active symbols to fetch' })
    }

    // Deduplicar símbolos globalmente
    const symbolMap = new Map()
    for (const item of [...(alerts || []), ...(watchlist || [])]) {
      if (!symbolMap.has(item.asset_symbol)) {
        symbolMap.set(item.asset_symbol, item.asset_type)
      }
    }

    const uniqueSymbols = [...symbolMap.entries()].map(([symbol, assetType]) => ({ symbol, assetType }))

    // Fetch de precios en batch — una sola llamada por símbolo único
    const prices = await getPrices(uniqueSymbols)

    const succeeded = Object.values(prices).filter(p => !p.error).length
    const failed = Object.values(prices).filter(p => p.error).length

    return res.status(200).json({
      message: `Fetched ${succeeded} symbols successfully, ${failed} failed`,
      total: uniqueSymbols.length,
      succeeded,
      failed,
    })
  } catch (err) {
    await logError({
      source: 'fetch-all-prices.js:handler',
      category: 'internal',
      message: err.message,
    })
    return res.status(500).json({ error: err.message })
  }
}

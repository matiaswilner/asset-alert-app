import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { parseActivityStatement } from '../../lib/portfolio/parser'
import { calculatePortfolioMetrics } from '../../lib/portfolio/calculator'
import { logError } from '../../lib/logger'
import { isV4Enabled } from '../../lib/config'

export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, csvContent, isLatest = true } = req.body

  if (!userId || !csvContent) {
    return res.status(400).json({ error: 'userId and csvContent are required' })
  }

  if (!isV4Enabled(userId)) {
    return res.status(403).json({ error: 'Feature not available yet' })
  }

  try {
    // 1 — Parsear el CSV
    let parsed
    try {
      parsed = parseActivityStatement(csvContent)
    } catch (err) {
      await logError({
        source: 'sync-portfolio.js:parseActivityStatement',
        category: 'internal',
        message: err.message,
        details: { userId },
      })
      return res.status(400).json({ error: 'Error al parsear el archivo. Asegurate de subir un Activity Statement de IBKR en formato CSV.' })
    }

    const { positions, trades, cashBalance } = parsed

    if (positions.length === 0 && !isLatest) {
      // Archivo histórico sin posiciones — solo importamos trades
    } else if (positions.length === 0) {
      return res.status(400).json({ error: 'No se encontraron posiciones en el archivo. Verificá que el archivo sea un Activity Statement válido.' })
    }

    // 2 — Enriquecer tipos de activos desde asset_directory
    const allSymbols = [...new Set([...positions.map(p => p.asset_symbol), ...trades.map(t => t.asset_symbol)])]
    const { data: directoryEntries } = await supabase
      .from('asset_directory')
      .select('asset_symbol, asset_type')
      .in('asset_symbol', allSymbols)

    const directoryMap = {}
    for (const entry of directoryEntries || []) {
      directoryMap[entry.asset_symbol] = entry.asset_type
    }

    const enrichedPositions = positions.map(p => ({
      ...p,
      asset_type: directoryMap[p.asset_symbol] || p.asset_type,
    }))

    // 3 — Calcular métricas del portfolio
    const { positions: calculatedPositions, totalValue, cashPct } = calculatePortfolioMetrics(enrichedPositions, cashBalance)

    // 4 — Upsert en portfolio_positions SOLO si es el archivo más reciente
    if (isLatest && calculatedPositions.length > 0) {
      const positionRows = calculatedPositions.map(p => ({
        user_id: userId,
        asset_symbol: p.asset_symbol,
        asset_type: p.asset_type,
        quantity: p.quantity,
        avg_cost: p.avg_cost,
        current_price: p.close_price,
        market_value: p.market_value,
        weight_pct: p.weight_pct,
        unrealized_pnl: p.unrealized_pnl,
        last_synced_at: new Date().toISOString(),
      }))

      const { error: positionsError } = await supabase
        .from('portfolio_positions')
        .upsert(positionRows, { onConflict: 'user_id,asset_symbol' })

      if (positionsError) {
        await logError({
          source: 'sync-portfolio.js:upsertPositions',
          category: 'database',
          message: positionsError.message,
          details: { userId },
        })
        return res.status(500).json({ error: 'Error al guardar las posiciones.' })
      }

      // Guardar snapshot diario solo del archivo más reciente
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('portfolio_snapshots')
        .upsert({
          user_id: userId,
          total_value: totalValue,
          cash_balance: cashBalance,
          positions: calculatedPositions,
          snapshot_date: today,
        }, { onConflict: 'user_id,snapshot_date' })

      // Inicializar historial de precios para activos nuevos (fire and forget)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      for (const position of calculatedPositions) {
        fetch(`${baseUrl}/api/init-price-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: position.asset_symbol,
            assetType: position.asset_type,
          }),
        }).catch(() => {})
      }
    }

    // 5 — Insertar trades de todos los archivos
    if (trades.length > 0) {
      const tradeRows = trades.map(t => ({
        user_id: userId,
        asset_symbol: t.asset_symbol,
        asset_type: directoryMap[t.asset_symbol] || t.asset_type,
        trade_date: t.trade_date,
        buy_sell: t.buy_sell,
        quantity: t.quantity,
        price: t.price,
        commission: t.commission,
      }))

      const { error: tradesError } = await supabase
        .from('portfolio_trades')
        .upsert(tradeRows, { onConflict: 'user_id,asset_symbol,trade_date,buy_sell,quantity,price', ignoreDuplicates: true })

      if (tradesError) {
        await logError({
          source: 'sync-portfolio.js:upsertTrades',
          category: 'database',
          message: tradesError.message,
          details: { userId },
        })
      }
    }

    // 6 — Log de sincronización
    await supabase.from('portfolio_sync_log').insert({
      user_id: userId,
      sync_method: 'csv',
      status: 'success',
      positions_count: isLatest ? calculatedPositions.length : 0,
    })

    return res.status(200).json({
      message: isLatest ? 'Portfolio sincronizado correctamente' : 'Trades históricos importados correctamente',
      positions: isLatest ? calculatedPositions.length : 0,
      trades: trades.length,
      totalValue: isLatest ? totalValue : 0,
      cashBalance: isLatest ? cashBalance : 0,
      cashPct: isLatest ? cashPct : 0,
      isLatest,
    })

  } catch (err) {
    await logError({
      source: 'sync-portfolio.js:handler',
      category: 'internal',
      message: err.message,
      details: { userId },
    })
    return res.status(500).json({ error: err.message })
  }
}

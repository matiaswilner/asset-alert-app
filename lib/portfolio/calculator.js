/**
 * Calculador de métricas del portfolio
 * Recibe las posiciones parseadas y calcula weights, totales y métricas
 */

export function calculatePortfolioMetrics(positions, cashBalance = 0) {
  if (!positions || positions.length === 0) {
    return { positions: [], totalValue: cashBalance, cashBalance, cashPct: 100 }
  }

  // Calcular valor total de mercado (posiciones + cash)
  const positionsValue = positions.reduce((sum, p) => sum + (p.market_value || 0), 0)
  const totalValue = positionsValue + cashBalance

  if (totalValue === 0) {
    return { positions, totalValue: 0, cashBalance, cashPct: 0 }
  }

  // Calcular métricas por posición
  const enrichedPositions = positions.map(p => {
    const marketValue = p.market_value || 0
    const weightPct = (marketValue / totalValue) * 100
    const unrealizedPnlPct = p.avg_cost > 0
      ? ((p.close_price - p.avg_cost) / p.avg_cost) * 100
      : 0

    return {
      ...p,
      weight_pct: parseFloat(weightPct.toFixed(2)),
      unrealized_pnl_pct: parseFloat(unrealizedPnlPct.toFixed(2)),
    }
  })

  // Ordenar por peso descendente
  enrichedPositions.sort((a, b) => b.weight_pct - a.weight_pct)

  const cashPct = parseFloat(((cashBalance / totalValue) * 100).toFixed(2))

  return {
    positions: enrichedPositions,
    totalValue: parseFloat(totalValue.toFixed(2)),
    positionsValue: parseFloat(positionsValue.toFixed(2)),
    cashBalance: parseFloat(cashBalance.toFixed(2)),
    cashPct,
  }
}

export function calculateConcentrationRisk(positions) {
  if (!positions || positions.length === 0) return 'bajo'

  // Peso máximo de una sola posición
  const maxWeight = Math.max(...positions.map(p => p.weight_pct || 0))

  // Top 3 posiciones acumulan cuánto del portfolio
  const top3Weight = positions
    .slice(0, 3)
    .reduce((sum, p) => sum + (p.weight_pct || 0), 0)

  if (maxWeight > 25 || top3Weight > 60) return 'alto'
  if (maxWeight > 15 || top3Weight > 45) return 'medio'
  return 'bajo'
}

export function getPositionContext(position) {
  if (!position) return null

  const { weight_pct, close_price, avg_cost } = position
  const isUnderwater = close_price < avg_cost
  const pnlPct = avg_cost > 0 ? ((close_price - avg_cost) / avg_cost) * 100 : 0

  let concentrationLabel
  if (weight_pct > 20) concentrationLabel = 'alta'
  else if (weight_pct > 10) concentrationLabel = 'moderada'
  else concentrationLabel = 'baja'

  let buySignal
  if (weight_pct > 20) buySignal = 'esperar'
  else if (weight_pct > 10) buySignal = 'evaluar'
  else buySignal = 'favorable'

  return {
    weight_pct,
    is_underwater: isUnderwater,
    pnl_pct: parseFloat(pnlPct.toFixed(2)),
    concentration: concentrationLabel,
    buy_signal: buySignal,
  }
}

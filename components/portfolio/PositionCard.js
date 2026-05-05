import Card from '../ui/Card'

export default function PositionCard({ position }) {
  const quantity = parseFloat(position.quantity)
  const avgCost = parseFloat(position.avg_cost)
  const marketValue = parseFloat(position.market_value)
  const unrealizedPnl = parseFloat(position.unrealized_pnl)
  const weightPct = parseFloat(position.weight_pct)

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700' }}>{position.asset_symbol}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{position.asset_type}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {quantity.toFixed(4)} acciones · avg ${avgCost.toFixed(2)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '16px', fontWeight: '700' }}>
            ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: '12px', fontWeight: '600', color: unrealizedPnl >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{weightPct.toFixed(1)}% del portfolio</p>
        </div>
      </div>
    </Card>
  )
}

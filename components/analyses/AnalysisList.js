import AnalysisCard from './AnalysisCard'
import EmptyState from '../ui/EmptyState'

export default function AnalysisList({ analyses }) {
  const grouped = analyses.reduce((acc, a) => {
    if (!acc[a.asset_symbol]) acc[a.asset_symbol] = []
    acc[a.asset_symbol].push(a)
    return acc
  }, {})

  if (Object.keys(grouped).length === 0) {
    return (
      <EmptyState
        icon="🧠"
        title="Sin análisis"
        subtitle="Los análisis aparecen cuando se dispara una alerta o lo solicitás manualmente"
      />
    )
  }

  return (
    <div>
      {Object.entries(grouped).map(([symbol, items]) => (
        <div key={symbol} style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            {symbol}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(a => <AnalysisCard key={a.id} a={a} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

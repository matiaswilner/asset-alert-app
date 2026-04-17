import AlertCard from './AlertCard'
import EmptyState from '../ui/EmptyState'

export default function AlertList({ alerts, onToggle, onDelete, onEdit, onAnalyze, analyzingSymbol }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        title="Sin alertas"
        subtitle="Creá tu primera alerta de precio"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {alerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onAnalyze={onAnalyze}
          analyzingSymbol={analyzingSymbol}
        />
      ))}
    </div>
  )
}

import NotificationCard from './NotificationCard'
import EmptyState from '../ui/EmptyState'

export default function NotificationList({ notifications, expandedId }) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="Sin notificaciones"
        subtitle="Las notificaciones recibidas aparecerán acá"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {notifications.map(n => (
        <NotificationCard
          key={n.id}
          n={n}
          defaultExpanded={n.id === expandedId}
        />
      ))}
    </div>
  )
}

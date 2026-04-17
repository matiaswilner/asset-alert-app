import { useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

export default function NotificationCard({ n, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const triggeredColors = {
    automatic: { color: 'var(--warning)', bg: 'var(--warning-dim)', label: '⚡ Auto' },
    manual: { color: 'var(--accent)', bg: 'var(--accent-dim)', label: '👆 Manual' },
    smart_alert: { color: 'var(--positive)', bg: 'var(--positive-dim)', label: '🧠 Smart' },
  }
  const t = triggeredColors[n.triggered_by] || triggeredColors.automatic

  return (
    <Card onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {n.asset_symbol && <span style={{ fontSize: '15px', fontWeight: '700' }}>{n.asset_symbol}</span>}
          <Badge label={t.label} color={t.color} bg={t.bg} />
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {new Date(n.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{n.title}</p>
      <p style={{
        fontSize: '13px',
        color: 'var(--text-secondary)',
        overflow: 'hidden',
        maxHeight: expanded ? '2000px' : '40px',
        transition: 'max-height 0.3s ease',
      }}>
        {n.body}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>
        {expanded ? '▲ ver menos' : '▼ ver más'}
      </p>
    </Card>
  )
}

import { useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import AlertForm from './AlertForm'
import { CONDITIONS } from './AlertForm'

export default function AlertCard({ alert, onToggle, onDelete, onEdit, onAnalyze, analyzingSymbol }) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    asset_symbol: alert.asset_symbol,
    asset_type: alert.asset_type,
    condition: alert.condition,
    threshold_percent: alert.threshold_percent,
  })

  async function handleSave() {
    await onEdit(alert.id, editForm)
    setEditing(false)
  }

  if (editing) {
    return (
      <Card>
        <AlertForm
          form={editForm}
          setForm={setEditForm}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
          submitLabel="Guardar"
        />
      </Card>
    )
  }

  return (
    <Card style={{ opacity: alert.is_active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>{alert.asset_symbol}</span>
          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{alert.asset_type}</span>
        </div>
        <Badge
          label={alert.is_active ? 'Activa' : 'Pausada'}
          color={alert.is_active ? 'var(--positive)' : 'var(--text-tertiary)'}
          bg={alert.is_active ? 'var(--positive-dim)' : 'var(--bg-tertiary)'}
        />
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        {CONDITIONS[alert.condition]} {alert.threshold_percent ? `${alert.threshold_percent}%` : ''}
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Button
          onClick={() => onAnalyze(alert)}
          disabled={analyzingSymbol === alert.asset_symbol}
          variant="purple"
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          {analyzingSymbol === alert.asset_symbol ? '...' : '🧠 Analizar'}
        </Button>
        <Button
          onClick={() => onToggle(alert.id, alert.is_active)}
          variant={alert.is_active ? 'warning' : 'success'}
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          {alert.is_active ? 'Pausar' : 'Activar'}
        </Button>
        <Button
          onClick={() => setEditing(true)}
          variant="ghost"
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          Editar
        </Button>
        <Button
          onClick={() => onDelete(alert.id)}
          variant="danger"
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          Eliminar
        </Button>
      </div>
    </Card>
  )
}

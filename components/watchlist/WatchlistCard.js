import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

function getChangeColor(change) {
  if (change > 0) return 'var(--positive)'
  if (change < 0) return 'var(--negative)'
  return 'var(--text-secondary)'
}

export default function WatchlistCard({ item, price, onToggle, onRemove, onAnalyze, analyzingSymbol }) {
  return (
    <Card style={{ opacity: item.is_active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>{item.asset_symbol}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{item.asset_type}</span>
          </div>
          {price ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: '700' }}>${parseFloat(price.current_price).toFixed(2)}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: getChangeColor(price.change_day) }}>
                {price.change_day > 0 ? '+' : ''}{parseFloat(price.change_day).toFixed(2)}%
                <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-tertiary)', marginLeft: '4px' }}>hoy</span>
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin datos aún</span>
          )}
          {price && (
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Actualizado {new Date(price.updated_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <Badge
          label={item.is_active ? '🧠 Smart Alert' : 'Pausado'}
          color={item.is_active ? 'var(--positive)' : 'var(--text-tertiary)'}
          bg={item.is_active ? 'var(--positive-dim)' : 'var(--bg-tertiary)'}
        />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <Button
          onClick={() => onAnalyze(item)}
          disabled={analyzingSymbol === item.asset_symbol}
          variant="purple"
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          {analyzingSymbol === item.asset_symbol ? '...' : '🧠'}
        </Button>
        <Button
          onClick={() => onToggle(item.id, item.is_active)}
          variant={item.is_active ? 'warning' : 'success'}
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          {item.is_active ? 'Pausar' : 'Activar'}
        </Button>
        <Button
          onClick={() => onRemove(item.id)}
          variant="danger"
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          Quitar
        </Button>
      </div>
    </Card>
  )
}

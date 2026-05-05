import Button from '../ui/Button'
import Card from '../ui/Card'

export default function PortfolioHeader({ portfolio, showUploader, onToggleUploader }) {
  const totalValue = parseFloat(portfolio?.totalValue || 0)
  const cashBalance = parseFloat(portfolio?.cashBalance || 0)
  const cashPct = totalValue > 0 ? ((cashBalance / totalValue) * 100).toFixed(1) : 0
  const lastSync = portfolio?.lastSync

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Portfolio</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {lastSync
              ? `Última sync: ${new Date(lastSync.created_at).toLocaleDateString('es-AR')}`
              : 'Sin sincronizar'}
          </p>
        </div>
        <Button onClick={onToggleUploader} variant="purple">
          {showUploader ? '✕ Cerrar' : '📥 Sincronizar'}
        </Button>
      </div>

      {totalValue > 0 && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Valor total</p>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Cash: ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({cashPct}%)
            </p>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700' }}>
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      )}
    </div>
  )
}

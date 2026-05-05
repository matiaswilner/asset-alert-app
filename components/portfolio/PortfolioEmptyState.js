import Card from '../ui/Card'

export default function PortfolioEmptyState({ onSync }) {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>💼</p>
        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Sin datos de portfolio
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: '1.5', marginBottom: '16px' }}>
          Sincronizá tu portfolio de Interactive Brokers para ver tus posiciones y análisis.
        </p>
      </div>
    </Card>
  )
}

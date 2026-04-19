export default function AnalysisProgressBar({ symbol, onDone }) {
  const steps = [
    { id: 'news', label: 'Buscando noticias', icon: '🔍' },
    { id: 'analysis', label: 'Analizando', icon: '🧠' },
    { id: 'done', label: 'Listo', icon: '✅' },
  ]

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      padding: '10px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Analizando {symbol}...
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '12px' }}>{step.icon}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: 'var(--border)', margin: '0 4px' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

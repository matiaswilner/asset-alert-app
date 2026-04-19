import { useEffect, useState } from 'react'

const STEPS = [
  { id: 'news', label: 'Buscando noticias', icon: '🔍' },
  { id: 'analysis', label: 'Analizando', icon: '🧠' },
  { id: 'done', label: 'Listo', icon: '✅' },
]

export default function AnalysisProgressBar({ symbol, done }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    setActiveStep(0)
    const timer = setTimeout(() => setActiveStep(1), 8000)
    return () => clearTimeout(timer)
  }, [symbol])

  useEffect(() => {
    if (done) setActiveStep(2)
  }, [done])

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      padding: '12px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
        Analizando {symbol}...
      </p>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px', opacity: activeStep >= i ? 1 : 0.3, transition: 'opacity 0.4s ease' }}>
                {step.icon}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: activeStep === i ? '600' : '400',
                color: activeStep >= i ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'color 0.4s ease',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                background: activeStep > i ? 'var(--accent)' : 'var(--border)',
                margin: '0 8px',
                borderRadius: '999px',
                transition: 'background 0.4s ease',
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

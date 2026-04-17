import { useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ScoreBar from '../ui/ScoreBar'

function getConfidenceLabel(c) {
  if (c >= 75) return 'Señal clara'
  if (c >= 50) return 'Señal moderada'
  if (c >= 25) return 'Señal débil'
  return 'Muy incierto'
}

export default function AnalysisCard({ a }) {
  const [expanded, setExpanded] = useState(false)

  const triggeredColors = {
    automatic: { color: 'var(--warning)', bg: 'var(--warning-dim)', label: '⚡ Auto' },
    manual: { color: 'var(--accent)', bg: 'var(--accent-dim)', label: '👆 Manual' },
    smart_alert: { color: 'var(--positive)', bg: 'var(--positive-dim)', label: '🧠 Smart' },
  }
  const t = triggeredColors[a.triggered_by] || triggeredColors.automatic
  const recColor = a.recommendation?.includes('BUY') ? 'var(--positive)' :
                   a.recommendation?.includes('WAIT') ? 'var(--negative)' : 'var(--warning)'

  return (
    <Card onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Badge label={t.label} color={t.color} bg={t.bg} />
          <Badge label={a.context} />
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {new Date(a.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>{a.summary}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: recColor }}>{a.recommendation}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{expanded ? '▲ menos' : '▼ más'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🧠 Por qué</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{a.explanation}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📈 Interpretación</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{a.interpretation}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📊 Score</p>
            <ScoreBar score={a.score ?? 0} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔎 Confianza</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.confidence}% — {getConfidenceLabel(a.confidence ?? 0)}</span>
          </div>
          {a.prompt_version && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Prompt {a.prompt_version}</span>
          )}
        </div>
      )}
    </Card>
  )
}

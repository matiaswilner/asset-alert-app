import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import ScoreBar from '../ui/ScoreBar'

function getConcentrationColor(risk) {
  if (risk === 'alto') return 'var(--negative)'
  if (risk === 'medio') return '#f59e0b'
  return 'var(--positive)'
}

function getConfidenceLabel(c) {
  if (c >= 75) return 'Señal clara'
  if (c >= 50) return 'Señal moderada'
  if (c >= 25) return 'Señal débil'
  return 'Muy incierto'
}

export default function PortfolioAnalysis({ userId, onAnalysisGenerated }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const res = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnalysis(data.analysis)
      setExpanded(true)
      if (onAnalysisGenerated) {
        const analysisText = `Análisis de tu portfolio:\n\n${data.analysis.summary}\n\n**Concentración:** ${data.analysis.concentration_detail}\n\n**Diversificación:** ${data.analysis.diversification}\n\n**Posiciones bajo agua:** ${data.analysis.underwater_positions}\n\n**Uso del cash:** ${data.analysis.cash_deployment}\n\n**Lo que está funcionando:** ${data.analysis.whats_working}\n\n**Oportunidades perdidas:** ${data.analysis.missed_opportunities}\n\n**Acciones prioritarias:**\n${data.analysis.priority_actions?.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
        onAnalysisGenerated(analysisText)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {!analysis && (
        <Button
          onClick={runAnalysis}
          disabled={loading}
          variant="purple"
          style={{ width: '100%', padding: '12px', fontSize: '14px' }}
        >
          {loading ? '🧠 Analizando portfolio...' : '🧠 Analizar portfolio completo'}
        </Button>
      )}

      {error && (
        <div style={{ background: 'var(--negative-dim)', border: '1px solid var(--negative)', borderRadius: '12px', padding: '12px 16px', marginTop: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--negative)' }}>❌ {error}</p>
        </div>
      )}

      {analysis && (
        <Card>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>🧠 Análisis del portfolio</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '2px 6px' }}>
                {getConcentrationColor(analysis.concentration_risk) === 'var(--negative)' ? '🔴' :
                 getConcentrationColor(analysis.concentration_risk) === '#f59e0b' ? '🟡' : '🟢'} Concentración {analysis.concentration_risk}
              </span>
            </div>
            <button
              onClick={() => { setAnalysis(null); setExpanded(false) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '12px' }}
            >
              ✕
            </button>
          </div>

          {/* Summary */}
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
            {analysis.summary}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <ScoreBar score={analysis.score ?? 0} />
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
              {analysis.confidence}% — {getConfidenceLabel(analysis.confidence)}
            </span>
          </div>

          {/* Priority actions */}
          {analysis.priority_actions?.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                🎯 Acciones prioritarias
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {analysis.priority_actions.map((action, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', minWidth: '16px' }}>{i + 1}.</span>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle expanded */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: expanded ? '12px' : 0 }}
          >
            {expanded ? '▲ Ver menos' : '▼ Ver análisis completo'}
          </button>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>

              {analysis.concentration_detail && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>⚖️ Concentración</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{analysis.concentration_detail}</p>
                </div>
              )}

              {analysis.diversification && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>🌐 Diversificación</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{analysis.diversification}</p>
                </div>
              )}

              {analysis.underwater_positions && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>📉 Posiciones bajo agua</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{analysis.underwater_positions}</p>
                </div>
              )}

              {analysis.cash_deployment && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>💵 Uso del cash</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{analysis.cash_deployment}</p>
                </div>
              )}

              {analysis.whats_working && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>✅ Lo que está funcionando</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{analysis.whats_working}</p>
                </div>
              )}

              {analysis.missed_opportunities && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>🔍 Oportunidades perdidas</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{analysis.missed_opportunities}</p>
                </div>
              )}

            </div>
          )}

          {/* Re-analizar */}
          <button
            onClick={runAnalysis}
            disabled={loading}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '11px', cursor: 'pointer', padding: 0, marginTop: '12px' }}
          >
            {loading ? 'Analizando...' : '↺ Re-analizar'}
          </button>
        </Card>
      )}
    </div>
  )
}

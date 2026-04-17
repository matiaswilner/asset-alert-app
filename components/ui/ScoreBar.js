function getScoreColor(score) {
  if (score >= 2) return 'var(--positive)'
  if (score >= 0) return 'var(--warning)'
  return 'var(--negative)'
}

function getScoreLabel(score) {
  if (score >= 4) return 'COMPRAR'
  if (score >= 2) return 'COMPRAR GRADUALMENTE'
  if (score >= 1) return 'CONSIDERAR'
  if (score === 0) return 'NEUTRAL'
  if (score >= -1) return 'PRECAUCIÓN'
  if (score >= -3) return 'ESPERAR'
  return 'EVITAR'
}

export default function ScoreBar({ score }) {
  const pct = ((score + 5) / 10) * 100
  const color = getScoreColor(score)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>-5</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color }}>{score > 0 ? `+${score}` : score} — {getScoreLabel(score)}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>+5</span>
      </div>
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

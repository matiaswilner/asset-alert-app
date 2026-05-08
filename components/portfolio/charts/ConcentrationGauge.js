export default function ConcentrationGauge({ positions }) {
  if (!positions || positions.length === 0) return null

  const maxWeight = Math.max(...positions.map(p => parseFloat(p.weight_pct)))
  const top3Weight = positions.slice(0, 3).reduce((sum, p) => sum + parseFloat(p.weight_pct), 0)
  const top5Weight = positions.slice(0, 5).reduce((sum, p) => sum + parseFloat(p.weight_pct), 0)

  let riskLevel, riskColor, riskLabel
  if (maxWeight > 25 || top3Weight > 60) {
    riskLevel = 85
    riskColor = 'var(--negative)'
    riskLabel = 'Alto'
  } else if (maxWeight > 15 || top3Weight > 45) {
    riskLevel = 50
    riskColor = '#f59e0b'
    riskLabel = 'Medio'
  } else {
    riskLevel = 15
    riskColor = 'var(--positive)'
    riskLabel = 'Bajo'
  }

  // SVG gauge semicircular
  const radius = 70
  const strokeWidth = 12
  const cx = 100
  const cy = 90
  const circumference = Math.PI * radius
  const dashOffset = circumference - (riskLevel / 100) * circumference

  return (
    <div>
      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Índice de concentración
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Gauge SVG */}
        <div style={{ position: 'relative', width: '200px', flexShrink: 0 }}>
          <svg viewBox="0 0 200 110" width="200" height="110">
            {/* Track */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Progress */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke={riskColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
            {/* Labels */}
            <text x="28" y={cy + 20} fontSize="10" fill="var(--text-tertiary)" textAnchor="middle">Bajo</text>
            <text x={cx} y="30" fontSize="10" fill="var(--text-tertiary)" textAnchor="middle">Medio</text>
            <text x="172" y={cy + 20} fontSize="10" fill="var(--text-tertiary)" textAnchor="middle">Alto</text>
          </svg>
          <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: '700', color: riskColor }}>{riskLabel}</p>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Mayor posición</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', fontWeight: '600' }}>{positions[0]?.asset_symbol}</p>
              <p style={{ fontSize: '13px', fontWeight: '600', color: maxWeight > 25 ? 'var(--negative)' : 'var(--text-primary)' }}>
                {maxWeight.toFixed(1)}%
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Top 3 posiciones</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', fontWeight: '600' }}>{positions.slice(0, 3).map(p => p.asset_symbol).join(', ')}</p>
              <p style={{ fontSize: '13px', fontWeight: '600', color: top3Weight > 60 ? 'var(--negative)' : 'var(--text-primary)' }}>
                {top3Weight.toFixed(1)}%
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Top 5 posiciones</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}></p>
              <p style={{ fontSize: '13px', fontWeight: '600' }}>
                {top5Weight.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

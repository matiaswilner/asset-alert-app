import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

const BENCHMARK = 'SPY'
const PERIODS = ['3M', '6M', '1A', '2A']

function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length < 2) return null
  const n = x.length
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n
  const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0)
  const denX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0))
  const denY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0))
  if (denX === 0 || denY === 0) return null
  return num / (denX * denY)
}

function getCorrelationColor(corr) {
  if (corr === null) return 'var(--text-tertiary)'
  if (corr >= 0.8) return '#ef4444'
  if (corr >= 0.6) return '#f97316'
  if (corr >= 0.4) return '#eab308'
  if (corr >= 0.2) return '#84cc16'
  return 'var(--positive)'
}

function getCorrelationLabel(corr) {
  if (corr === null) return 'Sin datos'
  if (corr >= 0.8) return 'Muy alta'
  if (corr >= 0.6) return 'Alta'
  if (corr >= 0.4) return 'Moderada'
  if (corr >= 0.2) return 'Baja'
  return 'Muy baja'
}

export default function CorrelationChart({ positions }) {
  const [period, setPeriod] = useState('1A')
  const [correlations, setCorrelations] = useState([])
  const [portfolioCorr, setPortfolioCorr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    setLoading(true)
    try {
      const days = { '3M': 90, '6M': 180, '1A': 365, '2A': 730 }[period]
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)
      const fromStr = fromDate.toISOString().split('T')[0]

      const symbols = [...positions.map(p => p.asset_symbol), BENCHMARK]

      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('asset_symbol, date, close_price')
        .in('asset_symbol', symbols)
        .gte('date', fromStr)
        .order('date', { ascending: true })
        .limit(50000)

      // Agrupar precios por símbolo y fecha
      const bySymbolDate = {}
      for (const row of priceHistory || []) {
        if (!bySymbolDate[row.asset_symbol]) bySymbolDate[row.asset_symbol] = {}
        bySymbolDate[row.asset_symbol][row.date] = parseFloat(row.close_price)
      }

      // Obtener fechas comunes con SPY
      const spyDates = Object.keys(bySymbolDate[BENCHMARK] || {}).sort()

      // Calcular retornos diarios de SPY
      const spyReturns = []
      for (let i = 1; i < spyDates.length; i++) {
        const prev = bySymbolDate[BENCHMARK][spyDates[i - 1]]
        const curr = bySymbolDate[BENCHMARK][spyDates[i]]
        spyReturns.push((curr - prev) / prev)
      }

      // Calcular correlación por activo
      const results = positions.map(pos => {
        const symbol = pos.asset_symbol
        const assetReturns = []

        for (let i = 1; i < spyDates.length; i++) {
          const prev = bySymbolDate[symbol]?.[spyDates[i - 1]]
          const curr = bySymbolDate[symbol]?.[spyDates[i]]
          if (prev && curr) {
            assetReturns.push((curr - prev) / prev)
          } else {
            assetReturns.push(null)
          }
        }

        const validPairs = spyReturns
          .map((r, i) => ({ spy: r, asset: assetReturns[i] }))
          .filter(p => p.asset !== null)

        const corr = calculateCorrelation(
          validPairs.map(p => p.spy),
          validPairs.map(p => p.asset)
        )

        return {
          symbol,
          correlation: corr !== null ? parseFloat(corr.toFixed(3)) : null,
          weight: parseFloat(pos.weight_pct),
        }
      }).sort((a, b) => (b.correlation || 0) - (a.correlation || 0))

      // Correlación del portfolio completo (ponderada por peso)
      const validResults = results.filter(r => r.correlation !== null)
      const portfolioCorrelation = validResults.length > 0
        ? validResults.reduce((sum, r) => sum + r.correlation * (r.weight / 100), 0)
        : null

      setCorrelations(results)
      setPortfolioCorr(portfolioCorrelation !== null ? parseFloat(portfolioCorrelation.toFixed(3)) : null)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Correlación con SPY
        </p>
        <div style={{ display: 'flex', gap: '4px' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? 'var(--accent)' : 'var(--bg-secondary)',
                color: period === p ? '#fff' : 'var(--text-tertiary)',
                border: 'none', borderRadius: '6px', padding: '4px 8px',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {portfolioCorr !== null && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Correlación del portfolio</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{getCorrelationLabel(portfolioCorr)}</p>
          </div>
          <p style={{ fontSize: '24px', fontWeight: '700', color: getCorrelationColor(portfolioCorr) }}>
            {portfolioCorr.toFixed(2)}
          </p>
        </div>
      )}

      {loading ? (
        <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '12px' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {correlations.map(item => (
            <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', width: '40px', flexShrink: 0 }}>
                {item.symbol}
              </span>
              <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: item.correlation !== null ? `${Math.abs(item.correlation) * 100}%` : '0%',
                  background: getCorrelationColor(item.correlation),
                  borderRadius: '999px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: getCorrelationColor(item.correlation), width: '35px', textAlign: 'right', flexShrink: 0 }}>
                {item.correlation !== null ? item.correlation.toFixed(2) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { label: '≥0.8 Muy alta', color: '#ef4444' },
          { label: '≥0.6 Alta', color: '#f97316' },
          { label: '≥0.4 Moderada', color: '#eab308' },
          { label: '<0.4 Baja', color: 'var(--positive)' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

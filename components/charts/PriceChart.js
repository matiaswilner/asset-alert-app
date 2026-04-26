import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

const PERIODS = [
  { id: '1D', label: '1D', days: 1 },
  { id: '3D', label: '3D', days: 3 },
  { id: '1S', label: '1S', days: 7 },
  { id: '14D', label: '14D', days: 14 },
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '6M', label: '6M', days: 180 },
  { id: '1A', label: '1A', days: 365 },
  { id: '2A', label: '2A', days: 730 },
  { id: '3A', label: '3A', days: 1095 },
  { id: '5A', label: '5A', days: 1825 },
  { id: '10A', label: '10A', days: 3650 },
]

const CHART_TYPES = [
  { id: 'spy', label: 'vs SPY' },
  { id: 'average', label: 'Promedio' },
  { id: 'analyses', label: 'Análisis' },
  { id: 'buy', label: 'Compra' },
]

function formatDate(dateStr, days) {
  const date = new Date(dateStr)
  if (days <= 90) return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`
}

function getChangeColor(change) {
  if (change > 0) return 'var(--positive)'
  if (change < 0) return 'var(--negative)'
  return 'var(--text-secondary)'
}

export default function PriceChart({ symbol, assetType, analyses }) {
  const safeAnalyses = Array.isArray(analyses) ? analyses : []
  const [activePeriod, setActivePeriod] = useState('1M')
  const [activeChartType, setActiveChartType] = useState('spy')
  const [data, setData] = useState([])
  const [spyData, setSpyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  const isSPY = symbol === 'SPY'

  useEffect(() => {
    fetchData()
  }, [activePeriod, symbol])

  async function fetchData() {
    setLoading(true)
    const period = PERIODS.find(p => p.id === activePeriod)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - period.days)
    const fromStr = fromDate.toISOString().split('T')[0]

    const { data: rows } = await supabase
      .from('price_history')
      .select('date, close_price')
      .eq('asset_symbol', symbol)
      .gte('date', fromStr)
      .order('date', { ascending: true })

    if (!isSPY) {
      const { data: spyRows } = await supabase
        .from('price_history')
        .select('date, close_price')
        .eq('asset_symbol', 'SPY')
        .gte('date', fromStr)
        .order('date', { ascending: true })
      setSpyData(spyRows || [])
    }

    const prices = rows || []
    setData(prices)

    if (prices.length > 0) {
      const closes = prices.map(r => parseFloat(r.close_price))
      const min = Math.min(...closes)
      const max = Math.max(...closes)
      const avg = closes.reduce((a, b) => a + b, 0) / closes.length
      const first = closes[0]
      const last = closes[closes.length - 1]
      const change = ((last - first) / first) * 100
      const p20 = min + (max - min) * 0.2
      const p80 = min + (max - min) * 0.8
      setStats({ min, max, avg, change, last, p20, p80 })
    }

    setLoading(false)
  }

  function buildChartData() {
    if (!data.length) return []

    const firstPrice = parseFloat(data[0].close_price)
    const spyMap = {}
    if (spyData.length) {
      const firstSpy = parseFloat(spyData[0].close_price)
      spyData.forEach(r => {
        spyMap[r.date] = (parseFloat(r.close_price) / firstSpy) * 100
      })
    }

    return data.map(row => {
      const close = parseFloat(row.close_price)
      const normalized = (close / firstPrice) * 100
      const analysisOnDate = safeAnalyses.find(a => {
        if (!a.created_at) return false
        const d = new Date(a.created_at)
        const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString().split('T')[0]
        return localDate === row.date
      })
      return {
        date: row.date,
        price: close,
        normalized,
        spy: spyMap[row.date] || null,
        hasAnalysis: !!analysisOnDate,
        analysisSummary: analysisOnDate?.summary || null,
      }
    })
  }

  const chartData = buildChartData()
  const period = PERIODS.find(p => p.id === activePeriod)

  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    if (!payload.hasAnalysis) return null
    return <circle cx={cx} cy={cy} r={5} fill="var(--accent)" stroke="var(--bg-card)" strokeWidth={2} />
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>{payload[0]?.payload?.date}</p>
        <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formatPrice(payload[0]?.payload?.price)}</p>
        {payload[0]?.payload?.analysisSummary && (
          <p style={{ color: 'var(--accent)', marginTop: '4px', maxWidth: '160px', lineHeight: '1.4' }}>
            🧠 {payload[0].payload.analysisSummary.slice(0, 60)}...
          </p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <style>{`
          @keyframes shimmer {
            0% { opacity: 0.4; }
            50% { opacity: 0.8; }
            100% { opacity: 0.4; }
          }
        `}</style>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ width: '140px', height: '32px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '8px', animation: 'shimmer 1.5s ease infinite' }} />
          <div style={{ width: '100px', height: '16px', background: 'var(--bg-tertiary)', borderRadius: '6px', animation: 'shimmer 1.5s ease infinite 0.2s' }} />
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ width: '36px', height: '28px', background: 'var(--bg-tertiary)', borderRadius: '8px', animation: `shimmer 1.5s ease infinite ${i * 0.1}s` }} />
          ))}
        </div>
        <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '12px', animation: 'shimmer 1.5s ease infinite' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ width: '70px', height: '32px', background: 'var(--bg-tertiary)', borderRadius: '8px', animation: `shimmer 1.5s ease infinite ${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data.length) {
    const today = new Date()
    const isWeekend = today.getDay() === 0 || today.getDay() === 6
    const isShortPeriod = ['1D', '3D'].includes(activePeriod)
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>
          {isWeekend && isShortPeriod ? '📅' : '📊'}
        </div>
        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
          {isWeekend && isShortPeriod ? 'Mercado cerrado' : 'Sin datos para este período'}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: '1.6' }}>
          {isWeekend && isShortPeriod
            ? 'Los mercados no operan los sábados y domingos. Los datos se actualizan los días hábiles después del cierre.'
            : 'No hay datos disponibles todavía. Volvé a intentar más tarde.'}
        </p>
      </div>
    )
  }

  const spyChange = spyData.length > 0
    ? ((parseFloat(spyData[spyData.length - 1].close_price) - parseFloat(spyData[0].close_price)) / parseFloat(spyData[0].close_price)) * 100
    : null

  return (
    <div>
      {stats && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '28px', fontWeight: '700' }}>{formatPrice(stats.last)}</span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: getChangeColor(stats.change) }}>
              {stats.change > 0 ? '+' : ''}{stats.change.toFixed(2)}% en {activePeriod}
            </span>
            {!isSPY && spyChange !== null && (
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                vs SPY {spyChange > 0 ? '+' : ''}{spyChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', overflowX: 'auto' }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePeriod(p.id)}
            style={{
              background: activePeriod === p.id ? 'var(--accent)' : 'var(--bg-secondary)',
              color: activePeriod === p.id ? '#fff' : 'var(--text-tertiary)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!isSPY && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', overflowX: 'auto' }}>
          {CHART_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => setActiveChartType(ct.id)}
              style={{
                background: activeChartType === ct.id ? 'var(--bg-tertiary)' : 'none',
                color: activeChartType === ct.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: activeChartType === ct.id ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {ct.label}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={d => formatDate(d, period.days)}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => activeChartType === 'spy' && !isSPY ? `${v.toFixed(0)}` : formatPrice(v)}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />

          {activeChartType === 'spy' && !isSPY && (
            <>
              <Line type="monotone" dataKey="normalized" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spy" stroke="var(--text-tertiary)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </>
          )}

          {(activeChartType === 'average' || isSPY) && (
            <>
              <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={false} />
              {stats && <ReferenceLine y={stats.avg} stroke="var(--text-tertiary)" strokeDasharray="4 2" strokeWidth={1.5} />}
            </>
          )}

          {activeChartType === 'analyses' && (
            <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={<CustomDot />} />
          )}

          {activeChartType === 'buy' && stats && (
            <>
              <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <ReferenceArea y1={stats.min} y2={stats.p20} fill="var(--positive)" fillOpacity={0.1} />
              <ReferenceArea y1={stats.p80} y2={stats.max} fill="var(--negative)" fillOpacity={0.1} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>

      {stats && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Mínimo</p>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--negative)' }}>{formatPrice(stats.min)}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Promedio</p>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{formatPrice(stats.avg)}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Máximo</p>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--positive)' }}>{formatPrice(stats.max)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

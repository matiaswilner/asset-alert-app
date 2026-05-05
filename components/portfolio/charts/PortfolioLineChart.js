import { useState, useEffect } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const PERIODS = ['1M', '3M', '6M', '1A', '2A', '5A']
const BENCHMARKS = ['SPY', 'QQQ', 'VTI', 'BTC']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '6px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: '600', marginBottom: '2px' }}>
          {p.name}: {p.value?.toFixed(1)}
        </p>
      ))}
    </div>
  )
}

export default function PortfolioLineChart({ userId }) {
  const [period, setPeriod] = useState('1A')
  const [benchmark, setBenchmark] = useState('SPY')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [period, benchmark])

  async function fetchHistory() {
    setLoading(true)
    try {
      const res = await fetch(`/api/get-portfolio-history?userId=${userId}&period=${period}&benchmark=${benchmark}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const chartData = data?.portfolioHistory?.map(row => {
    const benchmarkRow = data.benchmarkHistory?.find(b => b.date === row.date)
    return {
      date: row.date,
      Portfolio: row.normalized,
      [benchmark]: benchmarkRow?.normalized || null,
    }
  }) || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Portfolio vs {benchmark}
        </p>
        {data && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: data.portfolioReturn >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: '600' }}>
              Portfolio: {data.portfolioReturn >= 0 ? '+' : ''}{data.portfolioReturn}%
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {benchmark}: {data.benchmarkReturn >= 0 ? '+' : ''}{data.benchmarkReturn}%
            </p>
          </div>
        )}
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto' }}>
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              background: period === p ? 'var(--accent)' : 'var(--bg-secondary)',
              color: period === p ? '#fff' : 'var(--text-tertiary)',
              border: 'none', borderRadius: '8px', padding: '5px 10px',
              fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Benchmark selector */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', overflowX: 'auto' }}>
        {BENCHMARKS.map(b => (
          <button
            key={b}
            onClick={() => setBenchmark(b)}
            style={{
              background: benchmark === b ? 'var(--bg-tertiary)' : 'none',
              color: benchmark === b ? 'var(--text-primary)' : 'var(--text-tertiary)',
              border: benchmark === b ? '1px solid var(--border)' : '1px solid transparent',
              borderRadius: '8px', padding: '5px 10px',
              fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {b}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '12px', animation: 'shimmer 1.5s ease infinite' }} />
      ) : chartData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Sin datos para este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v.toFixed(0)}`}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{value}</span>}
              iconSize={8}
            />
            <Line type="monotone" dataKey="Portfolio" stroke="var(--accent)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={benchmark} stroke="var(--text-tertiary)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

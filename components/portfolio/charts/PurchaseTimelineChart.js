import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

function groupByPeriod(trades, groupBy) {
  const groups = {}

  for (const trade of trades) {
    if (trade.buy_sell !== 'BUY') continue
    const date = new Date(trade.trade_date)
    let key

    if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } else if (groupBy === 'quarter') {
      const quarter = Math.floor(date.getMonth() / 3) + 1
      key = `${date.getFullYear()} Q${quarter}`
    } else {
      key = `${date.getFullYear()}`
    }

    if (!groups[key]) groups[key] = { period: key, invested: 0, trades: 0 }
    groups[key].invested += parseFloat(trade.quantity) * parseFloat(trade.price)
    groups[key].trades += 1
  }

  return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period))
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>{label}</p>
      <p style={{ color: 'var(--accent)', fontWeight: '600' }}>
        ${parseFloat(payload[0]?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
      <p style={{ color: 'var(--text-tertiary)' }}>{payload[0]?.payload?.trades} operaciones</p>
    </div>
  )
}

export default function PurchaseTimelineChart({ trades }) {
  const [groupBy, setGroupBy] = useState('month')

  const chartData = groupByPeriod(trades || [], groupBy)
  const maxValue = Math.max(...chartData.map(d => d.invested))

  if (!trades || trades.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
        Sin historial de compras
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Capital desplegado
        </p>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'month', label: 'Mes' },
            { id: 'quarter', label: 'Trim.' },
            { id: 'year', label: 'Año' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setGroupBy(opt.id)}
              style={{
                background: groupBy === opt.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: groupBy === opt.id ? '#fff' : 'var(--text-tertiary)',
                border: 'none', borderRadius: '6px', padding: '4px 8px',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="period"
            tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="invested" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.invested === maxValue ? 'var(--accent)' : 'var(--bg-tertiary)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

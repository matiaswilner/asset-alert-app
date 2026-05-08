import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.symbol}</p>
      <p style={{ color: item.pnl >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: '600' }}>
        {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
      </p>
      <p style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>
        {item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(2)}%
      </p>
    </div>
  )
}

export default function PnLChart({ positions }) {
  if (!positions || positions.length === 0) return null

  const data = positions
    .map(p => ({
      symbol: p.asset_symbol,
      pnl: parseFloat(p.unrealized_pnl),
      pnlPct: parseFloat(p.avg_cost) > 0
        ? ((parseFloat(p.current_price) - parseFloat(p.avg_cost)) / parseFloat(p.avg_cost)) * 100
        : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl)

  const height = Math.max(data.length * 36 + 40, 200)

  return (
    <div>
      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        P&L por activo
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v >= 0 ? '' : ''}${v.toFixed(0)}`}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: '600' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
          <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.pnl >= 0 ? 'var(--positive)' : 'var(--negative)'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

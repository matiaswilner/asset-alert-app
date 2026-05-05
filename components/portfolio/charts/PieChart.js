import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const RADIAN = Math.PI / 180

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  if (value < 5) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${value.toFixed(1)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.name}</p>
      <p style={{ color: 'var(--text-secondary)' }}>{item.value.toFixed(1)}% del portfolio</p>
      {item.payload.value && (
        <p style={{ color: 'var(--text-tertiary)' }}>${parseFloat(item.payload.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      )}
    </div>
  )
}

export default function PortfolioPieChart({ data, colors, title }) {
  if (!data || data.length === 0) return null

  return (
    <div>
      {title && (
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>{title}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="42%"
            outerRadius={85}
            dataKey="weight"
            labelLine={false}
            label={renderCustomLabel}
            style={{ outline: 'none' }}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={colors[entry.name] || '#6b7280'}
                style={{ outline: 'none', cursor: 'default' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{value}</span>}
            iconSize={8}
            wrapperStyle={{ paddingTop: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

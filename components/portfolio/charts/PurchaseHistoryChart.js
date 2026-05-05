import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'

const CustomDot = (props) => {
  const { cx, cy, payload } = props
  if (!payload.isPurchase) return null
  return <circle cx={cx} cy={cy} r={5} fill="var(--positive)" stroke="var(--bg-card)" strokeWidth={2} />
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>{data?.date}</p>
      <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>${parseFloat(data?.price || 0).toFixed(2)}</p>
      {data?.isPurchase && (
        <p style={{ color: 'var(--positive)', marginTop: '4px' }}>
          🛒 Compra: {parseFloat(data.quantity).toFixed(4)} acciones
        </p>
      )}
    </div>
  )
}

export default function PurchaseHistoryChart({ symbol, userId }) {
  const [data, setData] = useState([])
  const [avgCost, setAvgCost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [symbol])

  async function fetchData() {
    setLoading(true)
    try {
      const [{ data: priceHistory }, { data: trades }, { data: position }] = await Promise.all([
        supabase
          .from('price_history')
          .select('date, close_price')
          .eq('asset_symbol', symbol)
          .order('date', { ascending: true })
          .limit(4000),
        supabase
          .from('portfolio_trades')
          .select('trade_date, quantity, price')
          .eq('asset_symbol', symbol)
          .eq('user_id', userId)
          .eq('buy_sell', 'BUY')
          .order('trade_date', { ascending: true }),
        supabase
          .from('portfolio_positions')
          .select('avg_cost')
          .eq('asset_symbol', symbol)
          .eq('user_id', userId)
          .single(),
      ])

      if (position?.avg_cost) setAvgCost(parseFloat(position.avg_cost))

      const tradeMap = {}
      for (const trade of trades || []) {
        tradeMap[trade.trade_date] = trade
      }

      const chartData = (priceHistory || []).map(row => ({
        date: row.date,
        price: parseFloat(row.close_price),
        isPurchase: !!tradeMap[row.date],
        quantity: tradeMap[row.date]?.quantity || null,
      }))

      setData(chartData)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (loading) {
    return <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '12px' }} />
  }

  if (data.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '32px' }}>Sin datos de precio</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Historial de compras — {symbol}
        </p>
        {avgCost && (
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Avg: <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${avgCost.toFixed(2)}</span>
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--positive)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Compra</span>
        </div>
        {avgCost && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '2px', background: 'var(--text-tertiary)', borderTop: '2px dashed var(--text-tertiary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Precio promedio</span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `$${v.toFixed(0)}`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          {avgCost && (
            <ReferenceLine y={avgCost} stroke="var(--text-tertiary)" strokeDasharray="4 2" strokeWidth={1.5} />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={<CustomDot />}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

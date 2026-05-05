import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'

const PERIODS = [
  { id: '1A', label: '1A', days: 365 },
  { id: '2A', label: '2A', days: 730 },
  { id: '5A', label: '5A', days: 1825 },
  { id: '10A', label: '10A', days: 3650 },
]

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
          🛒 Compra: {parseFloat(data.quantity).toFixed(4)} acciones a ${parseFloat(data.purchasePrice || 0).toFixed(2)}
        </p>
      )}
    </div>
  )
}

export default function PurchaseHistoryChart({ symbol, userId }) {
  const [activePeriod, setActivePeriod] = useState('2A')
  const [priceHistory, setPriceHistory] = useState([])
  const [trades, setTrades] = useState([])
  const [avgCost, setAvgCost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [symbol, activePeriod])

  async function fetchData() {
    setLoading(true)
    const period = PERIODS.find(p => p.id === activePeriod)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - period.days)
    const fromStr = fromDate.toISOString().split('T')[0]

    try {
      const [{ data: prices }, { data: tradesData }, { data: position }] = await Promise.all([
        supabase
          .from('price_history')
          .select('date, close_price')
          .eq('asset_symbol', symbol)
          .gte('date', fromStr)
          .order('date', { ascending: true })
          .limit(4000),
        supabase
          .from('portfolio_trades')
          .select('trade_date, quantity, price')
          .eq('asset_symbol', symbol)
          .eq('user_id', userId)
          .eq('buy_sell', 'BUY')
          .gte('trade_date', fromStr)
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
      for (const trade of tradesData || []) {
        tradeMap[trade.trade_date] = trade
      }

      const chartData = (prices || []).map(row => ({
        date: row.date,
        price: parseFloat(row.close_price),
        isPurchase: !!tradeMap[row.date],
        quantity: tradeMap[row.date]?.quantity || null,
        purchasePrice: tradeMap[row.date]?.price || null,
      }))

      setPriceHistory(chartData)
      setTrades(tradesData || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const hasTrades = trades.length > 0

  if (loading) {
    return <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '12px' }} />
  }

  if (priceHistory.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '32px' }}>Sin datos de precio</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          {avgCost && (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Avg: <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${avgCost.toFixed(2)}</span>
              {!hasTrades && <span style={{ marginLeft: '6px', color: 'var(--text-tertiary)' }}>(compras fuera del período)</span>}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePeriod(p.id)}
              style={{
                background: activePeriod === p.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: activePeriod === p.id ? '#fff' : 'var(--text-tertiary)',
                border: 'none', borderRadius: '6px', padding: '4px 8px',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {hasTrades && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--positive)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Compra</span>
          </div>
          {avgCost && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '1px', borderTop: '2px dashed var(--text-tertiary)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Precio promedio</span>
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={priceHistory} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} width={50} />
          <Tooltip content={<CustomTooltip />} />
          {avgCost && <ReferenceLine y={avgCost} stroke="var(--text-tertiary)" strokeDasharray="4 2" strokeWidth={1.5} />}
          <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={<CustomDot />} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

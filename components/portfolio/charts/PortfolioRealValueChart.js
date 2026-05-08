import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

const PERIODS = ['3M', '6M', '1A', '2A', '5A']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>{payload[0]?.payload?.date}</p>
      <p style={{ color: 'var(--accent)', fontWeight: '600' }}>
        ${parseFloat(payload[0]?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export default function PortfolioRealValueChart({ userId }) {
  const [period, setPeriod] = useState('1A')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    setLoading(true)
    try {
      const days = { '3M': 90, '6M': 180, '1A': 365, '2A': 730, '5A': 1825 }[period]
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)
      const fromStr = fromDate.toISOString().split('T')[0]

      // Obtener todos los trades
      const { data: trades } = await supabase
        .from('portfolio_trades')
        .select('asset_symbol, trade_date, buy_sell, quantity')
        .eq('user_id', userId)
        .order('trade_date', { ascending: true })

      if (!trades || trades.length === 0) {
        setData([])
        setLoading(false)
        return
      }

      const symbols = [...new Set(trades.map(t => t.asset_symbol))]

      // Obtener price_history
      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('asset_symbol, date, close_price')
        .in('asset_symbol', symbols)
        .gte('date', fromStr)
        .order('date', { ascending: true })
        .limit(50000)

      // Construir mapa de precios
      const priceMap = {}
      for (const row of priceHistory || []) {
        if (!priceMap[row.date]) priceMap[row.date] = {}
        priceMap[row.date][row.asset_symbol] = parseFloat(row.close_price)
      }

      const lastKnownPrice = {}
      const allDates = [...new Set(Object.keys(priceMap))].sort()
      const chartData = []

      for (const date of allDates) {
        // Calcular posiciones acumuladas hasta este día
        const positions = {}
        for (const trade of trades) {
          if (trade.trade_date > date) continue
          if (!positions[trade.asset_symbol]) positions[trade.asset_symbol] = 0
          const qty = parseFloat(trade.quantity)
          positions[trade.asset_symbol] += trade.buy_sell === 'BUY' ? qty : -qty
        }

        // Calcular valor total
        let totalValue = 0
        let hasData = false

        for (const [symbol, qty] of Object.entries(positions)) {
          if (qty <= 0) continue
          const price = priceMap[date]?.[symbol] || lastKnownPrice[symbol]
          if (price) {
            totalValue += qty * price
            hasData = true
          }
          if (priceMap[date]?.[symbol]) lastKnownPrice[symbol] = priceMap[date][symbol]
        }

        if (hasData && totalValue > 0) {
          chartData.push({ date, value: parseFloat(totalValue.toFixed(2)) })
        }
      }

      setData(chartData)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Valor real del portfolio
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
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
        Calculado con las posiciones reales de cada día
      </p>

      {loading ? (
        <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '12px' }} />
      ) : data.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '32px' }}>
          Sin datos para este período
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`} width={45} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

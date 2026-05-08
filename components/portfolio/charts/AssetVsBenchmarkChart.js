import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts'

const BENCHMARK = 'SPY'
const PERIODS = ['1M', '3M', '6M', '1A', '2A']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>{item.symbol}</p>
      <p style={{ color: item.assetReturn >= 0 ? 'var(--positive)' : 'var(--negative)', marginBottom: '2px' }}>
        Activo: {item.assetReturn >= 0 ? '+' : ''}{item.assetReturn.toFixed(2)}%
      </p>
      <p style={{ color: 'var(--text-tertiary)' }}>
        SPY: {item.benchmarkReturn >= 0 ? '+' : ''}{item.benchmarkReturn.toFixed(2)}%
      </p>
      <p style={{ color: item.alpha >= 0 ? 'var(--positive)' : 'var(--negative)', marginTop: '4px', fontWeight: '600' }}>
        Alpha: {item.alpha >= 0 ? '+' : ''}{item.alpha.toFixed(2)}%
      </p>
    </div>
  )
}

export default function AssetVsBenchmarkChart({ positions }) {
  const [period, setPeriod] = useState('1A')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    setLoading(true)
    try {
      const days = { '1M': 30, '3M': 90, '6M': 180, '1A': 365, '2A': 730 }[period]
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

      // Agrupar por símbolo
      const bySymbol = {}
      for (const row of priceHistory || []) {
        if (!bySymbol[row.asset_symbol]) bySymbol[row.asset_symbol] = []
        bySymbol[row.asset_symbol].push(parseFloat(row.close_price))
      }

      // Calcular retorno del período para cada activo y SPY
      const spyPrices = bySymbol[BENCHMARK] || []
      const spyReturn = spyPrices.length > 1
        ? ((spyPrices[spyPrices.length - 1] - spyPrices[0]) / spyPrices[0]) * 100
        : 0

      const chartData = positions
        .map(pos => {
          const prices = bySymbol[pos.asset_symbol] || []
          const assetReturn = prices.length > 1
            ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
            : 0
          return {
            symbol: pos.asset_symbol,
            assetReturn: parseFloat(assetReturn.toFixed(2)),
            benchmarkReturn: parseFloat(spyReturn.toFixed(2)),
            alpha: parseFloat((assetReturn - spyReturn).toFixed(2)),
          }
        })
        .sort((a, b) => b.alpha - a.alpha)

      setData(chartData)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const height = Math.max(data.length * 36 + 60, 200)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          Rendimiento vs SPY
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

      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--positive)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Le ganó a SPY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--negative)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Por debajo de SPY</span>
        </div>
      </div>

      {loading ? (
        <div style={{ height: '200px', background: 'var(--bg-tertiary)', borderRadius: '12px' }} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 50, bottom: 0, left: 10 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v.toFixed(0)}%`}
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
            <Bar dataKey="alpha" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.alpha >= 0 ? 'var(--positive)' : 'var(--negative)'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

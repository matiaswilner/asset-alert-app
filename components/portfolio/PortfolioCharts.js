import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Card from '../ui/Card'
import PortfolioPieChart from './charts/PieChart'
import PortfolioLineChart from './charts/PortfolioLineChart'
import PurchaseHistoryChart from './charts/PurchaseHistoryChart'
import PurchaseTimelineChart from './charts/PurchaseTimelineChart'
import { groupBySector, SECTOR_COLORS } from '../../lib/portfolio/sectors'

const TYPE_COLORS = {
  stock: '#6366f1',
  etf: '#10b981',
  crypto: '#f59e0b',
  other: '#6b7280',
}

const CHART_TABS = [
  { id: 'allocation', label: 'Distribución' },
  { id: 'performance', label: 'Performance' },
  { id: 'purchases', label: 'Compras' },
]

export default function PortfolioCharts({ positions, userId }) {
  const [activeTab, setActiveTab] = useState('allocation')
  const [trades, setTrades] = useState([])
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const [tradesLoading, setTradesLoading] = useState(true)

  useEffect(() => {
    fetchTrades()
    if (positions?.length > 0) {
      setSelectedSymbol(positions[0].asset_symbol)
    }
  }, [])

  async function fetchTrades() {
    setTradesLoading(true)
    const { data } = await supabase
      .from('portfolio_trades')
      .select('*')
      .eq('user_id', userId)
      .order('trade_date', { ascending: true })
    setTrades(data || [])
    setTradesLoading(false)
  }

  // Datos para pie charts
  const assetData = positions?.map(p => ({
    name: p.asset_symbol,
    weight: parseFloat(p.weight_pct),
    value: parseFloat(p.market_value),
  })) || []

  const assetColors = {}
  assetData.forEach((item, i) => {
    const hue = (i * 37) % 360
    assetColors[item.name] = `hsl(${hue}, 65%, 55%)`
  })

  const typeGroups = {}
  for (const pos of positions || []) {
    const type = pos.asset_type || 'other'
    if (!typeGroups[type]) typeGroups[type] = { name: type, weight: 0, value: 0 }
    typeGroups[type].weight += parseFloat(pos.weight_pct || 0)
    typeGroups[type].value += parseFloat(pos.market_value || 0)
  }
  const typeData = Object.values(typeGroups).map(t => ({
    name: t.name.charAt(0).toUpperCase() + t.name.slice(1),
    weight: parseFloat(t.weight.toFixed(2)),
    value: t.value,
  }))
  const typeColors = {}
  typeData.forEach(t => {
    typeColors[t.name] = TYPE_COLORS[t.name.toLowerCase()] || TYPE_COLORS.other
  })

  const sectorGroups = groupBySector(positions || [])
  const totalValue = positions?.reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0) || 1
  const sectorData = sectorGroups.map(s => ({
    name: s.sector,
    weight: parseFloat(((s.value / totalValue) * 100).toFixed(2)),
    value: s.value,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {CHART_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-secondary)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-tertiary)',
              border: 'none', borderRadius: '8px', padding: '6px 14px',
              fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Distribución */}
      {activeTab === 'allocation' && (
        <>
          <Card>
            <PortfolioPieChart
              data={assetData}
              colors={assetColors}
              title="Por activo"
            />
          </Card>
          <Card>
            <PortfolioPieChart
              data={typeData}
              colors={typeColors}
              title="Por tipo"
            />
          </Card>
          <Card>
            <PortfolioPieChart
              data={sectorData}
              colors={SECTOR_COLORS}
              title="Por sector"
            />
          </Card>
        </>
      )}

      {/* Performance */}
      {activeTab === 'performance' && (
        <Card>
          <PortfolioLineChart userId={userId} />
        </Card>
      )}

      {/* Compras */}
      {activeTab === 'purchases' && (
        <>
          <Card>
            <PurchaseTimelineChart trades={trades} />
          </Card>

          <Card>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Historial por activo
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {positions?.map(pos => (
                  <button
                    key={pos.asset_symbol}
                    onClick={() => setSelectedSymbol(pos.asset_symbol)}
                    style={{
                      background: selectedSymbol === pos.asset_symbol ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: selectedSymbol === pos.asset_symbol ? '#fff' : 'var(--text-tertiary)',
                      border: 'none', borderRadius: '6px', padding: '4px 10px',
                      fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    {pos.asset_symbol}
                  </button>
                ))}
              </div>
            </div>
            {selectedSymbol && (
              <PurchaseHistoryChart symbol={selectedSymbol} userId={userId} />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

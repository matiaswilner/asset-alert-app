import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Card from '../ui/Card'
import InfoTooltip from '../ui/InfoTooltip'
import PortfolioPieChart from './charts/PieChart'
import PortfolioLineChart from './charts/PortfolioLineChart'
import PurchaseHistoryChart from './charts/PurchaseHistoryChart'
import PurchaseTimelineChart from './charts/PurchaseTimelineChart'
import PortfolioSummaryCards from './charts/PortfolioSummaryCards'
import PnLChart from './charts/PnLChart'
import AssetVsBenchmarkChart from './charts/AssetVsBenchmarkChart'
import ConcentrationGauge from './charts/ConcentrationGauge'
import CorrelationChart from './charts/CorrelationChart'
import PortfolioRealValueChart from './charts/PortfolioRealValueChart'
import { groupBySector, SECTOR_COLORS } from '../../lib/portfolio/sectors'

const TYPE_COLORS = {
  stock: '#6366f1',
  etf: '#10b981',
  crypto: '#f59e0b',
  other: '#6b7280',
}

const CHART_TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'allocation', label: 'Distribución' },
  { id: 'performance', label: 'Performance' },
  { id: 'risk', label: 'Riesgo' },
  { id: 'purchases', label: 'Compras' },
]

const TOOLTIPS = {
  pnlTotal: "Muestra cuánto ganaste o perdiste desde que compraste cada activo, comparando el precio al que compraste con el precio actual. Es una ganancia 'no realizada' porque todavía no vendiste.",
  winnersLosers: "Muestra cuántas de tus posiciones están en ganancia y cuántas en pérdida, y qué porcentaje del portfolio representan cada grupo.",
  pnlByAsset: "Muestra la ganancia o pérdida de cada activo individualmente, ordenado de mayor a menor. Te permite ver de un vistazo qué posiciones están funcionando bien y cuáles no.",
  byAsset: "Muestra qué porcentaje del total de tu portfolio representa cada activo. Un activo con mucho peso tiene más impacto en tu performance general.",
  byType: "Divide tu portfolio entre stocks (acciones de empresas), ETFs (fondos que agrupan muchos activos) y crypto. Te ayuda a ver si estás diversificado entre distintos tipos de instrumentos.",
  bySector: "Agrupa tus activos según la industria a la que pertenecen. Una buena diversificación implica no tener todo el capital en un solo sector como tecnología o energía.",
  returnVsBenchmark: "Compara cómo rindió tu portfolio contra un índice de referencia como el S&P 500. Ambas líneas arrancan en 100 — si tu portfolio llega a 115 y el SPY a 108, le ganaste al mercado en ese período.",
  totalValue: "Muestra la evolución del valor de tu portfolio usando tus posiciones actuales aplicadas a precios históricos. Es una aproximación visual de cómo habría evolucionado.",
  realValue: "Calcula el valor exacto de tu portfolio en cada momento usando las posiciones reales que tenías ese día — considera cuándo compraste cada activo. Es el cálculo más preciso.",
  assetVsBenchmark: "Muestra cuánto rindió cada activo por encima o por debajo del S&P 500 en el período seleccionado. Las barras verdes le ganaron al mercado, las rojas quedaron por debajo.",
  concentration: "Mide el riesgo de tener demasiado peso en pocas posiciones. Si un solo activo representa el 30% de tu portfolio y cae 20%, tu portfolio total cae 6% solo por ese activo.",
  correlation: "Mide qué tan parecido se mueve cada activo al S&P 500. Una correlación alta (cercana a 1) significa que el activo sube y baja casi igual que el mercado. Una correlación baja indica más independencia.",
  capitalDeployed: "Muestra cuánto dinero invertiste en cada mes, trimestre o año. Te ayuda a ver si seguís una estrategia consistente de inversión gradual.",
  purchaseHistory: "Muestra el precio histórico de un activo con marcadores verdes en cada fecha en que compraste. La línea punteada es tu precio promedio de compra — si el precio actual está por encima, estás en ganancia.",
  totalValueApprox: "Muestra la evolución del valor de tu portfolio usando tus posiciones actuales aplicadas a precios históricos. Es una aproximación — no considera cuándo compraste cada activo, solo cuántos tenés hoy.",
  realValueExact: "Calcula el valor exacto de tu portfolio en cada momento usando las posiciones reales que tenías ese día. A diferencia del 'Valor total aproximado', este sí considera cuándo compraste cada activo — si compraste SPY en marzo, antes de esa fecha no aparece en el cálculo.",
}

function ChartTitle({ title, tooltipKey }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{title}</p>
      <InfoTooltip text={TOOLTIPS[tooltipKey]} />
    </div>
  )
}

export default function PortfolioCharts({ positions, userId }) {
  const [activeTab, setActiveTab] = useState('summary')
  const [trades, setTrades] = useState([])
  const [selectedSymbol, setSelectedSymbol] = useState(null)

  useEffect(() => {
    fetchTrades()
    if (positions?.length > 0) setSelectedSymbol(positions[0].asset_symbol)
  }, [])

  async function fetchTrades() {
    const { data } = await supabase
      .from('portfolio_trades')
      .select('*')
      .eq('user_id', userId)
      .order('trade_date', { ascending: true })
    setTrades(data || [])
  }

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

      {/* Resumen */}
      {activeTab === 'summary' && (
        <>
          <PortfolioSummaryCards positions={positions} />
          <Card>
            <ChartTitle title="P&L por activo" tooltipKey="pnlByAsset" />
            <PnLChart positions={positions} />
          </Card>
        </>
      )}

      {/* Distribución */}
      {activeTab === 'allocation' && (
        <>
          <Card>
            <ChartTitle title="Por activo" tooltipKey="byAsset" />
            <PortfolioPieChart data={assetData} colors={assetColors} />
          </Card>
          <Card>
            <ChartTitle title="Por tipo" tooltipKey="byType" />
            <PortfolioPieChart data={typeData} colors={typeColors} />
          </Card>
          <Card>
            <ChartTitle title="Por sector" tooltipKey="bySector" />
            <PortfolioPieChart data={sectorData} colors={SECTOR_COLORS} />
          </Card>
        </>
      )}

      {/* Performance */}
      {activeTab === 'performance' && (
        <>
          <Card>
            <ChartTitle title="Retorno vs benchmark" tooltipKey="returnVsBenchmark" />
            <PortfolioLineChart userId={userId} showOnlyReturns />
          </Card>
          <Card>
            <ChartTitle title="Valor total del portfolio (aproximado)" tooltipKey="totalValueApprox" />
            <PortfolioLineChart userId={userId} showOnlyValue />
          </Card>
          <Card>
            <ChartTitle title="Valor real del portfolio" tooltipKey="realValueExact" />
            <PortfolioRealValueChart userId={userId} />
          </Card>
          <Card>
            <ChartTitle title="Rendimiento vs SPY por activo" tooltipKey="assetVsBenchmark" />
            <AssetVsBenchmarkChart positions={positions} />
          </Card>
        </>
      )}

      {/* Riesgo */}
      {activeTab === 'risk' && (
        <>
          <Card>
            <ChartTitle title="Índice de concentración" tooltipKey="concentration" />
            <ConcentrationGauge positions={positions} />
          </Card>
          <Card>
            <ChartTitle title="Correlación con SPY" tooltipKey="correlation" />
            <CorrelationChart positions={positions} />
          </Card>
        </>
      )}

      {/* Compras */}
      {activeTab === 'purchases' && (
        <>
          <Card>
            <ChartTitle title="Capital desplegado" tooltipKey="capitalDeployed" />
            <PurchaseTimelineChart trades={trades} />
          </Card>
          <Card>
            <ChartTitle title="Historial por activo" tooltipKey="purchaseHistory" />
            <div style={{ marginBottom: '12px' }}>
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
            {selectedSymbol && <PurchaseHistoryChart symbol={selectedSymbol} userId={userId} />}
          </Card>
        </>
      )}
    </div>
  )
}

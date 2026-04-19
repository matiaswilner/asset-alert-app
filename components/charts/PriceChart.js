import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

const PERIODS = [
  { id: '1D', label: '1D', days: 1 },
  { id: '3D', label: '3D', days: 3 },
  { id: '1S', label: '1S', days: 7 },
  { id: '14D', label: '14D', days: 14 },
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '6M', label: '6M', days: 180 },
  { id: '1A', label: '1A', days: 365 },
  { id: '2A', label: '2A', days: 730 },
]

const CHART_TYPES = [
  { id: 'spy', label: 'vs SPY' },
  { id: 'average', label: 'Promedio' },
  { id: 'analyses', label: 'Análisis' },
  { id: 'buy', label: 'Compra' },
]

function formatDate(dateStr, days) {
  const date = new Date(dateStr)
  if (days <= 90) return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`
}

function getChangeColor(change) {
  if (change > 0) return 'var(--positive)'
  if (change < 0) return 'var(--negative)'
  return 'var(--text-secondary)'
}

export default function PriceChart({ symbol, assetType, analyses }) {
  const safeAnalyses = Array.isArray(analyses) ? analyses : []
  const [activePeriod, setActivePeriod] = useState('1M')
  const [activeChartType, setActiveChartType] = useState('spy')
  const [data, setData] = useState([])
  const [spyData, setSpyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  const isSPY = symbol === 'SPY'

  useEffect(() => {
    fetchData()
  }, [activePeriod, symbol])

  async function fetchData() {
    setLoading(true)
    const period = PERIODS.find(p => p.id === activePeriod)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - period.days)
    const fromStr = fromDate.toISOString().split('T')[0]

    const { data: rows } = await supabase
      .from('price_history')
      .select('date, close_price')
      .eq('asset_symbol', symbol)
      .gte('date', fromStr)
      .order('date', { ascending: true })

    if (!isSPY) {
      const { data: spyRows } = await supabase
        .from('price_history')
        .select('date, close_price')
        .eq('asset_symbol', 'SPY')
        .gte('date', fromStr)
        .order('date', { ascending: true })
      setSpyData(spyRows || [])
    }

    const prices = rows || []
    setData(prices)

    if (prices.length > 0) {
      const closes = prices.map(r => parseFloat(r.close_price))
      const min = Math.min(...closes)
      const max = Math.max(...closes)
      const avg = closes.reduce((a, b) => a + b, 0) / closes.length
      const first = closes[0]
      const last = closes[closes.length - 1]
      const change = ((last - first) / first) * 100
      const p20 = min + (max - min) * 0.2
      const p80 = min + (max - min) * 0.8
      setStats({ min, max, avg, change, last, p20, p80 })
    }

    setLoading(false)
  }

  function buildChartData() {
    if (!data.length) return []

    const firstPrice = parseFloat(data[0].close_price)
    const spyMap = {}
    if (spyData.length) {
      const firstSpy = parseFloat(spyData[0].close_price)
      spyData.forEach(r => {
        spyMap[r.date] = (parseFloat(r.close_price) / firstSpy) * 100
      })
    }

    return data.map(row => {
      const close = parseFloat(row.close_price)
      const normalized = (close / firstPrice) * 100
      const analysisOnDate = safeAnalyses.find(a => {
        if (!a.created_at) return false
        const d = new Date(a.created_at)
        const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString().split('T')[0]
        return localDate === row.date
      })
      return {
        date: row.date,
        price: close,
        normalized,
        spy: spyMap[row.date] || null,
        hasAnalysis: !!analysisOnDate,
        analysisSummary: analysisOnDate?.summary || null,
      }
    })
  }

  const chartData = buildChartData()
  const period = PERIODS.find(p => p.id === activePeriod)

  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    if (!payload.hasAnalysis) return null
    return <circle cx={cx} cy={cy} r={5} fill="var(--accent)" stroke="var(--bg-card)" strokeWidth={2} />
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>{payload[0]?.payload?.date}</p>
        <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formatPrice(payload[0]?.payload?.price)}</p>
        {payload[0]?.payload?.analysisSummary && (
          <p style={{ color: 'var(--accent)', marginTop: '4px', maxWidth: '160px', lineHeight: '1.4' }}>
            🧠 {payload[

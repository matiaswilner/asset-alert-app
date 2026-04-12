import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const CONDITIONS = {
  drop_day: 'Cae % en un día',
  drop_week: 'Cae % en una semana',
  rise_day: 'Sube % en un día',
  rise_week: 'Sube % en una semana',
  min_14d: 'Mínimo 14 días',
  min_30d: 'Mínimo 30 días',
  min_60d: 'Mínimo 60 días',
  min_90d: 'Mínimo 90 días',
  min_180d: 'Mínimo 180 días',
}

const MIN_CONDITIONS = ['min_14d', 'min_30d', 'min_60d', 'min_90d', 'min_180d']

const EMPTY_FORM = { asset_symbol: '', asset_type: 'stock', condition: 'drop_day', threshold_percent: '' }
const EMPTY_WATCHLIST_FORM = { asset_symbol: '', asset_type: 'etf' }

function getScoreColor(score) {
  if (score >= 2) return 'var(--positive)'
  if (score >= 0) return 'var(--warning)'
  return 'var(--negative)'
}

function getScoreLabel(score) {
  if (score >= 4) return 'COMPRAR'
  if (score >= 2) return 'COMPRAR GRADUALMENTE'
  if (score >= 1) return 'CONSIDERAR'
  if (score === 0) return 'NEUTRAL'
  if (score >= -1) return 'PRECAUCIÓN'
  if (score >= -3) return 'ESPERAR'
  return 'EVITAR'
}

function getConfidenceLabel(c) {
  if (c >= 75) return 'Señal clara'
  if (c >= 50) return 'Señal moderada'
  if (c >= 25) return 'Señal débil'
  return 'Muy incierto'
}

function getChangeColor(change) {
  if (change > 0) return 'var(--positive)'
  if (change < 0) return 'var(--negative)'
  return 'var(--text-secondary)'
}

function ScoreBar({ score }) {
  const pct = ((score + 5) / 10) * 100
  const color = getScoreColor(score)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>-5</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color }}>{score > 0 ? `+${score}` : score} — {getScoreLabel(score)}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>+5</span>
      </div>
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function Badge({ label, color = 'var(--accent)', bg = 'var(--accent-dim)' }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: '600', color, background: bg, padding: '3px 8px', borderRadius: '999px', letterSpacing: '0.03em' }}>
      {label}
    </span>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', ...style }}>
      {children}
    </div>
  )
}

function Input({ style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '12px 14px',
        color: 'var(--text-primary)',
        fontSize: '15px',
        width: '100%',
        outline: 'none',
        ...style,
      }}
    />
  )
}

function Select({ children, style = {}, ...props }) {
  return (
    <select
      {...props}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '12px 14px',
        color: 'var(--text-primary)',
        fontSize: '15px',
        width: '100%',
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </select>
  )
}

function Button({ children, variant = 'primary', style = {}, ...props }) {
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    danger: { background: 'var(--negative-dim)', color: 'var(--negative)' },
    warning: { background: 'var(--warning-dim)', color: 'var(--warning)' },
    success: { background: 'var(--positive-dim)', color: 'var(--positive)' },
    ghost: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
    purple: { background: 'var(--accent-dim)', color: 'var(--accent)' },
  }
  return (
    <button
      {...props}
      style={{
        ...variants[variant],
        border: 'none',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function AnalysisCard({ a }) {
  const [expanded, setExpanded] = useState(false)
  const triggeredColors = {
    automatic: { color: 'var(--warning)', bg: 'var(--warning-dim)', label: '⚡ Auto' },
    manual: { color: 'var(--accent)', bg: 'var(--accent-dim)', label: '👆 Manual' },
    smart_alert: { color: 'var(--positive)', bg: 'var(--positive-dim)', label: '🧠 Smart' },
  }
  const t = triggeredColors[a.triggered_by] || triggeredColors.automatic
  const recColor = a.recommendation?.includes('BUY') ? 'var(--positive)' :
                   a.recommendation?.includes('WAIT') ? 'var(--negative)' : 'var(--warning)'

  return (
    <Card style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Badge label={t.label} color={t.color} bg={t.bg} />
          <Badge label={a.context} />
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {new Date(a.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>{a.summary}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: recColor }}>
          {a.recommendation}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{expanded ? '▲ menos' : '▼ más'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🧠 Por qué</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{a.explanation}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📈 Interpretación</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{a.interpretation}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📊 Score</p>
            <ScoreBar score={a.score ?? 0} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔎 Confianza</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.confidence}% — {getConfidenceLabel(a.confidence ?? 0)}</span>
          </div>
          {a.prompt_version && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Prompt {a.prompt_version}</span>
          )}
        </div>
      )}
    </Card>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</p>
      <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>{subtitle}</p>
    </div>
  )
}

export default function Home() {
  const [alerts, setAlerts] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [prices, setPrices] = useState({})
  const [notifications, setNotifications] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [watchlistForm, setWatchlistForm] = useState(EMPTY_WATCHLIST_FORM)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState('idle')
  const [analyzingSymbol, setAnalyzingSymbol] = useState(null)
  const [activeTab, setActiveTab] = useState('alerts')
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [showWatchlistForm, setShowWatchlistForm] = useState(false)

  useEffect(() => {
    const tab = window.location.pathname === '/notifications' ? 'notifications' : 'alerts'
    setActiveTab(tab)
    fetchAll()
  }, [])

  async function fetchAll() {
    await Promise.all([fetchAlerts(), fetchAnalyses(), fetchWatchlist(), fetchNotifications(), fetchPrices()])
    setLoading(false)
  }

  async function fetchAlerts() {
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false })
    setAlerts(data || [])
  }

  async function fetchAnalyses() {
    const { data } = await supabase.from('alert_analyses').select('*').order('created_at', { ascending: false })
    setAnalyses(data || [])
  }

  async function fetchWatchlist() {
    const { data } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false })
    setWatchlist(data || [])
  }

  async function fetchNotifications() {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])
  }

  async function fetchPrices() {
    const { data } = await supabase.from('asset_prices').select('*')
    const map = {}
    for (const p of data || []) map[p.asset_symbol] = p
    setPrices(map)
  }

  async function createAlert() {
    if (!form.asset_symbol) return
    if (!MIN_CONDITIONS.includes(form.condition) && !form.threshold_percent) return
    await supabase.from('alerts').insert([{
      ...form,
      asset_symbol: form.asset_symbol.toUpperCase(),
      threshold_percent: form.threshold_percent ? parseFloat(form.threshold_percent) : null,
    }])
    setForm(EMPTY_FORM)
    setShowAlertForm(false)
    fetchAlerts()
  }

  async function deleteAlert(id) {
    await supabase.from('alerts').delete().eq('id', id)
    fetchAlerts()
  }

  async function toggleAlert(id, current) {
    await supabase.from('alerts').update({ is_active: !current }).eq('id', id)
    fetchAlerts()
  }

  function startEdit(alert) {
    setEditingId(alert.id)
    setEditForm({ asset_symbol: alert.asset_symbol, asset_type: alert.asset_type, condition: alert.condition, threshold_percent: alert.threshold_percent })
  }

  async function saveEdit(id) {
    await supabase.from('alerts').update({
      ...editForm,
      asset_symbol: editForm.asset_symbol.toUpperCase(),
      threshold_percent: editForm.threshold_percent ? parseFloat(editForm.threshold_percent) : null,
    }).eq('id', id)
    setEditingId(null)
    fetchAlerts()
  }

  async function addToWatchlist() {
    if (!watchlistForm.asset_symbol) return
    await supabase.from('watchlist').insert([{
      asset_symbol: watchlistForm.asset_symbol.toUpperCase(),
      asset_type: watchlistForm.asset_type,
    }])
    setWatchlistForm(EMPTY_WATCHLIST_FORM)
    setShowWatchlistForm(false)
    fetchWatchlist()
  }

  async function removeFromWatchlist(id) {
    await supabase.from('watchlist').delete().eq('id', id)
    fetchWatchlist()
  }

  async function toggleWatchlistItem(id, current) {
    await supabase.from('watchlist').update({ is_active: !current }).eq('id', id)
    fetchWatchlist()
  }

  async function activateNotifications() {
    try {
      setNotifStatus('loading')
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifStatus('denied'); return }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const sub = subscription.toJSON()
      await fetch('/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      setNotifStatus('active')
    } catch (err) {
      setNotifStatus('error:' + err.message)
    }
  }

  async function analyzeManually(alert) {
    setAnalyzingSymbol(alert.asset_symbol)
    try {
      const timeframe = alert.condition.includes('day') ? '1 day' :
                        alert.condition.includes('week') ? '1 week' :
                        alert.condition.replace('min_', '').replace('d', ' days')
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: alert.asset_symbol, assetType: alert.asset_type, priceChange: 'manual request', timeframe, alertId: alert.id, triggeredBy: 'manual' }),
      })
      await fetchAnalyses()
      setActiveTab('analyses')
    } catch (err) { console.error(err) }
    setAnalyzingSymbol(null)
  }

  const groupedAnalyses = analyses.reduce((acc, a) => {
    if (!acc[a.asset_symbol]) acc[a.asset_symbol] = []
    acc[a.asset_symbol].push(a)
    return acc
  }, {})

  const tabs = [
    { id: 'alerts', label: 'Alertas', icon: '🔔' },
    { id: 'watchlist', label: 'Watchlist', icon: '👁' },
    { id: 'analyses', label: 'Análisis', icon: '🧠' },
    { id: 'notifications', label: 'Historial', icon: '📋' },
  ]

  const notifConfig = {
    idle: { label: '🔔 Activar notificaciones', bg: 'var(--accent)' },
    loading: { label: 'Activando...', bg: 'var(--bg-tertiary)' },
    active: { label: '✅ Notificaciones activas', bg: 'var(--positive-dim)', color: 'var(--positive)' },
    denied: { label: '❌ Permiso denegado', bg: 'var(--negative-dim)', color: 'var(--negative)' },
  }
  const nc = notifStatus.startsWith('error') ? { label: '⚠️ Error', bg: 'var(--warning-dim)', color: 'var(--warning)' } : (notifConfig[notifStatus] || notifConfig.idle)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando Assetic...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>Assetic</h1>
        <button
          onClick={activateNotifications}
          disabled={notifStatus === 'loading' || notifStatus === 'active'}
          style={{ background: nc.bg, color: nc.color || '#fff', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
        >
          {nc.label}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Alertas</h2>
              <Button onClick={() => setShowAlertForm(!showAlertForm)} variant="purple">
                {showAlertForm ? '✕ Cerrar' : '+ Nueva'}
              </Button>
            </div>

            {showAlertForm && (
              <Card style={{ marginBottom: '16px', border: '1px solid var(--border-accent)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input
                    placeholder="Símbolo (ej: AAPL, BTC)"
                    value={form.asset_symbol}
                    onChange={e => setForm({ ...form, asset_symbol: e.target.value.toUpperCase() })}
                  />
                  <Select value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })}>
                    <option value="stock">Stock</option>
                    <option value="etf">ETF</option>
                    <option value="crypto">Crypto</option>
                  </Select>
                  <Select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                    {Object.entries(CONDITIONS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                  {!MIN_CONDITIONS.includes(form.condition) && (
                    <Input
                      type="number"
                      placeholder="Porcentaje (ej: 5)"
                      value={form.threshold_percent}
                      onChange={e => setForm({ ...form, threshold_percent: e.target.value })}
                    />
                  )}
                  <Button onClick={createAlert} style={{ width: '100%', padding: '12px' }}>Crear alerta</Button>
                </div>
              </Card>
            )}

            {alerts.length === 0 ? (
              <EmptyState icon="🔔" title="Sin alertas" subtitle="Creá tu primera alerta de precio" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alerts.map(alert => (
                  <Card key={alert.id} style={{ opacity: alert.is_active ? 1 : 0.5 }}>
                    {editingId === alert.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Input value={editForm.asset_symbol} onChange={e => setEditForm({ ...editForm, asset_symbol: e.target.value.toUpperCase() })} />
                        <Select value={editForm.asset_type} onChange={e => setEditForm({ ...editForm, asset_type: e.target.value })}>
                          <option value="stock">Stock</option>
                          <option value="etf">ETF</option>
                          <option value="crypto">Crypto</option>
                        </Select>
                        <Select value={editForm.condition} onChange={e => setEditForm({ ...editForm, condition: e.target.value })}>
                          {Object.entries(CONDITIONS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </Select>
                        {!MIN_CONDITIONS.includes(editForm.condition) && (
                          <Input type="number" value={editForm.threshold_percent} onChange={e => setEditForm({ ...editForm, threshold_percent: e.target.value })} />
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button onClick={() => saveEdit(alert.id)} style={{ flex: 1 }}>Guardar</Button>
                          <Button onClick={() => setEditingId(null)} variant="ghost" style={{ flex: 1 }}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <span style={{ fontSize: '18px', fontWeight: '700' }}>{alert.asset_symbol}</span>
                            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{alert.asset_type}</span>
                          </div>
                          <Badge label={alert.is_active ? 'Activa' : 'Pausada'} color={alert.is_active ? 'var(--positive)' : 'var(--text-tertiary)'} bg={alert.is_active ? 'var(--positive-dim)' : 'var(--bg-tertiary)'} />
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                          {CONDITIONS[alert.condition]} {alert.threshold_percent ? `${alert.threshold_percent}%` : ''}
                        </p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <Button onClick={() => analyzeManually(alert)} disabled={analyzingSymbol === alert.asset_symbol} variant="purple" style={{ fontSize: '12px', padding: '8px 12px' }}>
                            {analyzingSymbol === alert.asset_symbol ? '...' : '🧠 Analizar'}
                          </Button>
                          <Button onClick={() => toggleAlert(alert.id, alert.is_active)} variant={alert.is_active ? 'warning' : 'success'} style={{ fontSize: '12px', padding: '8px 12px' }}>
                            {alert.is_active ? 'Pausar' : 'Activar'}
                          </Button>
                          <Button onClick={() => startEdit(alert)} variant="ghost" style={{ fontSize: '12px', padding: '8px 12px' }}>Editar</Button>
                          <Button onClick={() => deleteAlert(alert.id)} variant="danger" style={{ fontSize: '12px', padding: '8px 12px' }}>Eliminar</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Watchlist</h2>
              <Button onClick={() => setShowWatchlistForm(!showWatchlistForm)} variant="purple">
                {showWatchlistForm ? '✕ Cerrar' : '+ Agregar'}
              </Button>
            </div>

            {showWatchlistForm && (
              <Card style={{ marginBottom: '16px', border: '1px solid var(--border-accent)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input
                    placeholder="Símbolo (ej: SPY, QQQ)"
                    value={watchlistForm.asset_symbol}
                    onChange={e => setWatchlistForm({ ...watchlistForm, asset_symbol: e.target.value.toUpperCase() })}
                  />
                  <Select value={watchlistForm.asset_type} onChange={e => setWatchlistForm({ ...watchlistForm, asset_type: e.target.value })}>
                    <option value="etf">ETF</option>
                    <option value="stock">Stock</option>
                    <option value="crypto">Crypto</option>
                  </Select>
                  <Button onClick={addToWatchlist} style={{ width: '100%', padding: '12px' }}>Agregar</Button>
                </div>
              </Card>
            )}

            {watchlist.length === 0 ? (
              <EmptyState icon="👁" title="Watchlist vacía" subtitle="Agregá activos para monitorear con Smart Alerts" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {watchlist.map(item => {
                  const price = prices[item.asset_symbol]
                  return (
                    <Card key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '700' }}>{item.asset_symbol}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{item.asset_type}</span>
                          </div>
                          {price ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <span style={{ fontSize: '20px', fontWeight: '700' }}>${parseFloat(price.current_price).toFixed(2)}</span>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: getChangeColor(price.change_day) }}>
                                {price.change_day > 0 ? '+' : ''}{parseFloat(price.change_day).toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin datos aún</span>
                          )}
                          {price && (
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              Actualizado {new Date(price.updated_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                          <Badge label={item.is_active ? '🧠 Smart Alert' : 'Pausado'} color={item.is_active ? 'var(--positive)' : 'var(--text-tertiary)'} bg={item.is_active ? 'var(--positive-dim)' : 'var(--bg-tertiary)'} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button onClick={() => toggleWatchlistItem(item.id, item.is_active)} variant={item.is_active ? 'warning' : 'success'} style={{ fontSize: '12px', padding: '6px 10px' }}>
                              {item.is_active ? 'Pausar' : 'Activar'}
                            </Button>
                            <Button onClick={() => removeFromWatchlist(item.id)} variant="danger" style={{ fontSize: '12px', padding: '6px 10px' }}>Quitar</Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Analyses Tab */}
        {activeTab === 'analyses' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Análisis</h2>
            {Object.keys(groupedAnalyses).length === 0 ? (
              <EmptyState icon="🧠" title="Sin análisis" subtitle="Los análisis aparecen cuando se dispara una alerta o lo solicitás manualmente" />
            ) : (
              Object.entries(groupedAnalyses).map(([symbol, items]) => (
                <div key={symbol} style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>{symbol}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map(a => <AnalysisCard key={a.id} a={a} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Historial</h2>
            {notifications.length === 0 ? (
              <EmptyState icon="📋" title="Sin notificaciones" subtitle="Las notificaciones recibidas aparecerán acá" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map(n => {
                  const triggeredColors = {
                    automatic: { color: 'var(--warning)', bg: 'var(--warning-dim)', label: '⚡ Auto' },
                    manual: { color: 'var(--accent)', bg: 'var(--accent-dim)', label: '👆 Manual' },
                    smart_alert: { color: 'var(--positive)', bg: 'var(--positive-dim)', label: '🧠 Smart' },
                  }
                  const t = triggeredColors[n.triggered_by] || triggeredColors.automatic
                  return (
                    <Card key={n.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {n.asset_symbol && <span style={{ fontSize: '15px', fontWeight: '700' }}>{n.asset_symbol}</span>}
                          <Badge label={t.label} color={t.color} bg={t.bg} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {new Date(n.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{n.title}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{n.body}</p>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(13, 13, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)', letterSpacing: '0.03em' }}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

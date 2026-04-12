import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const CONDITIONS = {
  drop_day: 'Cae % en un día',
  drop_week: 'Cae % en una semana',
  rise_day: 'Sube % en un día',
  rise_week: 'Sube % en una semana',
  min_14d: 'Mínimo de 14 días',
  min_30d: 'Mínimo de 30 días',
  min_60d: 'Mínimo de 60 días',
  min_90d: 'Mínimo de 90 días',
  min_180d: 'Mínimo de 180 días',
}

const MIN_CONDITIONS = ['min_14d', 'min_30d', 'min_60d', 'min_90d', 'min_180d']

const EMPTY_FORM = {
  asset_symbol: '',
  asset_type: 'stock',
  condition: 'drop_day',
  threshold_percent: '',
}

const EMPTY_WATCHLIST_FORM = {
  asset_symbol: '',
  asset_type: 'etf',
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

function getScoreColor(score) {
  if (score >= 2) return '#16a34a'
  if (score >= 0) return '#d97706'
  return '#dc2626'
}

function getConfidenceLabel(confidence) {
  if (confidence >= 75) return 'Señal clara'
  if (confidence >= 50) return 'Señal moderadamente clara'
  if (confidence >= 25) return 'Señal débil'
  return 'Señal muy incierta'
}

function ScoreBar({ score }) {
  const pct = ((score + 5) / 10) * 100
  const color = getScoreColor(score)
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>-5</span>
        <span style={{ fontWeight: '500', color }}>{score > 0 ? `+${score}` : score} — {getScoreLabel(score)}</span>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>+5</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '999px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function AnalysisCard({ a }) {
  const triggeredLabel = {
    automatic: '⚡ Automático',
    manual: '👆 Manual',
    smart_alert: '🧠 Smart Alert',
  }[a.triggered_by] || a.triggered_by

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#999' }}>{new Date(a.created_at).toLocaleString('es-AR')}</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '0.1rem 0.5rem', borderRadius: '4px', color: '#444' }}>{a.context}</span>
          <span style={{ fontSize: '0.75rem', background: '#f0f9ff', padding: '0.1rem 0.5rem', borderRadius: '4px', color: '#0369a1' }}>{triggeredLabel}</span>
        </div>
      </div>
      <p style={{ marginBottom: '0.6rem' }}><strong>📊 Qué pasó:</strong> {a.summary}</p>
      <p style={{ marginBottom: '0.6rem' }}><strong>🧠 Por qué:</strong> {a.explanation}</p>
      <p style={{ marginBottom: '0.6rem' }}><strong>🌍 Contexto:</strong> {a.context}</p>
      <p style={{ marginBottom: '0.6rem' }}><strong>📈 Interpretación:</strong> {a.interpretation}</p>
      <p style={{ marginBottom: '0.75rem' }}><strong>💡 Recomendación:</strong> {a.recommendation}</p>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.5rem' }}>
        <p style={{ marginBottom: '0.4rem' }}><strong>📊 Score:</strong></p>
        <ScoreBar score={a.score ?? 0} />
      </div>
      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
        <strong>🔎 Confianza:</strong> {a.confidence}% — {getConfidenceLabel(a.confidence ?? 0)}
      </p>
    </div>
  )
}

export default function Home() {
  const [alerts, setAlerts] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [watchlistForm, setWatchlistForm] = useState(EMPTY_WATCHLIST_FORM)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState('idle')
  const [analyzingSymbol, setAnalyzingSymbol] = useState(null)
  const [activeTab, setActiveTab] = useState('alerts')

  useEffect(() => {
    fetchAlerts()
    fetchAnalyses()
    fetchWatchlist()
  }, [])

  async function fetchAlerts() {
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false })
    setAlerts(data || [])
    setLoading(false)
  }

  async function fetchAnalyses() {
    const { data } = await supabase.from('alert_analyses').select('*').order('created_at', { ascending: false })
    setAnalyses(data || [])
  }

  async function fetchWatchlist() {
    const { data } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false })
    setWatchlist(data || [])
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
    setEditForm({
      asset_symbol: alert.asset_symbol,
      asset_type: alert.asset_type,
      condition: alert.condition,
      threshold_percent: alert.threshold_percent,
    })
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
        body: JSON.stringify({
          symbol: alert.asset_symbol,
          assetType: alert.asset_type,
          priceChange: 'manual request',
          timeframe,
          alertId: alert.id,
          triggeredBy: 'manual',
        }),
      })
      await fetchAnalyses()
      setActiveTab('analyses')
    } catch (err) {
      console.error(err)
    }
    setAnalyzingSymbol(null)
  }

  const notifLabels = {
    idle: { label: '🔔 Activar notificaciones', bg: '#0070f3' },
    loading: { label: 'Activando...', bg: '#999' },
    active: { label: '✅ Notificaciones activas', bg: '#5cb85c' },
    denied: { label: '❌ Permiso denegado', bg: '#d9534f' },
  }
  const notifLabel = notifStatus.startsWith('error') ? `⚠️ ${notifStatus}` : (notifLabels[notifStatus]?.label ?? notifStatus)
  const notifBg = notifLabels[notifStatus]?.bg ?? '#f0ad4e'

  const groupedAnalyses = analyses.reduce((acc, a) => {
    if (!acc[a.asset_symbol]) acc[a.asset_symbol] = []
    acc[a.asset_symbol].push(a)
    return acc
  }, {})

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Assetic</h1>

      <button
        onClick={activateNotifications}
        disabled={notifStatus === 'loading' || notifStatus === 'active'}
        style={{ ...btnStyle, background: notifBg, width: '100%', marginBottom: '1.5rem' }}
      >
        {notifLabel}
      </button>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['alerts', 'watchlist', 'analyses'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ ...btnStyle, background: activeTab === tab ? '#0070f3' : '#e2e8f0', color: activeTab === tab ? '#fff' : '#333', flex: 1, fontSize: '0.85rem' }}
          >
            {tab === 'alerts' ? '🔔 Alertas' : tab === 'watchlist' ? '👁 Watchlist' : '🧠 Análisis'}
          </button>
        ))}
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <>
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Nueva alerta</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input placeholder="Símbolo (ej: AAPL, BTC)" value={form.asset_symbol} onChange={e => setForm({ ...form, asset_symbol: e.target.value })} style={inputStyle} />
              <select value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })} style={inputStyle}>
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
                <option value="crypto">Crypto</option>
              </select>
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} style={inputStyle}>
                {Object.entries(CONDITIONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {!MIN_CONDITIONS.includes(form.condition) && (
                <input type="number" placeholder="Porcentaje (ej: 5)" value={form.threshold_percent} onChange={e => setForm({ ...form, threshold_percent: e.target.value })} style={inputStyle} />
              )}
              <button onClick={createAlert} style={btnStyle}>Crear alerta</button>
            </div>
          </div>

          <h2 style={{ margin: '1.5rem 0 1rem', fontSize: '1rem' }}>Alertas</h2>
          {loading && <p>Cargando...</p>}
          {!loading && alerts.length === 0 && <p style={{ color: '#999' }}>No hay alertas todavía.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{ ...cardStyle, opacity: alert.is_active ? 1 : 0.5 }}>
                {editingId === alert.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input value={editForm.asset_symbol} onChange={e => setEditForm({ ...editForm, asset_symbol: e.target.value })} style={inputStyle} />
                    <select value={editForm.asset_type} onChange={e => setEditForm({ ...editForm, asset_type: e.target.value })} style={inputStyle}>
                      <option value="stock">Stock</option>
                      <option value="etf">ETF</option>
                      <option value="crypto">Crypto</option>
                    </select>
                    <select value={editForm.condition} onChange={e => setEditForm({ ...editForm, condition: e.target.value })} style={inputStyle}>
                      {Object.entries(CONDITIONS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {!MIN_CONDITIONS.includes(editForm.condition) && (
                      <input type="number" value={editForm.threshold_percent} onChange={e => setEditForm({ ...editForm, threshold_percent: e.target.value })} style={inputStyle} />
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => saveEdit(alert.id)} style={btnStyle}>Guardar</button>
                      <button onClick={() => setEditingId(null)} style={{ ...btnStyle, background: '#999' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{alert.asset_symbol}</strong>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>{alert.asset_type}</span>
                      <p style={{ fontSize: '0.9rem', color: '#444', marginTop: '0.25rem' }}>
                        {CONDITIONS[alert.condition]} {alert.threshold_percent ? `${alert.threshold_percent}%` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button onClick={() => analyzeManually(alert)} disabled={analyzingSymbol === alert.asset_symbol} style={{ ...btnStyle, background: '#6366f1', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                        {analyzingSymbol === alert.asset_symbol ? '...' : '🧠'}
                      </button>
                      <button onClick={() => toggleAlert(alert.id, alert.is_active)} style={{ ...btnStyle, background: alert.is_active ? '#f0ad4e' : '#5cb85c', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                        {alert.is_active ? 'Pausar' : 'Activar'}
                      </button>
                      <button onClick={() => startEdit(alert)} style={{ ...btnStyle, background: '#5bc0de', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                        Editar
                      </button>
                      <button onClick={() => deleteAlert(alert.id)} style={{ ...btnStyle, background: '#d9534f', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Watchlist Tab */}
      {activeTab === 'watchlist' && (
        <>
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Agregar a watchlist</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                placeholder="Símbolo (ej: SPY, QQQ)"
                value={watchlistForm.asset_symbol}
                onChange={e => setWatchlistForm({ ...watchlistForm, asset_symbol: e.target.value })}
                style={inputStyle}
              />
              <select value={watchlistForm.asset_type} onChange={e => setWatchlistForm({ ...watchlistForm, asset_type: e.target.value })} style={inputStyle}>
                <option value="etf">ETF</option>
                <option value="stock">Stock</option>
                <option value="crypto">Crypto</option>
              </select>
              <button onClick={addToWatchlist} style={btnStyle}>Agregar</button>
            </div>
          </div>

          <h2 style={{ margin: '1.5rem 0 1rem', fontSize: '1rem' }}>Mis activos</h2>
          {watchlist.length === 0 && <p style={{ color: '#999' }}>No hay activos en la watchlist todavía.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {watchlist.map(item => (
              <div key={item.id} style={{ ...cardStyle, opacity: item.is_active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{item.asset_symbol}</strong>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>{item.asset_type}</span>
                    <p style={{ fontSize: '0.8rem', color: item.is_active ? '#16a34a' : '#999', marginTop: '0.25rem' }}>
                      {item.is_active ? '🧠 Smart Alert activa' : 'Pausado'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => toggleWatchlistItem(item.id, item.is_active)} style={{ ...btnStyle, background: item.is_active ? '#f0ad4e' : '#5cb85c', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                      {item.is_active ? 'Pausar' : 'Activar'}
                    </button>
                    <button onClick={() => removeFromWatchlist(item.id)} style={{ ...btnStyle, background: '#d9534f', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Analyses Tab */}
      {activeTab === 'analyses' && (
        <>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Historial de análisis</h2>
          {Object.keys(groupedAnalyses).length === 0 && <p style={{ color: '#999' }}>No hay análisis todavía.</p>}
          {Object.entries(groupedAnalyses).map(([symbol, items]) => (
            <div key={symbol} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{symbol}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {items.map(a => <AnalysisCard key={a.id} a={a} />)}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  )
}

const inputStyle = {
  padding: '0.6rem',
  borderRadius: '6px',
  border: '1px solid #ddd',
  fontSize: '1rem',
  width: '100%',
}

const btnStyle = {
  padding: '0.6rem 1rem',
  borderRadius: '6px',
  border: 'none',
  background: '#0070f3',
  color: '#fff',
  fontSize: '1rem',
  cursor: 'pointer',
}

const cardStyle = {
  background: '#fff',
  padding: '1rem',
  borderRadius: '8px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  marginBottom: '0.5rem',
}

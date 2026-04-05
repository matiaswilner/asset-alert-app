import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const CONDITIONS = {
  drop_day: 'Cae % en un día',
  drop_week: 'Cae % en una semana',
  rise_day: 'Sube % en un día',
  rise_week: 'Sube % en una semana',
}

const EMPTY_FORM = {
  asset_symbol: '',
  asset_type: 'stock',
  condition: 'drop_day',
  threshold_percent: '',
}

export default function Home() {
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState('idle')

  useEffect(() => {
    fetchAlerts()
  }, [])

  async function fetchAlerts() {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
    setAlerts(data || [])
    setLoading(false)
  }

  async function createAlert() {
    if (!form.asset_symbol || !form.threshold_percent) return
    await supabase.from('alerts').insert([{
      ...form,
      asset_symbol: form.asset_symbol.toUpperCase(),
      threshold_percent: parseFloat(form.threshold_percent),
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
      threshold_percent: parseFloat(editForm.threshold_percent),
    }).eq('id', id)
    setEditingId(null)
    fetchAlerts()
  }

  async function activateNotifications() {
    try {
      setNotifStatus('loading')

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setNotifStatus('denied')
        return
      }

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
      console.error(err)
      setNotifStatus('error')
    }
  }

  const notifButton = {
    idle: { label: '🔔 Activar notificaciones', background: '#0070f3' },
    loading: { label: 'Activando...', background: '#999' },
    active: { label: '✅ Notificaciones activas', background: '#5cb85c' },
    denied: { label: '❌ Permiso denegado', background: '#d9534f' },
    error: { label: '⚠️ Error al activar', background: '#f0ad4e' },
  }

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Assetic</h1>

      {/* Notifications */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={activateNotifications}
          disabled={notifStatus === 'loading' || notifStatus === 'active'}
          style={{ ...buttonStyle, background: notifButton[notifStatus].background, width: '100%' }}
        >
          {notifButton[notifStatus].label}
        </button>
      </div>

      {/* Form */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Nueva alerta</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            placeholder="Símbolo (ej: AAPL, BTC)"
            value={form.asset_symbol}
            onChange={e => setForm({ ...form, asset_symbol: e.target.value })}
            style={inputStyle}
          />
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
          <input
            type="number"
            placeholder="Porcentaje (ej: 5)"
            value={form.threshold_percent}
            onChange={e => setForm({ ...form, threshold_percent: e.target.value })}
            style={inputStyle}
          />
          <button onClick={createAlert} style={buttonStyle}>Crear alerta</button>
        </div>
      </div>

      {/* List */}
      <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Alertas activas</h2>
      {loading && <p>Cargando...</p>}
      {!loading && alerts.length === 0 && <p style={{ color: '#999' }}>No hay alertas todavía.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map(alert => (
          <div key={alert.id} style={{ background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', opacity: alert.is_active ? 1 : 0.5 }}>
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
                <input type="number" value={editForm.threshold_percent} onChange={e => setEditForm({ ...editForm, threshold_percent: e.target.value })} style={inputStyle} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => saveEdit(alert.id)} style={buttonStyle}>Guardar</button>
                  <button onClick={() => setEditingId(null)} style={{ ...buttonStyle, background: '#999' }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{alert.asset_symbol}</strong>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>{alert.asset_type}</span>
                  <p style={{ fontSize: '0.9rem', color: '#444', marginTop: '0.25rem' }}>
                    {CONDITIONS[alert.condition]} {alert.threshold_percent}%
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleAlert(alert.id, alert.is_active)} style={{ ...buttonStyle, background: alert.is_active ? '#f0ad4e' : '#5cb85c', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                    {alert.is_active ? 'Pausar' : 'Activar'}
                  </button>
                  <button onClick={() => startEdit(alert)} style={{ ...buttonStyle, background: '#5bc0de', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                    Editar
                  </button>
                  <button onClick={() => deleteAlert(alert.id)} style={{ ...buttonStyle, background: '#d9534f', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
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

const buttonStyle = {
  padding: '0.6rem 1rem',
  borderRadius: '6px',
  border: 'none',
  background: '#0070f3',
  color: '#fff',
  fontSize: '1rem',
  cursor: 'pointer',
}

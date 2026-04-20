import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/auth'
import AlertList from '../components/alerts/AlertList'
import AlertForm from '../components/alerts/AlertForm'
import { MIN_CONDITIONS } from '../components/alerts/AlertForm'
import WatchlistList from '../components/watchlist/WatchlistList'
import WatchlistForm from '../components/watchlist/WatchlistForm'
import AnalysisList from '../components/analyses/AnalysisList'
import NotificationList from '../components/notifications/NotificationList'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import AnalysisProgressBar from '../components/ui/ProgressBar'

const fadeIn = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

const EMPTY_FORM = { asset_symbol: '', asset_type: 'stock', condition: 'drop_day', threshold_percent: '' }
const EMPTY_WATCHLIST_FORM = { asset_symbol: '', asset_type: 'etf' }

const tabs = [
  { id: 'alerts', label: 'Alertas', icon: '🔔' },
  { id: 'watchlist', label: 'Watchlist', icon: '👁' },
  { id: 'analyses', label: 'Análisis', icon: '🧠' },
  { id: 'notifications', label: 'Historial', icon: '📋' },
]

export default function App() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [prices, setPrices] = useState({})
  const [notifications, setNotifications] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [watchlistForm, setWatchlistForm] = useState(EMPTY_WATCHLIST_FORM)
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState('idle')
  const [analyzingSymbol, setAnalyzingSymbol] = useState(null)
  const [activeTab, setActiveTab] = useState('alerts')
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [showWatchlistForm, setShowWatchlistForm] = useState(false)
  const [showSmartAlertInfo, setShowSmartAlertInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [expandedNotificationId, setExpandedNotificationId] = useState(null)
  const [analysisProgress, setAnalysisProgress] = useState(null)
  const [analysisDone, setAnalysisDone] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastSymbol, setToastSymbol] = useState('')
  const [errorToast, setErrorToast] = useState(null)

  function showError(message) {
    setErrorToast(message)
    setTimeout(() => setErrorToast(null), 4000)
  }

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser()
      if (!currentUser) { router.replace('/login'); return }
      setUser(currentUser)
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab') || 'alerts'
      const notifId = params.get('notifId')
      setActiveTab(tab)
      if (notifId) setExpandedNotificationId(parseInt(notifId))

      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', currentUser.id)
        .limit(1)
      if (data && data.length > 0) setNotifStatus('active')

      await fetchAll()
    }
    init()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const handler = (event) => {
      if (event?.data?.type === 'OPEN_NOTIFICATION') {
        setActiveTab('notifications')
        if (event.data.notifId) setExpandedNotificationId(event.data.notifId)
      }
    }
    navigator.serviceWorker.ready.then(() => {
      navigator.serviceWorker.addEventListener('message', handler)
    })
    return () => {
      if (navigator.serviceWorker) navigator.serviceWorker.removeEventListener('message', handler)
    }
  }, [])

  useEffect(() => {
    if (showSettings || showSmartAlertInfo) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [showSettings, showSmartAlertInfo])

  async function fetchAll() {
    try {
      await Promise.all([fetchAlerts(), fetchAnalyses(), fetchWatchlist(), fetchNotifications(), fetchPrices()])
    } catch (err) {
      console.error('fetchAll error:', err.message)
    } finally {
      setLoading(false)
    }
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
    if (!form.asset_symbol || !user) return
    if (!MIN_CONDITIONS.includes(form.condition) && !form.threshold_percent) return
    try {
      const { error } = await supabase.from('alerts').insert([{
        ...form,
        asset_symbol: form.asset_symbol.toUpperCase(),
        threshold_percent: form.threshold_percent ? parseFloat(form.threshold_percent) : null,
        user_id: user.id,
      }])
      if (error) throw new Error(error.message)
      fetch('/api/init-price-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: form.asset_symbol.toUpperCase(), assetType: form.asset_type }),
      }).catch(() => {})
      setForm(EMPTY_FORM)
      setShowAlertForm(false)
      fetchAlerts()
    } catch (err) {
      showError('Error al crear la alerta. Intentá de nuevo.')
    }
  }

  async function deleteAlert(id) {
    try {
      const { error } = await supabase.from('alerts').delete().eq('id', id)
      if (error) throw new Error(error.message)
      fetchAlerts()
    } catch {
      showError('Error al eliminar la alerta.')
    }
  }

  async function toggleAlert(id, current) {
    try {
      const { error } = await supabase.from('alerts').update({ is_active: !current }).eq('id', id)
      if (error) throw new Error(error.message)
      fetchAlerts()
    } catch {
      showError('Error al actualizar la alerta.')
    }
  }

  async function editAlert(id, editForm) {
    try {
      const { error } = await supabase.from('alerts').update({
        ...editForm,
        asset_symbol: editForm.asset_symbol.toUpperCase(),
        threshold_percent: editForm.threshold_percent ? parseFloat(editForm.threshold_percent) : null,
      }).eq('id', id)
      if (error) throw new Error(error.message)
      fetchAlerts()
    } catch {
      showError('Error al guardar los cambios.')
    }
  }

  async function addToWatchlist() {
    if (!watchlistForm.asset_symbol || !user) return
    try {
      const { error } = await supabase.from('watchlist').insert([{
        asset_symbol: watchlistForm.asset_symbol.toUpperCase(),
        asset_type: watchlistForm.asset_type,
        user_id: user.id,
      }])
      if (error) throw new Error(error.message)
      fetch('/api/init-price-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: watchlistForm.asset_symbol.toUpperCase(), assetType: watchlistForm.asset_type }),
      }).catch(() => {})
      setWatchlistForm(EMPTY_WATCHLIST_FORM)
      setShowWatchlistForm(false)
      fetchWatchlist()
    } catch {
      showError('Error al agregar a la watchlist. El activo puede ya estar agregado.')
    }
  }

  async function removeFromWatchlist(id) {
    try {
      const { error } = await supabase.from('watchlist').delete().eq('id', id)
      if (error) throw new Error(error.message)
      fetchWatchlist()
    } catch {
      showError('Error al quitar el activo.')
    }
  }

  async function toggleWatchlistItem(id, current) {
    try {
      const { error } = await supabase.from('watchlist').update({ is_active: !current }).eq('id', id)
      if (error) throw new Error(error.message)
      fetchWatchlist()
    } catch {
      showError('Error al actualizar el activo.')
    }
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
        body: JSON.stringify({ ...sub, userId: user?.id }),
      })
      setNotifStatus('active')
    } catch {
      setNotifStatus('idle')
      showError('Error al activar las notificaciones. Intentá de nuevo.')
    }
  }

  async function sendTestNotification() {
    try {
      const res = await fetch('/api/send-test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      })
      if (!res.ok) throw new Error()
    } catch {
      showError('Error al enviar la notificación de prueba.')
    }
  }

  async function analyzeManually(alert) {
    setAnalyzingSymbol(alert.asset_symbol)
    setAnalysisProgress(alert.asset_symbol)
    setAnalysisDone(false)
    try {
      const timeframe = alert.condition.includes('day') ? '1 day' :
                        alert.condition.includes('week') ? '1 week' :
                        alert.condition.replace('min_', '').replace('d', ' days')
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: alert.asset_symbol, assetType: alert.asset_type, priceChange: 'manual request', timeframe, alertId: alert.id, triggeredBy: 'manual', userId: user?.id }),
      })
      if (!res.ok) throw new Error()
      setAnalysisDone(true)
      await fetchAnalyses()
      setTimeout(() => {
        setAnalysisProgress(null)
        setAnalysisDone(false)
        setToastSymbol(alert.asset_symbol)
        setShowToast(true)
        setTimeout(() => setShowToast(false), 4000)
      }, 1000)
    } catch {
      setAnalysisProgress(null)
      showError(`Error al analizar ${alert.asset_symbol}. Intentá de nuevo.`)
    }
    setAnalyzingSymbol(null)
  }

  async function analyzeFromWatchlist(item) {
    setAnalyzingSymbol(item.asset_symbol)
    setAnalysisProgress(item.asset_symbol)
    setAnalysisDone(false)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: item.asset_symbol, assetType: item.asset_type, priceChange: 'manual request', timeframe: '1 day', alertId: null, triggeredBy: 'manual', userId: user?.id }),
      })
      if (!res.ok) throw new Error()
      setAnalysisDone(true)
      await fetchAnalyses()
      setTimeout(() => {
        setAnalysisProgress(null)
        setAnalysisDone(false)
        setToastSymbol(item.asset_symbol)
        setShowToast(true)
        setTimeout(() => setShowToast(false), 4000)
      }, 1000)
    } catch {
      setAnalysisProgress(null)
      showError(`Error al analizar ${item.asset_symbol}. Intentá de nuevo.`)
    }
    setAnalyzingSymbol(null)
  }

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

  const SmartAlertModal = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overscrollBehavior: 'none', touchAction: 'none' }} onClick={() => setShowSmartAlertInfo(false)}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>¿Cómo funcionan las Smart Alerts?</h3>
          <button onClick={() => setShowSmartAlertInfo(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { icon: '🕐', title: 'Monitoreo automático', text: 'Tres veces por día, durante el horario de mercado, Assetic revisa cada activo de tu watchlist automáticamente.' },
            { icon: '🧠', title: 'Evaluación inteligente', text: 'Para cada activo, una IA analiza el precio actual, el movimiento del día y las noticias más recientes. Si detecta algo relevante para un inversor de largo plazo, decide notificarte. Si no hay nada importante, no te molesta.' },
            { icon: '📊', title: 'Análisis completo', text: 'Cuando decide que vale la pena avisarte, genera un análisis completo: qué pasó, por qué pasó, y si representa una oportunidad gradual de compra o es mejor esperar.' },
            { icon: '🔕', title: 'Sin ruido', text: 'Un movimiento del 2% en un día tranquilo no es lo mismo que un 2% en medio de una caída de mercado. La IA evalúa el contexto antes de notificarte.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)', marginBottom: '6px' }}>{item.icon} {item.title}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const SettingsModal = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overscrollBehavior: 'none', touchAction: 'none' }} onClick={() => setShowSettings(false)}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Configuración</h3>
          <button onClick={() => setShowSettings(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuenta</p>
            <p style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500' }}>{user?.email}</p>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notificaciones</p>
            {notifStatus === 'active' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '13px', color: 'var(--positive)' }}>✅ Notificaciones activas</p>
                <Button onClick={sendTestNotification} variant="ghost" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
                  🔔 Probar notificación
                </Button>
              </div>
            ) : (
              <Button onClick={activateNotifications} disabled={notifStatus === 'loading'} style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
                {notifStatus === 'loading' ? 'Activando...' : '🔔 Activar notificaciones'}
              </Button>
            )}
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ayuda</p>
            <Button onClick={() => { setShowSettings(false); router.push('/onboarding') }} variant="ghost" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
              ❓ Ver tutorial de la app
            </Button>
          </div>
          {user?.id === 'b0ac5859-b7bb-475d-85b0-dcea19dd6012' && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</p>
              <Button onClick={() => { setShowSettings(false); router.push('/admin') }} variant="ghost" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
                ⚙️ Panel de administración
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '80px', overflow: 'hidden' }}>
      <style>{fadeIn}</style>

      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icon-192.png" alt="Assetic" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>Assetic</h1>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ⚙️
        </button>
      </div>

      {/* Analysis Progress Bar */}
      {analysisProgress && (
        <AnalysisProgressBar symbol={analysisProgress} done={analysisDone} />
      )}

      {/* Success Toast */}
      {showToast && (
        <div
          onClick={() => { setShowToast(false); setActiveTab('analyses') }}
          style={{ position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', background: 'var(--positive)', color: '#000', borderRadius: '20px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', zIndex: 999, whiteSpace: 'nowrap', animation: 'fadeIn 0.3s ease' }}
        >
          ✅ Análisis de {toastSymbol} listo — ver ahora
        </div>
      )}

      {/* Error Toast */}
      {errorToast && (
        <div
          onClick={() => setErrorToast(null)}
          style={{ position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', background: 'var(--negative)', color: '#fff', borderRadius: '20px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', zIndex: 999, width: '85%', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}
        >
          ❌ {errorToast}
        </div>
      )}

      {/* Content */}
      <div key={activeTab} style={{ flex: 1, padding: '20px', overflowY: 'auto', animation: 'fadeIn 0.2s ease', width: '100%', boxSizing: 'border-box' }}>

        {activeTab === 'alerts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Alertas</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Alertas manuales por condición de precio</p>
              </div>
              <Button onClick={() => setShowAlertForm(!showAlertForm)} variant="purple">
                {showAlertForm ? '✕ Cerrar' : '+ Nueva'}
              </Button>
            </div>
            {showAlertForm && (
              <Card style={{ marginBottom: '16px', border: '1px solid var(--border-accent)' }}>
                <AlertForm form={form} setForm={setForm} onSubmit={createAlert} onCancel={() => setShowAlertForm(false)} />
              </Card>
            )}
            <AlertList
              alerts={alerts}
              onToggle={toggleAlert}
              onDelete={deleteAlert}
              onEdit={editAlert}
              onAnalyze={analyzeManually}
              analyzingSymbol={analyzingSymbol}
            />
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Watchlist</h2>
                  <button onClick={() => setShowSmartAlertInfo(true)} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Monitoreo inteligente con Smart Alerts</p>
              </div>
              <Button onClick={() => setShowWatchlistForm(!showWatchlistForm)} variant="purple">
                {showWatchlistForm ? '✕ Cerrar' : '+ Agregar'}
              </Button>
            </div>
            {showWatchlistForm && (
              <Card style={{ marginBottom: '16px', border: '1px solid var(--border-accent)' }}>
                <WatchlistForm form={watchlistForm} setForm={setWatchlistForm} onSubmit={addToWatchlist} onCancel={() => setShowWatchlistForm(false)} />
              </Card>
            )}
            <WatchlistList
              watchlist={watchlist}
              prices={prices}
              onToggle={toggleWatchlistItem}
              onRemove={removeFromWatchlist}
              onAnalyze={analyzeFromWatchlist}
              analyzingSymbol={analyzingSymbol}
              analyses={analyses}
            />
          </div>
        )}

        {activeTab === 'analyses' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Análisis</h2>
            </div>
            <AnalysisList analyses={analyses} />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Historial</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Notificaciones recibidas</p>
            </div>
            <NotificationList notifications={notifications} expandedId={expandedNotificationId} />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: 'rgba(13, 13, 20, 0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', display: 'flex', padding: '8px 0 calc(8px + env(safe-area-inset-bottom))' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'opacity 0.15s ease', opacity: activeTab === tab.id ? 1 : 0.6 }}
          >
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)', letterSpacing: '0.03em' }}>{tab.label}</span>
            {activeTab === tab.id && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />}
          </button>
        ))}
      </div>

      {showSmartAlertInfo && <SmartAlertModal />}
      {showSettings && <SettingsModal />}
    </div>
  )
}

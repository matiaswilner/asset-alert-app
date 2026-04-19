import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/auth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Card from '../components/ui/Card'

const STEPS = ['welcome', 'watchlist', 'notifications', 'tour']

const TOUR_TABS = [
  {
    icon: '🔔',
    title: 'Alertas',
    description: 'Creá alertas manuales para que te avisemos cuando un activo sube o baja un % específico, o cuando toca su mínimo histórico de 14, 30, 60, 90 o 180 días.',
  },
  {
    icon: '👁',
    title: 'Watchlist',
    description: 'Agregá activos para que la IA los monitoree automáticamente 3 veces por día. Si detecta algo relevante para un inversor de largo plazo, te manda una notificación con un análisis completo.',
  },
  {
    icon: '🧠',
    title: 'Análisis',
    description: 'Acá aparecen todos los análisis generados — tanto los automáticos como los que pedís vos manualmente. Cada uno incluye un resumen, explicación, score de -5 a +5 y una recomendación: BUY, NEUTRAL o WAIT.',
  },
  {
    icon: '📋',
    title: 'Historial',
    description: 'Todas las notificaciones que recibiste, ordenadas por fecha. Podés expandir cada una para ver el detalle completo.',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [user, setUser] = useState(null)
  const [watchlistForm, setWatchlistForm] = useState({ asset_symbol: '', asset_type: 'etf' })
  const [watchlistAdded, setWatchlistAdded] = useState(false)
  const [addingWatchlist, setAddingWatchlist] = useState(false)
  const [notifStatus, setNotifStatus] = useState('idle')
  const [testSent, setTestSent] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [progressLabel, setProgressLabel] = useState('📨 Análisis en camino...')
  const [tourIndex, setTourIndex] = useState(0)

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser()
      if (!currentUser) { router.replace('/login'); return }
      setUser(currentUser)

      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', currentUser.id)
        .limit(1)
      if (data && data.length > 0) setNotifStatus('active')
    }
    init()
  }, [])

  useEffect(() => {
    if (!testSent) return
    const labels = ['🔍 Buscando noticias...', '🧠 Analizando el mercado...', '✅ Casi listo...']
    let step = 0
    setProgressStep(0)
    setProgressLabel(labels[0])
    const interval = setInterval(() => {
      step += 1
      if (step >= labels.length) {
        clearInterval(interval)
        return
      }
      setProgressStep(step)
      setProgressLabel(labels[step])
    }, 6000)
    return () => clearInterval(interval)
  }, [testSent])

  async function addToWatchlist() {
    if (!watchlistForm.asset_symbol || !user) return
    setAddingWatchlist(true)
    await supabase.from('watchlist').insert([{
      asset_symbol: watchlistForm.asset_symbol.toUpperCase(),
      asset_type: watchlistForm.asset_type,
      user_id: user.id,
    }])
    setWatchlistAdded(true)
    setAddingWatchlist(false)
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
    } catch (err) {
      setNotifStatus('error')
    }
  }

  async function sendTestNotification() {
    if (!watchlistAdded || testSent) return
    setTestSent(true)
    await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: watchlistForm.asset_symbol.toUpperCase(),
        assetType: watchlistForm.asset_type,
        priceChange: 'manual request',
        timeframe: '1 day',
        triggeredBy: 'manual',
        userId: user?.id,
      }),
    })
  }

  async function completeOnboarding() {
    if (!user) return
    await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
    router.replace('/app')
  }

  const canGoNext = () => {
    if (step === 2) return notifStatus === 'active'
    return true
  }
  function nextStep() {
    if (step === STEPS.length - 1) {
      completeOnboarding()
    } else {
      setStep(step + 1)
    }
  }

  const progressPct = ((step + 1) / STEPS.length) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', padding: '24px' }}>

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Paso {step + 1} de {STEPS.length}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{Math.round(progressPct)}%</span>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '999px', height: '4px' }}>
          <div style={{ width: `${progressPct}%`, background: 'var(--accent)', height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Step 1 — Welcome */}
      {step === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <img src="/icon-192.png" alt="Assetic" style={{ width: '80px', height: '80px', borderRadius: '20px', marginBottom: '24px' }} />
            <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '16px' }}>
              Bienvenido a Assetic.
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '12px' }}>
              Tu plata no debería estar quieta perdiendo valor.
            </p>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Assetic monitorea tus activos y te avisa cuándo vale la pena moverse — sin que tengas que estar mirando el mercado todo el día.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {[
              { icon: '📈', text: 'Invertir de a poco en activos que caen, no vender por pánico' },
              { icon: '🧠', text: 'Entender por qué se mueve el mercado, no solo seguir números' },
              { icon: '🔕', text: 'Recibir solo lo que importa, sin ruido ni alertas innecesarias' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Watchlist */}
      {step === 1 && (
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Agregá tu primer activo</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            La Watchlist es donde la IA trabaja por vos. Tres veces por día, durante el horario de mercado, analiza cada activo que agregues y te avisa solo si detecta algo relevante.
          </p>

          <Card style={{ marginBottom: '16px', background: 'var(--bg-secondary)' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>¿Cuándo te notifica?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                '📉 Caída significativa con una causa clara',
                '🌍 Evento macro que impacta directamente al activo',
                '💡 Oportunidad de compra gradual bien fundamentada',
              ].map(item => (
                <p key={item} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item}</p>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '12px' }}>Si no hay nada importante, no te molesta.</p>
          </Card>

          {!watchlistAdded ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                placeholder="Símbolo (ej: SPY, QQQ, BTC)"
                value={watchlistForm.asset_symbol}
                onChange={e => setWatchlistForm({ ...watchlistForm, asset_symbol: e.target.value.toUpperCase() })}
              />
              <Select value={watchlistForm.asset_type} onChange={e => setWatchlistForm({ ...watchlistForm, asset_type: e.target.value })}>
                <option value="etf">ETF</option>
                <option value="stock">Stock</option>
                <option value="crypto">Crypto</option>
              </Select>
              <Button onClick={addToWatchlist} disabled={addingWatchlist || !watchlistForm.asset_symbol} style={{ width: '100%', padding: '14px' }}>
                {addingWatchlist ? 'Agregando...' : 'Agregar a Watchlist'}
              </Button>
            </div>
          ) : (
            <Card style={{ background: 'var(--positive-dim)', border: '1px solid var(--positive)' }}>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--positive)', textAlign: 'center' }}>
                ✅ {watchlistForm.asset_symbol.toUpperCase()} agregado correctamente
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px' }}>
                La IA va a monitorear este activo automáticamente.
              </p>
            </Card>
          )}
          {!watchlistAdded && (
            <button
              onClick={() => setStep(2)}
              style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '12px', cursor: 'pointer', padding: '8px' }}
            >
              Saltar por ahora
            </button>
          )}
        </div>
      )}

      {/* Step 3 — Notifications */}
      {step === 2 && (
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Activá las notificaciones</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Sin notificaciones, Assetic no puede avisarte cuando algo importante ocurre. Las usamos solo cuando hay algo que realmente vale la pena saber.
          </p>

          {notifStatus === 'idle' && (
            <Button onClick={activateNotifications} style={{ width: '100%', padding: '14px', fontSize: '15px', marginBottom: '16px' }}>
              🔔 Activar notificaciones
            </Button>
          )}

          {notifStatus === 'loading' && (
            <Button disabled style={{ width: '100%', padding: '14px', fontSize: '15px', marginBottom: '16px' }}>
              Activando...
            </Button>
          )}

          {notifStatus === 'active' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Card style={{ background: 'var(--positive-dim)', border: '1px solid var(--positive)' }}>
                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--positive)', textAlign: 'center' }}>
                  ✅ Notificaciones activadas
                </p>
              </Card>
              {watchlistAdded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button
                    onClick={sendTestNotification}
                    disabled={testSent}
                    variant="ghost"
                    style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                  >
                    {testSent ? progressLabel : '🧪 Probar — analizar ' + watchlistForm.asset_symbol.toUpperCase()}
                  </Button>
                  {testSent && (
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        {['🔍', '🧠', '✅'].map((icon, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: i < 2 ? 1 : 'none' }}>
                            <span style={{ fontSize: '14px', opacity: progressStep >= i ? 1 : 0.3, transition: 'opacity 0.4s ease' }}>{icon}</span>
                            <span style={{ fontSize: '11px', color: progressStep >= i ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'color 0.4s ease' }}>
                              {['Noticias', 'Análisis', 'Listo'][i]}
                            </span>
                            {i < 2 && (
                              <div style={{ flex: 1, height: '2px', background: progressStep > i ? 'var(--accent)' : 'var(--border)', margin: '0 6px', borderRadius: '999px', transition: 'background 0.4s ease' }} />
                            )}
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
                        Esto puede tardar unos segundos. Podés continuar con el tutorial mientras esperás — te va a llegar una notificación cuando esté listo.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {notifStatus === 'denied' && (
            <Card style={{ background: 'var(--negative-dim)', border: '1px solid var(--negative)' }}>
              <p style={{ fontSize: '14px', color: 'var(--negative)', textAlign: 'center' }}>
                ❌ Permiso denegado. Habilitá las notificaciones desde los ajustes de tu dispositivo.
              </p>
            </Card>
          )}

          {notifStatus === 'error' && (
            <Card style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)' }}>
              <p style={{ fontSize: '14px', color: 'var(--warning)', textAlign: 'center' }}>
                ⚠️ Error al activar. Intentá de nuevo.
              </p>
              <Button onClick={activateNotifications} variant="warning" style={{ width: '100%', marginTop: '12px' }}>
                Reintentar
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Step 4 — Tour */}
      {step === 3 && (
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Todo listo 🎉</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Antes de empezar, un tour rápido de lo que tenés disponible.
          </p>

          <Card style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>{TOUR_TABS[tourIndex].icon}</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '10px' }}>{TOUR_TABS[tourIndex].title}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', textAlign: 'center' }}>{TOUR_TABS[tourIndex].description}</p>
          </Card>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {TOUR_TABS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTourIndex(i)}
                style={{ width: i === tourIndex ? '24px' : '8px', height: '8px', borderRadius: '999px', background: i === tourIndex ? 'var(--accent)' : 'var(--bg-tertiary)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {tourIndex < TOUR_TABS.length - 1 ? (
              <>
                <Button onClick={() => setTourIndex(tourIndex + 1)} style={{ flex: 1, padding: '14px' }}>
                  Siguiente →
                </Button>
                <Button onClick={completeOnboarding} variant="ghost" style={{ padding: '14px' }}>
                  Saltar
                </Button>
              </>
            ) : (
              <Button onClick={completeOnboarding} style={{ flex: 1, padding: '14px', fontSize: '15px' }}>
                Empezar a usar Assetic →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      {step < 3 && (
        <div style={{ paddingTop: '24px' }}>
          <Button
            onClick={nextStep}
            disabled={!canGoNext()}
            style={{ width: '100%', padding: '14px', fontSize: '15px', opacity: canGoNext() ? 1 : 0.4 }}
          >
            {step === STEPS.length - 1 ? 'Empezar →' : 'Continuar →'}
          </Button>
          {step === 2 && notifStatus !== 'active' && (
            <button
              onClick={nextStep}
              style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '12px', cursor: 'pointer', padding: '8px' }}
            >
              Saltar por ahora
            </button>
          )}
        </div>
      )}
    </div>
  )
}

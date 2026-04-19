import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const CATEGORY_LABELS = {
  external_api: '🔴 API Externa',
  database: '🟠 Base de datos',
  internal: '🟡 Interno',
}

const CATEGORY_COLORS = {
  external_api: 'var(--negative)',
  database: 'var(--warning)',
  internal: 'var(--text-tertiary)',
}

export default function Admin() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [initResults, setInitResults] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLogsLoading(true)
    const { data } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setLogs(data || [])
    setLogsLoading(false)
  }

  async function generateInvitation() {
    if (!secret) return
    setLoading(true)
    setError('')
    setInviteUrl('')
    const res = await fetch('/api/create-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSecret: secret }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError('Clave incorrecta o error al generar')
      setLoading(false)
      return
    }
    setInviteUrl(data.inviteUrl)
    setLoading(false)
  }

  async function initAllPriceHistory() {
    if (!secret) { setError('Ingresá la clave de admin primero'); return }
    setInitLoading(true)
    setInitResults(null)
    const res = await fetch('/api/init-all-price-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSecret: secret }),
    })
    const data = await res.json()
    setInitResults(data.results)
    setInitLoading(false)
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function clearLogs() {
    await supabase.from('error_logs').delete().neq('id', 0)
    fetchLogs()
  }

  const filteredLogs = categoryFilter === 'all'
    ? logs
    : logs.filter(l => l.category === categoryFilter)

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px', paddingBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button
          onClick={() => router.push('/app')}
          style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '10px', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
        >
          ← Volver
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700' }}>Panel Admin</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Herramientas de administración</p>
        </div>
      </div>

      {/* Invitaciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <Input
          type="password"
          placeholder="Clave de admin"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generateInvitation()}
        />
        {error && <p style={{ fontSize: '13px', color: 'var(--negative)', textAlign: 'center' }}>{error}</p>}
        <Button onClick={generateInvitation} disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
          {loading ? 'Generando...' : 'Generar invitación'}
        </Button>
      </div>

      {inviteUrl && (
        <Card style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Link de invitación:</p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: '12px' }}>{inviteUrl}</p>
          <Button onClick={copyToClipboard} variant="success" style={{ width: '100%', padding: '10px' }}>
            {copied ? '✅ Copiado' : 'Copiar link'}
          </Button>
        </Card>
      )}

      {/* Inicializar precios */}
      <Card style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Inicializar historial de precios</p>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px', lineHeight: '1.5' }}>
          Carga los últimos 2 años de datos para todos los activos en watchlists y alertas. Incluye SPY automáticamente.
        </p>
        <Button onClick={initAllPriceHistory} disabled={initLoading} variant="ghost" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
          {initLoading ? 'Inicializando...' : '📊 Inicializar todos los activos'}
        </Button>
        {initResults && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {initResults.map(r => (
              <div key={r.symbol} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{r.symbol}</span>
                <span style={{ color: r.error ? 'var(--negative)' : 'var(--positive)' }}>
                  {r.error ? '❌ Error' : r.message?.includes('already') ? '✓ Ya existe' : `✅ ${r.rows} filas`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Logs de errores */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Logs de errores</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchLogs}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer' }}
            >
              Actualizar
            </button>
            <button
              onClick={clearLogs}
              style={{ background: 'none', border: 'none', color: 'var(--negative)', fontSize: '12px', cursor: 'pointer' }}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto' }}>
          {['all', 'external_api', 'database', 'internal'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                background: categoryFilter === cat ? 'var(--accent)' : 'var(--bg-secondary)',
                color: categoryFilter === cat ? '#fff' : 'var(--text-tertiary)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {logsLoading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px' }}>Cargando logs...</p>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <p style={{ fontSize: '13px', color: 'var(--positive)', textAlign: 'center' }}>✅ Sin errores registrados</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredLogs.map(log => (
              <Card key={log.id} style={{ padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: CATEGORY_COLORS[log.category] }}>
                    {CATEGORY_LABELS[log.category]}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {new Date(log.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>{log.source}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>{log.message}</p>
                {log.details && (
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'monospace' }}>
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

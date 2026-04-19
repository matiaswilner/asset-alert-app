import { useState } from 'react'
import { useRouter } from 'next/router'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Admin() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [initResults, setInitResults] = useState(null)

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

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
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

        <Card>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Inicializar historial de precios</p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px', lineHeight: '1.5' }}>
            Carga los últimos 2 años de datos para todos los activos en watchlists y alertas. Incluye SPY automáticamente.
          </p>
          <Button
            onClick={initAllPriceHistory}
            disabled={initLoading}
            variant="ghost"
            style={{ width: '100%', padding: '10px', fontSize: '13px' }}
          >
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
      </div>
    </div>
  )
}

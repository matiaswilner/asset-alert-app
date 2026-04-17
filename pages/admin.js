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
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Generá links de invitación</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            type="password"
            placeholder="Clave de admin"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateInvitation()}
          />
          {error && <p style={{ fontSize: '13px', color: 'var(--negative)', textAlign: 'center' }}>{error}</p>}
          <Button
            onClick={generateInvitation}
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            {loading ? 'Generando...' : 'Generar invitación'}
          </Button>
        </div>

        {inviteUrl && (
          <Card style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Link de invitación:</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: '12px' }}>{inviteUrl}</p>
            <Button onClick={copyToClipboard} variant="success" style={{ width: '100%', padding: '10px' }}>
              {copied ? '✅ Copiado' : 'Copiar link'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}

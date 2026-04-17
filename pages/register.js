import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { signIn } from '../lib/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Register() {
  const router = useRouter()
  const { token } = router.query
  const [tokenValid, setTokenValid] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    async function validateToken() {
      const res = await fetch('/api/validate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      setTokenValid(data.valid)
    }
    validateToken()
  }, [token])

  async function handleRegister() {
    if (!email || !password) return
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, token }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al registrarse')
      setLoading(false)
      return
    }

    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      router.replace('/login')
      return
    }

    router.replace('/onboarding')
  }

  if (!token || tokenValid === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Verificando invitación...</p>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Invitación inválida</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Este link ya fue usado o no es válido.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/icon-192.png" alt="Assetic" style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>Crear cuenta</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>Fuiste invitado a Assetic.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Contraseña (mínimo 8 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
          />
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--negative)', textAlign: 'center' }}>{error}</p>
          )}
          <Button
            onClick={handleRegister}
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '4px' }}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </div>
      </div>
    </div>
  )
}

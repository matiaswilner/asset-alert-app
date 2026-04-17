import { useState } from 'react'
import { useRouter } from 'next/router'
import { signIn } from '../lib/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.replace('/app')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/icon-192.png" alt="Assetic" style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>Assetic</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>Tu plata no debería estar quieta.</p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--negative)', textAlign: 'center' }}>{error}</p>
          )}
          <Button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '4px' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '24px' }}>
          ¿No tenés cuenta? Necesitás una invitación.
        </p>
      </div>
    </div>
  )
}

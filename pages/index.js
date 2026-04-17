import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getCurrentUser } from '../lib/auth'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const user = await getCurrentUser()
      if (user) {
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab')
        const notifId = params.get('notifId')
        let destination = '/app'
        if (tab) destination += `?tab=${tab}`
        if (notifId) destination += `${tab ? '&' : '?'}notifId=${notifId}`
        router.replace(destination)
      } else {
        router.replace('/login')
      }
    }
    redirect()
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando...</p>
      </div>
    </div>
  )
}

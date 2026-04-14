import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Notifications() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const notifId = params.get('notifId')
    const query = notifId ? `?tab=notifications&notifId=${notifId}` : '?tab=notifications'
    router.replace(`/${query}`)
  }, [])

  return null
}

import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Notifications() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    const notifId = router.query.notifId
    const query = notifId ? `/?tab=notifications&notifId=${notifId}` : '/?tab=notifications'
    router.replace(query)
  }, [router.isReady])

  return null
}

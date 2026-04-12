import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Notifications() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/?tab=notifications')
  }, [])

  return null
}

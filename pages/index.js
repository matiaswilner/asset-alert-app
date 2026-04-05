import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('alerts').select('*')
      if (error) {
        setStatus('Connection failed: ' + error.message)
      } else {
        setStatus('Connected to Supabase ✅ Alerts in DB: ' + data.length)
      }
    }
    testConnection()
  }, [])

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Asset Alert App</h1>
      <p>{status}</p>
    </main>
  )
}

import { supabaseServer as supabase } from './supabaseServer'

export async function logError({ source, category, message, details }) {
  try {
    await supabase.from('error_logs').insert([{
      source,
      category,
      message: message?.slice(0, 500) || 'Unknown error',
      details: details ? JSON.stringify(details).slice(0, 1000) : null,
    }])
  } catch (err) {
    console.error('Failed to log error:', err.message)
  }
}

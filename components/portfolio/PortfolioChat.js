import { useState, useRef, useEffect } from 'react'
import Button from '../ui/Button'

export default function PortfolioChat({ userId, initialAnalysis }) {
  const [messages, setMessages] = useState(
    initialAnalysis
      ? [{ role: 'assistant', content: initialAnalysis }]
      : []
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>💬</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Asesor de portfolio
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
              Hacé preguntas sobre tu portfolio, estrategia de inversión o cualquier duda financiera.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
              {[
                '¿Cuándo debería rebalancear mi portfolio?',
                '¿Qué pasa si el mercado cae un 30%?',
                '¿Cómo usar el cash disponible?',
                '¿Estoy demasiado concentrado en tech?',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '85%',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '12px 14px',
              fontSize: '13px',
              color: msg.role === 'user' ? '#fff' : 'var(--text-secondary)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px 16px 16px 4px',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--text-tertiary)',
            }}>
              <span style={{ animation: 'pulse 1.5s ease infinite' }}>Pensando...</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--negative)' }}>❌ {error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Preguntá sobre tu portfolio..."
          disabled={loading}
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-tertiary)',
            border: 'none',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            color: input.trim() && !loading ? '#fff' : 'var(--text-tertiary)',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

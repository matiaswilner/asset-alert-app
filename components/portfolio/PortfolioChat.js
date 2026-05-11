import { useState, useRef, useEffect } from 'react'

// Renderizador simple de markdown
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Título ## o ###
    if (line.startsWith('### ')) {
      elements.push(<p key={i} style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', marginTop: '8px', fontSize: '13px' }}>{line.slice(4)}</p>)
    } else if (line.startsWith('## ')) {
      elements.push(<p key={i} style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', marginTop: '8px', fontSize: '14px' }}>{line.slice(3)}</p>)
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={i} style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px', marginTop: '6px' }}>{line.slice(2, -2)}</p>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      )
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1]
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0, fontWeight: '600' }}>{num}.</span>
          <span>{formatInline(line.replace(/^\d+\. /, ''))}</span>
        </div>
      )
    } else if (line === '') {
      elements.push(<div key={i} style={{ height: '6px' }} />)
    } else {
      elements.push(<p key={i} style={{ marginBottom: '2px' }}>{formatInline(line)}</p>)
    }
    i++
  }
  return elements
}

function formatInline(text) {
  // Renderizar **bold** inline
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function PortfolioChat({ userId, initialAnalysis }) {
  const [messages, setMessages] = useState(
    initialAnalysis
      ? [{ role: 'assistant', content: initialAnalysis }]
      : []
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

      {/* Messages */}
      <div
        ref={messagesRef}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '8px' }}
      >
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
                  onClick={() => setInput(suggestion)}
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
              maxWidth: '88%',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '12px 14px',
              fontSize: '13px',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              lineHeight: '1.6',
            }}>
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
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
              Pensando...
            </div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--negative)' }}>❌ {error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        flexShrink: 0,
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

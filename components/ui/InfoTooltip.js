import { useState, useRef } from 'react'

export default function InfoTooltip({ text, large = false }) {
  const [visible, setVisible] = useState(false)
  const buttonRef = useRef(null)

  const getTooltipStyle = () => {
    if (!buttonRef.current) return {}
    const rect = buttonRef.current.getBoundingClientRect()
    const tooltipWidth = 260
    const screenWidth = window.innerWidth
    const spaceOnLeft = rect.left
    const spaceOnRight = screenWidth - rect.right

    let left = '50%'
    let transform = 'translateX(-50%)'

    if (spaceOnLeft < tooltipWidth / 2 + 16) {
      left = '0'
      transform = 'translateX(0)'
    } else if (spaceOnRight < tooltipWidth / 2 + 16) {
      left = 'auto'
      transform = 'translateX(0)'
    }

    return { left, transform }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        ref={buttonRef}
        onClick={() => setVisible(!visible)}
        style={{
          background: 'var(--bg-tertiary)',
          border: 'none',
          borderRadius: '50%',
          width: '16px',
          height: '16px',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          fontSize: '10px',
          fontWeight: '700',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ?
      </button>

      {/* Modal para tooltips largos */}
      {visible && large && (
        <div
          onClick={() => setVisible(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '20px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              maxWidth: '340px',
              width: '100%',
              maxHeight: '70vh',
              overflowY: 'auto',
              whiteSpace: 'pre-line',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <p style={{ marginBottom: '12px' }}>{text}</p>
            <button
              onClick={() => setVisible(false)}
              style={{
                background: 'var(--bg-tertiary)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                width: '100%',
                marginTop: '4px',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Popover para tooltips normales */}
      {visible && !large && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
            onClick={() => setVisible(false)}
          />
          <div style={{
            position: 'absolute',
            bottom: '24px',
            ...getTooltipStyle(),
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            width: '260px',
            zIndex: 999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            {text}
          </div>
        </>
      )}
    </div>
  )
}

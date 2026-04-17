export default function Button({ children, variant = 'primary', style = {}, ...props }) {
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    danger: { background: 'var(--negative-dim)', color: 'var(--negative)' },
    warning: { background: 'var(--warning-dim)', color: 'var(--warning)' },
    success: { background: 'var(--positive-dim)', color: 'var(--positive)' },
    ghost: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
    purple: { background: 'var(--accent-dim)', color: 'var(--accent)' },
  }
  return (
    <button
      {...props}
      style={{
        ...variants[variant],
        border: 'none',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        opacity: props.disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

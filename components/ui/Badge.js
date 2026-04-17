export default function Badge({ label, color = 'var(--accent)', bg = 'var(--accent-dim)' }) {
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: '600',
      color,
      background: bg,
      padding: '3px 8px',
      borderRadius: '999px',
      letterSpacing: '0.03em',
    }}>
      {label}
    </span>
  )
}

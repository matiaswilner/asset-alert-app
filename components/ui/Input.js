export default function Input({ style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '12px 14px',
        color: 'var(--text-primary)',
        fontSize: '15px',
        width: '100%',
        outline: 'none',
        ...style,
      }}
    />
  )
}

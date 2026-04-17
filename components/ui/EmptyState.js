export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</p>
      <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>{subtitle}</p>
    </div>
  )
}

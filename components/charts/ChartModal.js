import { useEffect } from 'react'
import PriceChart from './PriceChart'

export default function ChartModal({ item, analyses, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  
  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overscrollBehavior: 'none', touchAction: 'none' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{item.asset_symbol}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '2px' }}>{item.asset_type}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        <PriceChart
          symbol={item.asset_symbol}
          assetType={item.asset_type}
          analyses={analyses.filter(a => a.asset_symbol === item.asset_symbol)}
        />
      </div>
    </div>
  )
}

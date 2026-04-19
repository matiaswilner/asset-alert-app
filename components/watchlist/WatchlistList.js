import WatchlistCard from './WatchlistCard'
import EmptyState from '../ui/EmptyState'

export default function WatchlistList({ watchlist, prices, onToggle, onRemove, onAnalyze, analyzingSymbol, analyses }) {
  if (watchlist.length === 0) {
    return (
      <EmptyState
        icon="👁"
        title="Watchlist vacía"
        subtitle="Agregá activos para monitorear con Smart Alerts"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {watchlist.map(item => (
        <WatchlistCard
          key={item.id}
          item={item}
          price={prices[item.asset_symbol]}
          onToggle={onToggle}
          onRemove={onRemove}
          onAnalyze={onAnalyze}
          analyzingSymbol={analyzingSymbol}
          analyses={analyses}
        />
      ))}
    </div>
  )
}

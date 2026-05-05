import PortfolioHeader from './PortfolioHeader'
import PortfolioUploader from './PortfolioUploader'
import PortfolioEmptyState from './PortfolioEmptyState'
import PositionCard from './PositionCard'

export default function PortfolioTab({
  portfolio,
  portfolioLoading,
  showUploader,
  syncing,
  syncResult,
  onToggleUploader,
  onSync,
}) {
  const hasPositions = portfolio?.positions?.length > 0

  return (
    <div>
      <PortfolioHeader
        portfolio={portfolio}
        showUploader={showUploader}
        onToggleUploader={onToggleUploader}
      />

      {showUploader && (
        <PortfolioUploader
          syncing={syncing}
          syncResult={syncResult}
          onSync={onSync}
        />
      )}

      {portfolioLoading ? (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando portfolio...</p>
        </div>
      ) : !hasPositions ? (
        <PortfolioEmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {portfolio.positions.map(pos => (
            <PositionCard key={pos.asset_symbol} position={pos} />
          ))}
        </div>
      )}
    </div>
  )
}

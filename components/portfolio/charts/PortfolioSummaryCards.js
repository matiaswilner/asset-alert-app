import InfoTooltip from '../../ui/InfoTooltip'

const PNL_TOOLTIP = `El P&L (Profit & Loss) no realizado muestra cuánto ganaste o perdiste en tu portfolio hasta el momento, sin haber vendido nada.

Se calcula así: para cada activo, se toma el precio actual de mercado y se compara con tu precio promedio de compra (avg cost). La diferencia multiplicada por la cantidad de acciones que tenés es tu ganancia o pérdida en ese activo. La suma de todos los activos es el P&L total.

Ejemplo: compraste 10 acciones de SPY a $600 (invertiste $6,000). Hoy SPY vale $720. Tu P&L es (720 - 600) × 10 = +$1,200.

Se llama 'no realizado' porque mientras no vendas, es solo una ganancia en papel — el mercado puede subir o bajar y cambiar ese número.`

export default function PortfolioSummaryCards({ positions }) {
  if (!positions || positions.length === 0) return null

  const totalInvested = positions.reduce((sum, p) => {
    return sum + parseFloat(p.quantity) * parseFloat(p.avg_cost)
  }, 0)

  const totalValue = positions.reduce((sum, p) => sum + parseFloat(p.market_value), 0)
  const totalPnL = positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pnl), 0)
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  const winners = positions.filter(p => parseFloat(p.unrealized_pnl) > 0)
  const losers = positions.filter(p => parseFloat(p.unrealized_pnl) < 0)
  const neutral = positions.filter(p => parseFloat(p.unrealized_pnl) === 0)

  const winnersValue = winners.reduce((sum, p) => sum + parseFloat(p.market_value), 0)
  const losersValue = losers.reduce((sum, p) => sum + parseFloat(p.market_value), 0)
  const winnersPct = totalValue > 0 ? (winnersValue / totalValue) * 100 : 0
  const losersPct = totalValue > 0 ? (losersValue / totalValue) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* P&L Total */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            P&L Total no realizado
          </p>
          <InfoTooltip text={PNL_TOOLTIP} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '26px', fontWeight: '700', color: totalPnL >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: totalPnLPct >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Invertido</p>
            <p style={{ fontSize: '13px', fontWeight: '600' }}>${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Valor actual</p>
            <p style={{ fontSize: '13px', fontWeight: '600' }}>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Barra invertido vs valor actual */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ height: '6px', borderRadius: '999px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              borderRadius: '999px',
              background: totalPnL >= 0 ? 'var(--positive)' : 'var(--negative)',
              width: `${Math.min((totalValue / (totalInvested + Math.abs(totalPnL))) * 100, 100)}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Ganadoras vs Perdedoras */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Posiciones
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1, background: 'var(--positive-dim)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--positive)' }}>{winners.length}</p>
            <p style={{ fontSize: '11px', color: 'var(--positive)', marginTop: '2px' }}>Ganadoras</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{winnersPct.toFixed(1)}% del valor</p>
          </div>
          {neutral.length > 0 && (
            <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-tertiary)' }}>{neutral.length}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Neutras</p>
            </div>
          )}
          <div style={{ flex: 1, background: 'var(--negative-dim)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--negative)' }}>{losers.length}</p>
            <p style={{ fontSize: '11px', color: 'var(--negative)', marginTop: '2px' }}>Perdedoras</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{losersPct.toFixed(1)}% del valor</p>
          </div>
        </div>

        {/* Barra visual */}
        <div style={{ height: '6px', borderRadius: '999px', overflow: 'hidden', display: 'flex', gap: '2px' }}>
          <div style={{ flex: winnersPct, background: 'var(--positive)', borderRadius: '999px 0 0 999px' }} />
          <div style={{ flex: 100 - winnersPct - losersPct, background: 'var(--bg-tertiary)' }} />
          <div style={{ flex: losersPct, background: 'var(--negative)', borderRadius: '0 999px 999px 0' }} />
        </div>
      </div>

    </div>
  )
}

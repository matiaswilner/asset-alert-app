/**
 * Parser para Activity Statement de Interactive Brokers
 * Basado en el formato real del archivo CSV de IBKR
 * 
 * Estructura del CSV:
 * - Cada línea comienza con el nombre de la sección y el tipo de fila (Header/Data/Total/SubTotal)
 * - Open Positions: col[0]=sección, col[1]=tipo, col[2]=DataDiscriminator, col[3]=AssetCategory, col[4]=Currency, col[5]=Symbol...
 * - Trades: col[0]=sección, col[1]=tipo, col[2]=DataDiscriminator, col[3]=AssetCategory, col[4]=Currency, col[5]=Symbol, col[6]=DateTime...
 */

export function parseActivityStatement(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)

  const positions = []
  const trades = []
  let cashBalance = 0

  for (const line of lines) {
    const cols = parseCSVLine(line)
    if (cols.length < 2) continue

    const section = cols[0]?.trim()
    const rowType = cols[1]?.trim()

    if (rowType !== 'Data') continue

    // ─── Open Positions ───────────────────────────────────────────────────────
    // Columnas: [0]Section [1]Data [2]DataDiscriminator [3]AssetCategory [4]Currency
    //           [5]Symbol [6]Quantity [7]Mult [8]CostPrice [9]CostBasis
    //           [10]ClosePrice [11]Value [12]UnrealizedPnL [13]Code
    if (section === 'Open Positions') {
      const symbol = cols[5]?.trim()
      const assetCategory = cols[3]?.trim()
      const quantity = parseFloat(cols[6])
      const costPrice = parseFloat(cols[8])
      const closePrice = parseFloat(cols[10])
      const value = parseFloat(cols[11])
      const unrealizedPnl = parseFloat(cols[12])

      if (!symbol || !quantity || isNaN(quantity) || quantity === 0) continue

      positions.push({
        asset_symbol: symbol.toUpperCase(),
        asset_type: mapAssetCategory(assetCategory),
        quantity,
        avg_cost: isNaN(costPrice) ? 0 : costPrice,
        close_price: isNaN(closePrice) ? 0 : closePrice,
        market_value: isNaN(value) ? 0 : value,
        unrealized_pnl: isNaN(unrealizedPnl) ? 0 : unrealizedPnl,
      })
    }

    // ─── Trades ───────────────────────────────────────────────────────────────
    // Columnas: [0]Section [1]Data [2]DataDiscriminator [3]AssetCategory [4]Currency
    //           [5]Symbol [6]DateTime [7]Quantity [8]T.Price [9]C.Price
    //           [10]Proceeds [11]Comm/Fee [12]Basis [13]RealizedPnL [14]MTMPnL [15]Code
    if (section === 'Trades') {
      const dataDiscriminator = cols[2]?.trim()
      if (dataDiscriminator !== 'Order') continue // ignorar SubTotal y Total

      const symbol = cols[5]?.trim()
      const assetCategory = cols[3]?.trim()
      const dateTime = cols[6]?.trim()
      const quantity = parseFloat(cols[7])
      const tradePrice = parseFloat(cols[8])
      const commission = Math.abs(parseFloat(cols[11] || '0'))

      if (!symbol || !dateTime || isNaN(quantity) || quantity === 0) continue

      const tradeDate = parseDateFromIBKR(dateTime)
      if (!tradeDate) continue

      // Cantidad positiva = compra, negativa = venta (según documentación IBKR)
      const buySell = quantity >= 0 ? 'BUY' : 'SELL'

      trades.push({
        asset_symbol: symbol.toUpperCase(),
        asset_type: mapAssetCategory(assetCategory),
        trade_date: tradeDate,
        buy_sell: buySell,
        quantity: Math.abs(quantity),
        price: isNaN(tradePrice) ? 0 : tradePrice,
        commission: isNaN(commission) ? 0 : commission,
      })
    }

    // ─── Cash Report ─────────────────────────────────────────────────────────
    // Buscamos la línea de Ending Cash
    if (section === 'Cash Report') {
      const label = cols[2]?.trim()
      if (label === 'Ending Cash') {
        const amount = parseFloat(cols[3])
        if (!isNaN(amount)) cashBalance = amount
      }
    }
  }

  return { positions, trades, cashBalance }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapAssetCategory(assetCategory) {
  const ac = (assetCategory || '').toUpperCase()
  // IBKR usa "Stocks" para stocks y ETFs por igual
  // Usamos 'stock' como default — el tipo real se puede refinar contra asset_directory
  if (ac === 'STOCKS' || ac === 'STOCK' || ac === 'STK') return 'stock'
  if (ac === 'ETF') return 'etf'
  if (ac === 'CRYPTO' || ac === 'CRYPTOCURRENCY') return 'crypto'
  if (ac === 'FOREX' || ac === 'FX') return 'forex'
  return 'stock'
}

function parseDateFromIBKR(dateTime) {
  // Formato IBKR: "2026-03-09, 11:18:58" (con coma y espacio entre fecha y hora)
  // También puede ser: "2026-03-09" sin hora
  try {
    const datePart = dateTime.split(',')[0].trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
    return null
  } catch {
    return null
  }
}

function parseCSVLine(line) {
  // Parser de CSV que maneja campos con comillas y comas dentro de los valores
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

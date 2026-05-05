/**
 * Mapeo de símbolo a sector para el gráfico de distribución por sector
 * Default: 'Other' para símbolos no mapeados
 */

export const SECTOR_MAP = {
  // Technology
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', AVGO: 'Technology',
  AMD: 'Technology', INTC: 'Technology', QCOM: 'Technology', TXN: 'Technology',
  ORCL: 'Technology', CRM: 'Technology', ADBE: 'Technology', INTU: 'Technology',
  IBM: 'Technology', CSCO: 'Technology', NOW: 'Technology', SNOW: 'Technology',
  DDOG: 'Technology', NET: 'Technology', CRWD: 'Technology', ZS: 'Technology',
  PANW: 'Technology', PLTR: 'Technology', ARM: 'Technology', MU: 'Technology',
  AMAT: 'Technology', LRCX: 'Technology', KLAC: 'Technology', ADI: 'Technology',
  ASML: 'Technology', TSM: 'Technology', SAP: 'Technology',

  // Communication & Media
  GOOGL: 'Communication', GOOG: 'Communication', META: 'Communication',
  NFLX: 'Communication', SPOT: 'Communication', SNAP: 'Communication',
  PINS: 'Communication', RBLX: 'Communication',

  // Consumer Discretionary
  AMZN: 'Consumer', TSLA: 'Consumer', MCD: 'Consumer', NKE: 'Consumer',
  HD: 'Consumer', LOW: 'Consumer', BKNG: 'Consumer', ABNB: 'Consumer',
  UBER: 'Consumer', LYFT: 'Consumer', DASH: 'Consumer', TJX: 'Consumer',
  TM: 'Consumer',

  // Consumer Staples
  WMT: 'Consumer Staples', KO: 'Consumer Staples', PEP: 'Consumer Staples',
  PG: 'Consumer Staples', COST: 'Consumer Staples', MDLZ: 'Consumer Staples',

  // Healthcare
  JNJ: 'Healthcare', UNH: 'Healthcare', LLY: 'Healthcare', MRK: 'Healthcare',
  ABBV: 'Healthcare', ABT: 'Healthcare', TMO: 'Healthcare', DHR: 'Healthcare',
  SYK: 'Healthcare', BSX: 'Healthcare', ISRG: 'Healthcare', VRTX: 'Healthcare',
  REGN: 'Healthcare', AMGN: 'Healthcare', GILD: 'Healthcare', ZTS: 'Healthcare',
  CI: 'Healthcare', HUM: 'Healthcare', NVO: 'Healthcare',

  // Finance
  JPM: 'Finance', BAC: 'Finance', WFC: 'Finance', GS: 'Finance',
  MS: 'Finance', C: 'Finance', AXP: 'Finance', V: 'Finance',
  MA: 'Finance', PYPL: 'Finance', SQ: 'Finance', COIN: 'Finance',
  SCHW: 'Finance', BLK: 'Finance', SPGI: 'Finance', MCO: 'Finance',
  CME: 'Finance', AON: 'Finance', MMC: 'Finance', FI: 'Finance',
  AFRM: 'Finance', HOOD: 'Finance', SOFI: 'Finance', NU: 'Finance',
  STNE: 'Finance', PAGS: 'Finance', DLO: 'Finance', BAP: 'Finance',
  ITUB: 'Finance', BBD: 'Finance', GGAL: 'Finance', BMA: 'Finance',
  SUPV: 'Finance', IFS: 'Finance',

  // Energy
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', EOG: 'Energy',
  SLB: 'Energy', PBR: 'Energy', VIST: 'Energy', CEPU: 'Energy',

  // Industrials
  CAT: 'Industrials', GE: 'Industrials', HON: 'Industrials', RTX: 'Industrials',
  GD: 'Industrials', DE: 'Industrials', ITW: 'Industrials', MMM: 'Industrials',
  APH: 'Industrials',

  // Materials
  FCX: 'Materials', VALE: 'Materials', GGB: 'Materials', SID: 'Materials',
  LOMA: 'Materials', BIOX: 'Materials', AGRO: 'Materials',

  // Real Estate
  PLD: 'Real Estate', VNQ: 'Real Estate', XLRE: 'Real Estate', IRCP: 'Real Estate',

  // Utilities
  NEE: 'Utilities', SO: 'Utilities', DUK: 'Utilities',

  // Defense
  ITA: 'Defense', PPA: 'Defense', XAR: 'Defense',

  // Latin America (mixed sectors — agrupamos como región)
  MELI: 'Latin America', GLOB: 'Latin America', DESP: 'Latin America',
  CEPU: 'Latin America',

  // Crypto
  BTC: 'Crypto', ETH: 'Crypto', BNB: 'Crypto', SOL: 'Crypto',
  XRP: 'Crypto', ADA: 'Crypto', AVAX: 'Crypto', DOGE: 'Crypto',

  // ETFs — por categoría
  SPY: 'ETF Broad Market', VOO: 'ETF Broad Market', VTI: 'ETF Broad Market',
  QQQ: 'ETF Broad Market', IWM: 'ETF Broad Market', ACWI: 'ETF Broad Market',
  VT: 'ETF Broad Market', EEM: 'ETF Emerging Markets', EFA: 'ETF International',
  VEA: 'ETF International', VWO: 'ETF Emerging Markets', IEMG: 'ETF Emerging Markets',
  EWZ: 'ETF International', EWJ: 'ETF International', ARGT: 'ETF International',
  ILF: 'ETF Latin America',
  XLK: 'ETF Technology', VGT: 'ETF Technology', SMH: 'ETF Technology',
  SOXX: 'ETF Technology', IGV: 'ETF Technology', CIBR: 'ETF Technology',
  HACK: 'ETF Technology', SKYY: 'ETF Technology', CLOU: 'ETF Technology',
  AIQ: 'ETF Technology', BOTZ: 'ETF Technology', ARKK: 'ETF Technology',
  ARKG: 'ETF Technology', ARKW: 'ETF Technology', ARKF: 'ETF Technology',
  XLE: 'ETF Energy', OIH: 'ETF Energy', IEZ: 'ETF Energy', XOP: 'ETF Energy',
  XLF: 'ETF Finance', KRE: 'ETF Finance', KBE: 'ETF Finance', KBWB: 'ETF Finance',
  XLV: 'ETF Healthcare', IBB: 'ETF Healthcare', XBI: 'ETF Healthcare', IHI: 'ETF Healthcare',
  XLI: 'ETF Industrials', ITA: 'ETF Defense',
  XLC: 'ETF Communication', XLY: 'ETF Consumer', XLP: 'ETF Consumer Staples',
  XLU: 'ETF Utilities', XLB: 'ETF Materials', XLRE: 'ETF Real Estate',
  GLD: 'Commodities', SLV: 'Commodities', IAU: 'Commodities', USO: 'Commodities',
  GDX: 'Commodities', GDXJ: 'Commodities', LIT: 'Commodities', COPX: 'Commodities',
  TLT: 'Bonds', IEF: 'Bonds', SHY: 'Bonds', AGG: 'Bonds', BND: 'Bonds',
  LQD: 'Bonds', HYG: 'Bonds', JNK: 'Bonds', EMB: 'Bonds', TIPS: 'Bonds',
  BITO: 'Crypto ETF', IBIT: 'Crypto ETF', FBTC: 'Crypto ETF', GBTC: 'Crypto ETF',
  BKCH: 'Crypto ETF',
  IBKR: 'Finance', DXYZ: 'Technology',
}

export const SECTOR_COLORS = {
  'Technology': '#6366f1',
  'Communication': '#8b5cf6',
  'Consumer': '#ec4899',
  'Consumer Staples': '#f43f5e',
  'Healthcare': '#10b981',
  'Finance': '#3b82f6',
  'Energy': '#f59e0b',
  'Industrials': '#64748b',
  'Materials': '#84cc16',
  'Real Estate': '#06b6d4',
  'Utilities': '#14b8a6',
  'Defense': '#475569',
  'Latin America': '#f97316',
  'Crypto': '#eab308',
  'Commodities': '#a16207',
  'Bonds': '#94a3b8',
  'ETF Broad Market': '#4f46e5',
  'ETF Technology': '#7c3aed',
  'ETF Energy': '#d97706',
  'ETF Finance': '#2563eb',
  'ETF Healthcare': '#059669',
  'ETF Industrials': '#475569',
  'ETF Defense': '#334155',
  'ETF Communication': '#9333ea',
  'ETF Consumer': '#db2777',
  'ETF Consumer Staples': '#e11d48',
  'ETF Utilities': '#0d9488',
  'ETF Materials': '#65a30d',
  'ETF Real Estate': '#0891b2',
  'ETF International': '#0284c7',
  'ETF Emerging Markets': '#0369a1',
  'ETF Latin America': '#ea580c',
  'Crypto ETF': '#ca8a04',
  'Other': '#6b7280',
}

export function getSector(symbol) {
  return SECTOR_MAP[symbol?.toUpperCase()] || 'Other'
}

export function groupBySector(positions) {
  const sectors = {}

  for (const pos of positions) {
    const sector = getSector(pos.asset_symbol)
    if (!sectors[sector]) {
      sectors[sector] = { sector, value: 0, weight: 0, symbols: [] }
    }
    sectors[sector].value += parseFloat(pos.market_value || 0)
    sectors[sector].weight += parseFloat(pos.weight_pct || 0)
    sectors[sector].symbols.push(pos.asset_symbol)
  }

  return Object.values(sectors).sort((a, b) => b.value - a.value)
}

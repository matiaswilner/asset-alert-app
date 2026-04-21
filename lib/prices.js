import { supabaseServer as supabase } from './supabaseServer'
import { logError } from './logger'

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY
const BATCH_SIZE = 8

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRateLimitError(message = '') {
  return message.toLowerCase().includes('limit') ||
         message.toLowerCase().includes('credit') ||
         message.toLowerCase().includes('quota')
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseValues(symbol, values) {
  if (!values || values.length < 8) {
    throw new Error(`Insufficient data: got ${values?.length ?? 0} rows, need at least 8`)
  }

  const currentPrice = parseFloat(values[0].close)
  const yesterdayPrice = parseFloat(values[1].close)
  const weekAgoPrice = parseFloat(values[7].close)

  if (isNaN(currentPrice) || isNaN(yesterdayPrice) || isNaN(weekAgoPrice)) {
    throw new Error(`Invalid price data for ${symbol}: close prices contain NaN`)
  }

  const getMin = (days) => {
    const slice = values.slice(1, days + 1)
    const lows = slice.map(v => parseFloat(v.low)).filter(v => !isNaN(v))
    if (lows.length === 0) throw new Error(`No valid low prices for min${days}d calculation`)
    return Math.min(...lows)
  }

  return {
    symbol,
    currentPrice,
    changeDay: ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100,
    changeWeek: ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100,
    min14d: getMin(14),
    min30d: getMin(30),
    min60d: getMin(60),
    min90d: getMin(90),
    min180d: getMin(180),
  }
}

// ─── Supabase ────────────────────────────────────────────────────────────────

async function upsertPrice(symbol, assetType, priceData) {
  const { error } = await supabase.from('asset_prices').upsert({
    asset_symbol: symbol,
    asset_type: assetType,
    current_price: priceData.currentPrice,
    change_day: priceData.changeDay,
    change_week: priceData.changeWeek,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'asset_symbol' })

  if (error) {
    await logError({
      source: 'prices.js:upsertPrice',
      category: 'database',
      message: error.message,
      details: { symbol, assetType },
    })
  }
}

// ─── Yahoo Finance ───────────────────────────────────────────────────────────

async function fetchFromYahoo(symbol, assetType) {
  const yahooSymbol = assetType === 'crypto' ? `${symbol}-USD` : symbol
  const now = Math.floor(Date.now() / 1000)
  const start = now - (185 * 24 * 60 * 60)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${start}&period2=${now}&interval=1d`

  let response
  try {
    response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  } catch (err) {
    throw new Error(`Yahoo Finance network error for ${symbol}: ${err.message}`)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error(`Yahoo Finance returned invalid JSON for ${symbol}`)
  }

  const result = data?.chart?.result?.[0]
  if (!result) {
    const yahooError = data?.chart?.error?.description || 'No result in response'
    throw new Error(`Yahoo Finance: ${yahooError} for ${symbol}`)
  }

  const timestamps = result.timestamp
  const quotes = result.indicators.quote[0]

  if (!timestamps || !quotes) {
    throw new Error(`Yahoo Finance: missing timestamps or quotes for ${symbol}`)
  }

  const values = timestamps
    .map((ts, i) => ({
      close: quotes.close[i]?.toString(),
      low: quotes.low[i]?.toString(),
    }))
    .filter(v => v.close && v.low && v.close !== 'null' && v.low !== 'null')

  return parseValues(symbol, values)
}

// ─── Twelve Data ─────────────────────────────────────────────────────────────

async function fetchBatchFromTwelveData(symbols, assetTypes, batchIndex) {
  const symbolMap = {}
  const reverseMap = {}
  const adjustedSymbols = symbols.map((s, i) => {
    const adjusted = assetTypes[i] === 'crypto' ? `${s}/USD` : s
    symbolMap[s] = adjusted
    reverseMap[adjusted] = s
    return adjusted
  })

  const url = `https://api.twelvedata.com/time_series?symbol=${adjustedSymbols.join(',')}&interval=1day&outputsize=181&apikey=${TWELVE_DATA_API_KEY}`

  let response
  try {
    response = await fetch(url)
  } catch (err) {
    throw new Error(`Twelve Data network error: ${err.message}`)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Twelve Data returned invalid JSON')
  }

  if (data.status === 'error') {
    throw new Error(`Twelve Data API error: ${data.message}`)
  }

  const results = {}

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    const adjustedSymbol = symbolMap[symbol]
    const symbolData = symbols.length === 1 ? data : data[adjustedSymbol]

    if (!symbolData) {
      results[symbol] = { error: `No data returned for ${symbol} (key: ${adjustedSymbol})` }
      continue
    }

    if (symbolData.status === 'error') {
      results[symbol] = { error: `Twelve Data symbol error for ${symbol}: ${symbolData.message}` }
      continue
    }

    try {
      results[symbol] = parseValues(symbol, symbolData.values)
    } catch (err) {
      results[symbol] = { error: `Parse error for ${symbol}: ${err.message}` }
    }
  }

  return results
}

// ─── Core: getPrices (batch) ─────────────────────────────────────────────────

export async function getPrices(symbolsWithTypes) {
  const results = {}

  for (let i = 0; i < symbolsWithTypes.length; i += BATCH_SIZE) {
    const batch = symbolsWithTypes.slice(i, i + BATCH_SIZE)
    const symbols = batch.map(s => s.symbol)
    const assetTypes = batch.map(s => s.assetType)
    const batchIndex = Math.floor(i / BATCH_SIZE)

    let batchResults

    // Intento 1: Twelve Data batch
    try {
      batchResults = await fetchBatchFromTwelveData(symbols, assetTypes, batchIndex)
    } catch (twelveErr) {
      const rateLimit = isRateLimitError(twelveErr.message)

      await logError({
        source: 'prices.js:getPrices:fetchBatchFromTwelveData',
        category: 'external_api',
        message: twelveErr.message,
        details: {
          api: 'twelve_data',
          symbols,
          batch_index: batchIndex,
          is_rate_limit: rateLimit,
          fallback: 'yahoo_finance',
        },
      })

      // Fallback: Yahoo Finance por símbolo
      batchResults = {}
      for (let j = 0; j < symbols.length; j++) {
        const symbol = symbols[j]
        const assetType = assetTypes[j]
        try {
          batchResults[symbol] = await fetchFromYahoo(symbol, assetType)
        } catch (yahooErr) {
          await logError({
            source: 'prices.js:getPrices:fetchFromYahoo:fallback',
            category: 'external_api',
            message: yahooErr.message,
            details: {
              api: 'yahoo_finance',
              symbol,
              assetType,
              batch_index: batchIndex,
              original_twelve_error: twelveErr.message,
              fallback_success: false,
            },
          })
          batchResults[symbol] = { error: yahooErr.message }
        }
        if (j < symbols.length - 1) await sleep(500)
      }
    }

    // Procesar resultados del batch
    for (let j = 0; j < symbols.length; j++) {
      const symbol = symbols[j]
      const assetType = assetTypes[j]
      const result = batchResults[symbol]

      if (result?.error) {
        await logError({
          source: 'prices.js:getPrices:symbolError',
          category: 'external_api',
          message: result.error,
          details: { symbol, assetType, batch_index: batchIndex },
        })
        results[symbol] = { error: result.error }
      } else {
        await upsertPrice(symbol, assetType, result)
        results[symbol] = result
      }
    }

    if (i + BATCH_SIZE < symbolsWithTypes.length) await sleep(1000)
  }

  return results
}

// ─── Core: getPrice (single, mantiene compatibilidad) ────────────────────────

export async function getPrice(symbol, assetType) {
  // Intento 1: Twelve Data
  try {
    const batch = await fetchBatchFromTwelveData([symbol], [assetType], 0)
    const result = batch[symbol]
    if (result?.error) throw new Error(result.error)
    await upsertPrice(symbol, assetType, result)
    return result
  } catch (twelveErr) {
    const rateLimit = isRateLimitError(twelveErr.message)

    await logError({
      source: 'prices.js:getPrice:fetchBatchFromTwelveData',
      category: 'external_api',
      message: twelveErr.message,
      details: {
        api: 'twelve_data',
        symbol,
        assetType,
        is_rate_limit: rateLimit,
        fallback: 'yahoo_finance',
      },
    })

    // Intento 2: Yahoo Finance
    try {
      const result = await fetchFromYahoo(symbol, assetType)
      await upsertPrice(symbol, assetType, result)
      return result
    } catch (yahooErr) {
      await logError({
        source: 'prices.js:getPrice:fetchFromYahoo:fallback',
        category: 'external_api',
        message: yahooErr.message,
        details: {
          api: 'yahoo_finance',
          symbol,
          assetType,
          original_twelve_error: twelveErr.message,
          fallback_success: false,
        },
      })
      throw new Error(`Both APIs failed for ${symbol}. Twelve Data: ${twelveErr.message}. Yahoo: ${yahooErr.message}`)
    }
  }
}

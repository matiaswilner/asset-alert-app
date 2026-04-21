import { supabaseServer as supabase } from '../../lib/supabaseServer'
import { callHaiku, callSonnet, sendPushNotification } from '../../lib/ai'
import { buildSmartAlertEvalPrompt } from '../../lib/prompts/smartAlert'
import { buildAnalysisPrompt, ANALYSIS_PROMPT_VERSION } from '../../lib/prompts/analysis'
import { logError } from '../../lib/logger'

export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { symbol, assetType, currentPrice, previousPrice, changeDay, newsData, userId } = req.body

  if (!symbol || !newsData) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const startTime = Date.now()

  // Paso 1 — Haiku evalúa si notificar
  const evalPrompt = buildSmartAlertEvalPrompt({
    symbol,
    assetType,
    changeDay,
    changeWeek: '0',
    currentPrice,
    newsData,
  })

  let evaluation
  try {
    evaluation = await callHaiku(evalPrompt)
  } catch (err) {
    const elapsed = Date.now() - startTime
    const isTimeout = elapsed > 9000 || err.message?.toLowerCase().includes('timeout')
    await logError({
      source: 'analyze-watchlist-item.js:callHaiku',
      category: 'external_api',
      message: err.message,
      details: { symbol, elapsed_ms: elapsed, is_timeout: isTimeout, api: 'claude_haiku' },
    })
    return res.status(500).json({ error: err.message })
  }

  if (!evaluation.should_notify) {
    await supabase
      .from('watchlist_eval_queue')
      .update({ processed: true })
      .eq('asset_symbol', symbol)
      .eq('processed', false)

    return res.status(200).json({ symbol, status: 'skipped', reason: evaluation.reason })
  }

  // Paso 2 — Sonnet genera el análisis completo
  const analysisPrompt = buildAnalysisPrompt({
    symbol,
    priceChange: `${parseFloat(changeDay).toFixed(2)}%`,
    timeframe: '1 day',
    newsData,
    currentPrice,
    previousPrice,
  })

  let analysis
  try {
    analysis = await callSonnet(analysisPrompt)
  } catch (err) {
    const elapsed = Date.now() - startTime
    const isTimeout = elapsed > 9000 || err.message?.toLowerCase().includes('timeout')
    await logError({
      source: 'analyze-watchlist-item.js:callSonnet',
      category: 'external_api',
      message: err.message,
      details: { symbol, elapsed_ms: elapsed, is_timeout: isTimeout, api: 'claude_sonnet' },
    })
    return res.status(500).json({ error: err.message })
  }

  // Paso 3 — Guardar análisis
  const { error: insertError } = await supabase.from('alert_analyses').insert([{
    alert_id: null,
    asset_symbol: symbol,
    movement_type: analysis.context,
    summary: analysis.summary,
    explanation: analysis.explanation,
    context: analysis.context,
    interpretation: analysis.interpretation,
    recommendation: analysis.recommendation,
    score: analysis.score,
    confidence: analysis.confidence,
    triggered_by: 'smart_alert',
    prompt_version: ANALYSIS_PROMPT_VERSION,
    user_id: userId,
  }])

  if (insertError) {
    await logError({
      source: 'analyze-watchlist-item.js:insertAnalysis',
      category: 'database',
      message: insertError.message,
      details: { symbol, userId },
    })
  }

  // Paso 4 — Notificar
  await sendPushNotification({
    title: '🧠 Smart Alert',
    body: `${symbol}: ${analysis.recommendation} — ${analysis.summary}`,
    assetSymbol: symbol,
    triggeredBy: 'smart_alert',
    userId,
  })

  // Marcar como procesado
  await supabase
    .from('watchlist_eval_queue')
    .update({ processed: true })
    .eq('asset_symbol', symbol)
    .eq('processed', false)

  const elapsed = Date.now() - startTime
  return res.status(200).json({ symbol, status: 'notified', elapsed_ms: elapsed })
}

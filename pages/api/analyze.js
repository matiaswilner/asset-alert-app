import { supabaseServer as supabase } from '../../lib/supabaseServer'

const MOVEMENT_TYPES = {
  macro: 'macro',
  sector: 'sector',
  asset_specific: 'asset_specific',
}

async function fetchNews(symbol) {
  const response = await fetch(
    `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=${process.env.MARKETAUX_API_KEY}`
  )
  const data = await response.json()
  if (!data.data || data.data.length === 0) return 'No recent news found.'
  return data.data
    .slice(0, 5)
    .map(article => `- ${article.title}: ${article.description || ''}`)
    .join('\n')
}

async function analyzeWithClaude(symbol, priceChange, timeframe, newsData) {
  const prompt = `You are a financial assistant helping a long-term investor.
Context:
- The user invests in ETFs and some crypto-related assets
- The goal is to buy during dips, not to trade short-term
- The analysis has to be done in english, but translated to spanish when sent to the user

Asset: ${symbol}
Price change: ${priceChange}
Timeframe: ${timeframe}
Recent news:
${newsData}

Tasks:
1. Summarize what is happening in simple terms
2. Explain why the price moved
3. Determine if this is:
   - a general market movement
   - sector-specific
   - asset-specific
4. Provide a recommendation aligned with long-term investing:

Rules:
- Avoid trading advice
- Be cautious (no certainty)
- Focus on gradual buying opportunities
- Keep it simple

Output format (respond ONLY with this JSON, no extra text):
{
  "summary": "...",
  "explanation": "...",
  "context": "macro | sector | asset_specific",
  "recommendation": "..."
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  const text = data.content[0].text
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol, assetType, priceChange, timeframe, alertId, triggeredBy = 'manual' } = req.body

  if (!symbol || !priceChange || !timeframe) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const newsData = await fetchNews(symbol)
    const analysis = await analyzeWithClaude(symbol, priceChange, timeframe, newsData)

    const { data, error } = await supabase
      .from('alert_analyses')
      .insert([{
        alert_id: alertId || null,
        asset_symbol: symbol,
        movement_type: analysis.context,
        summary: analysis.summary,
        explanation: analysis.explanation,
        context: analysis.context,
        recommendation: analysis.recommendation,
        triggered_by: triggeredBy,
      }])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ analysis: data })
  } catch (err) {
    console.error('Analyze error:', err.message, err.stack)
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
}

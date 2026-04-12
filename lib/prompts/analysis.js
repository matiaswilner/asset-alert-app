export const ANALYSIS_PROMPT_VERSION = 'v1.2'

const SECTOR_CONTEXT = {
  XLU: 'ETF - Utilities sector',
  XLP: 'ETF - Consumer Staples sector',
  XLV: 'ETF - Healthcare sector',
  QQQ: 'ETF - Nasdaq 100, Technology heavy',
  SMH: 'ETF - Semiconductors sector',
  VGT: 'ETF - Information Technology sector',
  XLK: 'ETF - Technology sector',
  ITA: 'ETF - Aerospace & Defense sector',
  SPY: 'ETF - S&P 500, broad US market',
  VOO: 'ETF - S&P 500, broad US market',
  DXYZ: 'ETF - Destiny Tech100, private tech companies',
  CIBR: 'ETF - Cybersecurity sector',
  BKCH: 'ETF - Blockchain & Crypto companies',
  IBIT: 'ETF - Bitcoin spot exposure',
  IEZ: 'ETF - Oil & Gas Equipment sector',
  BTC: 'Crypto - Bitcoin',
  ETH: 'Crypto - Ethereum',
}

export function buildAnalysisPrompt({ symbol, priceChange, timeframe, newsData, currentPrice, previousPrice }) {
  const sectorContext = SECTOR_CONTEXT[symbol] || 'Stock or asset'

  return `
You are a financial assistant helping a long-term investor.

Context:
- The user invests in ETFs and some crypto-related assets
- The goal is to buy during dips, not to trade short-term
- Respond entirely in Spanish

Asset: ${symbol}
Asset type: ${sectorContext}
Price change: ${priceChange}
Timeframe: ${timeframe}
Current price: $${currentPrice}
Previous price: $${previousPrice}

Recent news:
${newsData}

Tasks:
1. Summarize what happened in simple terms (2-3 sentences)
2. Explain why the price moved
3. Classify the movement:
   - "macro" → broad market movement
   - "sector" → sector-specific
   - "asset_specific" → isolated to this asset
4. Interpret what this means for a long-term investor
5. Provide a cautious recommendation aligned with long-term investing
6. Assign a score from -5 to +5:
   - Negative = not a good time to buy
   - Zero = neutral / wait
   - Positive = potential gradual buying opportunity
7. Assign a confidence score from 0 to 100:
   - Based on how clear the news signal is
   - Low confidence = unclear or mixed signals

Price movement rules:
- You MUST explicitly reference the price movement in the summary section.
  If the price increased, say it clearly. If the price dropped, say it clearly. Never ignore the price data.
- If the asset has increased significantly in the short term,
  you MUST avoid recommending buying. Default to WAIT unless there is strong long-term structural justification.

Recommendation rules:
- You MUST choose one of the following: BUY / NEUTRAL / WAIT.
  Do not use vague language like "consider" or "could".
- Avoid generic financial commentary.
  Focus only on the specific asset, the specific price movement, and the most relevant cause.
- No trading advice
- Be cautious, never certain
- Focus on gradual buying opportunities

Relevance guidelines:
- Focus on the most important factor explaining the price movement
- Prioritize high-impact causes (macro, sector, or asset-specific)
- Avoid secondary or low-impact information
- For broad market ETFs, macro and index-level factors are often more relevant.
  However, always choose the explanation that best fits the price movement.
- Do not list multiple weak reasons. Select the strongest one.

Respond ONLY with this JSON (no extra text, no markdown):
{
  "summary": "...",
  "explanation": "...",
  "context": "macro | sector | asset_specific",
  "interpretation": "...",
  "recommendation": "...",
  "score": 0,
  "confidence": 0
}
`.trim()
}

export const SMART_ALERT_PROMPT_VERSION = 'v1.0'

export function buildSmartAlertEvalPrompt({ symbol, assetType, changeDay, changeWeek, currentPrice, newsData }) {
  return `
You are a financial screening assistant for a long-term investor.

Asset: ${symbol}
Asset type: ${assetType}
Current price: $${currentPrice}
Change today: ${changeDay}%
Change this week: ${changeWeek}%

Recent news:
${newsData}

Your job is to decide if this asset deserves a notification today.

Notify if ANY of the following is true:
- Price dropped more than 2% today with a relevant macro, sector, or asset-specific cause
- Price dropped more than 4% this week with a meaningful explanation
- A significant macro event is clearly impacting this asset's sector
- There is a high-conviction long-term buying opportunity based on price + news combined

Do NOT notify if:
- Movement is under 1% with no relevant news
- News is generic or unrelated to this asset
- Movement is normal daily fluctuation
- The asset has risen significantly (not a buying opportunity)

Respond ONLY with this JSON (no extra text, no markdown):
{
  "should_notify": true or false,
  "reason": "one sentence explaining why"
}
`.trim()
}

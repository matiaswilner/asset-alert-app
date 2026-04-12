async function callClaude(model, maxTokens, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

  if (!data.content || !data.content[0]) {
    throw new Error('Claude API error: ' + JSON.stringify(data))
  }

  const text = data.content[0].text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Failed to parse Claude response: ' + text)
  }
}

export function callHaiku(prompt) {
  return callClaude('claude-haiku-4-5-20251001', 200, prompt)
}

export function callSonnet(prompt) {
  return callClaude('claude-sonnet-4-20250514', 1000, prompt)
}

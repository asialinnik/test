export async function parseFood(text, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a nutrition expert. Estimate calories and macros for what the user ate.

User said: "${text.replace(/"/g, "'")}"

Reply with ONLY valid JSON, no markdown or explanation:
{"items":[{"name":"food name","calories":0,"protein":0,"carbs":0,"fat":0}],"total":{"calories":0,"protein":0,"carbs":0,"fat":0}}

Rules:
- All numbers are integers
- protein, carbs, fat are in grams
- If no portion mentioned, use a typical single serving
- Be accurate and reasonable`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 401) throw new Error('Invalid API key — check your key in Settings.')
    if (response.status === 429) throw new Error('Rate limit hit. Wait a moment and try again.')
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const raw = data.content[0].text.trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Unexpected response from AI — try again.')
  return JSON.parse(match[0])
}

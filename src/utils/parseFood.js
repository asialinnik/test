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

The text below is an automatic voice transcription and may contain recognition errors, especially with numbers and similar-sounding words. The user may speak English or German. Interpret what they most likely ate, silently correcting obvious mistranscriptions:
- Numbers misheard as words: "do"/"to"/"too" → "two", "for" → "four", "ate" → "eight", "won" → "one"
- German numbers: "zwei" = 2, "drei" = 3, "vier" = 4, etc.
- Prefer the simpler, more common food when a word is ambiguous (e.g. "two potatoes" is more likely than "sweet potatoes" unless "sweet" is clearly said)
- German food terms are fine (e.g. "Kartoffeln" = potatoes, "Hähnchen" = chicken, "Quark" = quark)

User said: "${text.replace(/"/g, "'")}"

Reply with ONLY valid JSON, no markdown or explanation. Use English food names in the output:
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

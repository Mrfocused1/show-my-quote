export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { line, fields = [], recentContext = [] } = req.body;
  if (!fields.length) return res.json({ fills: [] });

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  const fieldList = fields.map(f =>
    `key="${f.key}" label="${f.label}" type="${f.type}"` +
    (f.options?.length ? ` options=[${f.options.join(', ')}]` : '') +
    (f.type === 'priced-item' ? ` price=£${f.price} ${f.priceUnit === 'per_head' ? 'per head' : 'flat'}` : '')
  ).join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You analyse a live intake call. Extract field values from what the client just said and return a valid JSON object:
{ "fills": [ { "key": "...", "value": ... } ] }

Value format by type:
- toggle → true or false (boolean)
- number → integer
- priced-item → integer quantity (if client just confirms they want it without a number, return 1)
- multi-check → array of strings matching available options
- date → "DD Mon YYYY" (e.g. "14 Sep 2026")
- time → "HH:MM" 24h
- currency → numeric string (e.g. "3500")
- text / select → plain string

Use the conversation context to resolve short answers like "yes", "120", "June" to the correct field.

Available fields:\n${fieldList}

If nothing in this line answers any field, return { "fills": [] }.`,
          },
          {
            role: 'user',
            content: `Analyse this transcript line and respond in json.${
              recentContext.length
                ? `\n\nRecent conversation:\n${recentContext.map(l => `${l.speaker}: ${l.text}`).join('\n')}`
                : ''
            }\n\nLatest line:\n${line}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(JSON.parse(data.choices[0].message.content));
  } catch {
    res.json({ fills: [] });
  }
}

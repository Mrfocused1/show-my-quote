export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { line, fields = [], recentContext = [] } = req.body;
  if (!fields.length) return res.json({ fills: [] });

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  // Formula and layout fields cannot be filled by AI
  const SKIP_TYPES = ['formula','section-header','divider','instructions'];
  const fillable = fields.filter(f => !SKIP_TYPES.includes(f.type));
  if (!fillable.length) return res.json({ fills: [] });

  const fieldList = fillable.map(f =>
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
- text / select → plain string
- long-text → full transcribed multi-sentence text, preserve exact wording
- email → valid email string (e.g. "jane@example.com")
- phone → formatted phone number string (e.g. "+44 7700 900123")
- url → full URL string including https:// (e.g. "https://example.com")
- address → full address as a single string (e.g. "12 Main St, London, SW1A 1AA")
- toggle → true or false (boolean)
- number → integer
- decimal → numeric string with decimals (e.g. "24.5")
- currency → numeric string (e.g. "3500")
- percentage → numeric string without % symbol (e.g. "20" means 20%)
- rating → integer 1–5
- slider → integer within the field's implied range
- priced-item → integer quantity (if client confirms without a number, return 1)
- multi-check → array of strings matching available options
- date → "DD Mon YYYY" (e.g. "14 Sep 2026")
- time → "HH:MM" 24h format
- datetime → ISO 8601 string "YYYY-MM-DDTHH:MM" (e.g. "2027-06-15T14:00")
- duration → JSON object { "hours": N, "minutes": N }

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

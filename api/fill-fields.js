export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { line, transcript, fields = [], recentContext = [], replaceAll = false } = req.body;
  if (!fields.length) return res.json({ fills: [] });

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  // Formula and layout fields cannot be filled by AI
  const SKIP_TYPES = ['formula','section-header','divider','instructions','menu-checklist'];
  const fillable = fields.filter(f => !SKIP_TYPES.includes(f.type));
  if (!fillable.length) return res.json({ fills: [] });

  const fieldList = fillable.map(f =>
    `key="${f.key}" label="${f.label}" type="${f.type}"` +
    (f.options?.length ? ` options=[${f.options.join(', ')}]` : '') +
    (f.type === 'priced-item' ? ` price=£${f.price} ${f.priceUnit === 'per_head' ? 'per head' : 'flat'}` : '') +
    (f.hint ? ` IMPORTANT: ${f.hint}` : '')
  ).join('\n');

  // Build the conversation input
  const isFullTranscript = Array.isArray(transcript) && transcript.length > 0;
  const conversationText = isFullTranscript
    ? transcript.map(l => `${l.speaker}: ${l.text}`).join('\n')
    : (recentContext.length
        ? `${recentContext.map(l => `${l.speaker}: ${l.text}`).join('\n')}\n\nLatest line:\n${line}`
        : line);

  const systemPrompt = replaceAll
    ? `You analyse a full call transcript to extract form field values. Read the ENTIRE conversation and determine the best value for EACH field. Return a JSON object:
{ "fills": [ { "key": "...", "value": ... } ] }

For EVERY field in the list:
- If the conversation clearly states a value → return it
- If the value was mentioned then corrected → return the corrected value
- If the field is explicitly not applicable (e.g. "no dietary requirements") → return "None" for text fields or false for toggles
- If the field was never mentioned and cannot be inferred → omit it from fills (do NOT include it)

CRITICAL RULES — follow exactly:
- SILENCE = OMIT. If a topic was never raised in the conversation, do NOT include that field in fills. Do NOT return "None", "N/A", or any placeholder.
- "None" is ONLY valid when the speaker explicitly confirmed it — e.g. "I have no dietary requirements", "no bar needed". Silence is not "None".
- A field with IMPORTANT instruction saying "Only fill if explicitly stated" is ABSOLUTE — never infer a value for it. Only include it if the speaker literally named a value.
- When in doubt → OMIT the field.

Value format by type:
- text / select → plain string
- long-text → full multi-sentence text
- email → valid email string
- phone → formatted phone number
- url → full URL with https://
- address → full address as single string
- toggle → true or false (boolean)
- number → integer
- decimal → numeric string with decimals
- currency → numeric string
- percentage → numeric string without % symbol
- rating → integer 1–5
- slider → integer within implied range
- priced-item → integer quantity
- multi-check → array of strings matching available options
- date → "DD Mon YYYY" (e.g. "14 Sep 2026")
- time → "HH:MM" 24h format
- datetime → ISO 8601 "YYYY-MM-DDTHH:MM"
- duration → { "hours": N, "minutes": N }

Guest count handling: if someone says "90% adults, 10% children out of 200 guests", calculate: adults = 180, children = 20.
Percentage handling: if guest counts are given as percentages, compute actual numbers from total.

Available fields:
${fieldList}`
    : `You analyse a live intake call. Extract field values from what was just said and return a valid JSON object:
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

CRITICAL RULES:
- Only fill a field if a direct answer was given. Do NOT infer or guess.
- Do NOT return "None" unless the speaker explicitly said there is none. If nothing was said for a field, omit it.
- A field with IMPORTANT: "Only fill if explicitly stated" → only fill with direct words from the conversation, never infer.

Available fields:
${fieldList}

If nothing in this line answers any field, return { "fills": [] }.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: isFullTranscript && replaceAll
              ? `Analyse this full conversation transcript and extract ALL field values:\n\n${conversationText}`
              : `Analyse this transcript line and respond in json.\n\n${conversationText}`,
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

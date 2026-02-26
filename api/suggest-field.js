const VALID_TYPES = ['text','number','currency','date','time','toggle','select','multi-check','priced-item'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { line, recentContext = [], existingLabels = [] } = req.body;
  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  const existingNote = existingLabels.length
    ? `\n\nFields already extracted (do NOT suggest these again or near-duplicates):\n${existingLabels.join(', ')}`
    : '';

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
            content: `You analyse transcripts from discovery calls with service business owners (caterers, photographers, florists, venues, etc). They are describing what information they collect from their own clients. Always respond with a valid JSON object.

CRITICAL: Extract EVERY NEW intake field mentioned — one block of speech often contains many fields at once.${existingNote}

KEY PATTERNS TO RECOGNISE:
1. Rapid-fire oral lists — business owners often rattle off many fields in one breath with no punctuation. Treat each item as a separate field. E.g. "we ask name email date type of event" → 4 fields.
2. Question form — "what's your name / what's your email / when is the event" → extract the implied field for each.
3. Phrase form — "I ask about their name, the date, how many guests" → extract each.
4. Speech-to-text has no punctuation and may mis-hear words ("should" may mean "and" or "or"). Use context to infer intent.
5. Conditional yes/no — "do you have allergies / do you bring your own waiter" → toggle fields.

Common fields — extract these even if only briefly mentioned:
- "name" / "what's your name" → Client Name (text)
- "email" → Client Email (text)
- "phone" / "contact number" → Phone Number (text)
- "date" / "when" / "event date" → Event Date (date)
- "time" / "start time" / "arrival" → Start Time (time)
- "type of event" / "what's the occasion" → Event Type (select/text)
- "how many" / "guests" / "headcount" / "people" → Guest Count (number)
- "venue" / "location" / "where" → Venue (text)
- "budget" / "spend" → Budget (currency)
- "course" / "3-course" / "buffet" / "meal style" → Meal Style (select)
- "food type" / "cuisine" → Food Type (text)
- "allergies" / "dietary" / "requirements" → Dietary Requirements (multi-check)
- "drinks" / "bar" / "bring own drinks" → Drinks Provided (toggle or select)
- "waiter" / "staff" / "servers" → Waiter Provided (toggle)
- "entertainment" → Entertainment Options (text)

Return:
{
  "suggest": true,
  "fields": [
    {
      "label": "concise field name",
      "type": "text" | "number" | "currency" | "date" | "time" | "toggle" | "select" | "multi-check" | "priced-item",
      "options": ["Option A", "Option B"],
      "price": 45,
      "priceUnit": "per_head" | "flat"
    }
  ]
}

Type rules:
- "date" for any date/when/anniversary
- "time" for start/arrival/finish/setup times
- "number" for guest count, headcount, quantity, staff count
- "currency" for budget, spend, total cost
- "toggle" for yes/no questions (allergies present, speeches, disabled access, bring own drinks, bring own waiter)
- "select" for single-choice from fixed options (service style, package tier, meal course count)
- "multi-check" for multiple-choice selections (dietary requirements, food preferences)
- "priced-item" for specific food dishes, drinks, or menu items with a price
- "text" for everything else (names, email, phone, venue, free-text notes)

Only include "options" for select/multi-check. Only include "price"/"priceUnit" for priced-item.

Only return { "suggest": false } when the line is PURELY small talk (greetings, filler words like "okay", "that's great", "sure") with absolutely no intake fields at all.`,
          },
          {
            role: 'user',
            content: `Analyse this transcript line and respond in json.${
              recentContext.length
                ? `\n\nRecent context (for understanding continuations):\n${recentContext.map(l => `${l.speaker}: ${l.text}`).join('\n')}`
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
    const result = JSON.parse(data.choices[0].message.content);

    // Normalise old {field} shape
    if (result.suggest && result.field && !result.fields) {
      result.fields = [result.field];
    }
    // Sanitise types
    if (result.fields) {
      result.fields = result.fields.map(f => ({
        ...f,
        type: VALID_TYPES.includes(f.type) ? f.type : 'text',
      }));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

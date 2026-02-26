const VALID_TYPES = [
  'text','number','currency','date','time','toggle','select','multi-check','priced-item',
  'long-text','email','phone','url','decimal','percentage','rating','slider',
  'datetime','duration','address','formula','section-header','divider','instructions',
];

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
4. Speech-to-text has no punctuation and may mis-hear words. Use context to infer intent.
5. Conditional yes/no — "do you have allergies / do you bring your own waiter" → toggle fields.
6. Formula detection — if someone describes a value that is CALCULATED from other values, output type="formula". Examples:
   - "the total is guest count times price per head" → { label: "Total", type: "formula", formulaExpression: "{Guest Count} * {Price Per Head}", suggested: true }
   - "deposit is 20 percent of the total" → { label: "Deposit", type: "formula", formulaExpression: "{Total} * 0.2", suggested: true }
   - "setup fee is 50 flat plus 5 per head" → { label: "Setup Fee", type: "formula", formulaExpression: "50 + ({Guest Count} * 5)", suggested: true }
   Always set suggested=true for formula fields. Use {Label} references matching known field labels exactly.
7. Slider detection — if someone mentions a NUMERIC RANGE with two boundary values, use type="slider" with sliderMin and sliderMax. NEVER use toggle for these. Examples:
   - "deposit of three to six months" / "3 to 6 months" → { label: "Deposit (months)", type: "slider", sliderMin: 3, sliderMax: 6 }
   - "one to five years employment history" / "6 month employment history" → { label: "Employment History (months)", type: "slider", sliderMin: 6, sliderMax: 24 }
   - "at least 3 months deposit" → { label: "Deposit (months)", type: "slider", sliderMin: 3, sliderMax: 12 }
   - "1 to 3 year tenancy" → { label: "Tenancy Length (years)", type: "slider", sliderMin: 1, sliderMax: 3 }
   - A question about COMFORTABILITY WITH a range → still slider, not toggle.

Common fields — extract these even if only briefly mentioned:
- "name" / "what's your name" → Client Name (text)
- "email" / "email address" → Client Email (email)
- "phone" / "mobile" / "contact number" → Phone Number (phone)
- "website" / "url" / "social media" → Website (url)
- "notes" / "comments" / "description" / "special requirements" → Notes (long-text)
- "address" / "venue address" / "full address" / "postcode" → Address (address)
- "date" / "when" / "event date" → Event Date (date)
- "time" / "start time" / "arrival" → Start Time (time)
- "type of event" / "what's the occasion" → Event Type (select/text)
- "how many" / "guests" / "headcount" / "people" → Guest Count (number)
- "venue" / "location" / "where" → Venue (text)
- "budget" / "spend" → Budget (currency)
- "duration" / "how long" / "event length" → Event Duration (duration)
- "percent" / "discount" / "VAT" / "tax rate" → Percentage (percentage)
- "rating" / "out of 5" / "star rating" → Rating (rating)
- "course" / "3-course" / "buffet" / "meal style" → Meal Style (select)
- "food type" / "cuisine" → Food Type (text)
- "allergies" / "dietary" / "requirements" → Dietary Requirements (multi-check)
- "drinks" / "bar" / "bring own drinks" → Drinks Provided (toggle or select)
- "waiter" / "staff" / "servers" → Waiter Provided (toggle)

Return:
{
  "suggest": true,
  "fields": [
    {
      "label": "concise field name",
      "type": "text" | "number" | "currency" | "date" | "time" | "toggle" | "select" | "multi-check" | "priced-item" | "long-text" | "email" | "phone" | "url" | "decimal" | "percentage" | "rating" | "slider" | "datetime" | "duration" | "address" | "formula",
      "options": ["Option A", "Option B"],
      "price": 45,
      "priceUnit": "per_head" | "flat",
      "formulaExpression": "{Field A} * {Field B}",
      "sliderMin": 0,
      "sliderMax": 100,
      "suggested": true,
      "content": "text content"
    }
  ]
}

Type rules:
- "email" for any email address field
- "phone" for any telephone/mobile field
- "url" for any website/link field
- "long-text" for free-text notes, comments, descriptions, special requirements (anything needing multi-line answer)
- "address" for any full address, venue address, postcode/zip
- "date" for any date/when/anniversary
- "time" for start/arrival/finish/setup times
- "datetime" for date + time together
- "number" for guest count, headcount, quantity, staff count (whole numbers)
- "decimal" for measurements, weights, distances (decimal numbers)
- "currency" for budget, spend, total cost
- "percentage" for rates, discounts, percentages, VAT, tax rates, service charges
- "rating" for star ratings, scores out of N
- "duration" for event duration, how long it lasts (hours/minutes)
- "slider" for any NUMERIC RANGE question — deposit months, employment years, tenancy length, price range. Set sliderMin and sliderMax to the numeric boundaries. NEVER use toggle when a range is mentioned.
- "toggle" for binary yes/no questions with NO numeric range (e.g. do you have pets, are you employed, do you have criminal record)
- "select" for single-choice from fixed options (service style, package tier, meal course count)
- "multi-check" for multiple-choice selections (dietary requirements, food preferences)
- "priced-item" for specific food dishes, drinks, or menu items with a price
- "formula" for calculated values derived from other fields — ALWAYS set suggested=true
- "text" for everything else (names, free-text)

Only include "options" for select/multi-check. Only include "price"/"priceUnit" for priced-item. Only include "formulaExpression" and "suggested" for formula. Only include "sliderMin"/"sliderMax" for slider. Only include "content" for section-header/instructions.

Only return { "suggest": false } when the line is PURELY small talk with absolutely no intake fields.`,
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
    // Sanitise types and forward new properties
    if (result.fields) {
      result.fields = result.fields.map(f => ({
        ...f,
        type: VALID_TYPES.includes(f.type) ? f.type : 'text',
        formulaExpression: f.type === 'formula' ? (f.formulaExpression || '') : undefined,
        suggested: f.type === 'formula' ? (f.suggested !== false) : undefined,
        content: ['section-header','instructions'].includes(f.type) ? (f.content || '') : undefined,
        sliderMin: f.type === 'slider' ? (typeof f.sliderMin === 'number' ? f.sliderMin : 0) : undefined,
        sliderMax: f.type === 'slider' ? (typeof f.sliderMax === 'number' ? f.sliderMax : 100) : undefined,
      }));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { transcript = [], currentFields = [] } = req.body;
  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  const transcriptText = transcript.map(l => `${l.speaker}: ${l.text}`).join('\n');
  const existing = currentFields.map(f =>
    `label="${f.label}" type="${f.type}"` +
    (f.options?.length ? ` options=[${f.options.join(', ')}]` : '') +
    (f.type === 'priced-item' ? ` price=£${f.price} ${f.priceUnit}` : '') +
    (f.type === 'formula' ? ` formulaExpression="${f.formulaExpression}"` : '')
  ).join('\n') || '(none yet)';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are reviewing a completed discovery call transcript. Return a valid JSON object with two keys:

"fields": clean, deduplicated array of ALL data points the owner mentioned. Each field:
{
  "label": string,
  "type": one of text/number/currency/date/time/toggle/select/multi-check/priced-item/long-text/email/phone/url/decimal/percentage/rating/slider/datetime/duration/address/formula,
  "options": [] (only for select/multi-check),
  "price": number (only for priced-item),
  "priceUnit": "per_head"|"flat" (only for priced-item),
  "formulaExpression": "{Field A} * {Field B}" (only for formula),
  "suggested": true (only for formula),
  "sliderMin": number (only for slider),
  "sliderMax": number (only for slider),
  "content": "string" (only for section-header/instructions)
}

"summary": 2-3 sentence plain-English summary of what this business collects.

Rules:
- Merge duplicates (e.g. "Event Date" and "Date of Event" → one field)
- Correct wrong types:
  - guest count, quantities → "number" not "text"
  - email addresses → "email" not "text"
  - phone numbers → "phone" not "text"
  - URLs/websites → "url" not "text"
  - Notes/Special Requirements → "long-text" not "text"
  - Full addresses → "address" not "text"
  - budget/spend → "currency" not "text" or "number"
  - yes/no questions → "toggle" not "text"
  - ANY field mentioning a NUMERIC RANGE (e.g. "3 to 6 months deposit", "6 month employment history", "1-3 year tenancy") → "slider" with sliderMin/sliderMax, NOT toggle or text
- Add clearly mentioned fields that were missed
- Remove false positives from small talk
- Preserve the order fields were first mentioned`,
          },
          {
            role: 'user',
            content: `Analyse this transcript in json and return the final field list.\n\nTranscript:\n${transcriptText}\n\nFields detected so far:\n${existing}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(JSON.parse(data.choices[0].message.content));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { transcript = [], fields = [], fieldValues = {}, niche = null, menuItems = [] } = req.body || {};
  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  const txText = transcript.map(l => `${l.speaker}: ${l.text}`).join('\n');
  const fieldSummary = fields.map(f =>
    `${f.label}: ${fieldValues[f.key] !== undefined && fieldValues[f.key] !== '' ? fieldValues[f.key] : '(not captured)'}`
  ).join('\n') || '(no fields)';

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
            content: `You are an assistant for a ${niche || 'wedding vendor'} who just finished a client discovery call. Return a JSON object with exactly these keys:

"summary": 2-3 sentence plain-English summary of the call, mentioning the key details captured.
"sms": a warm, professional ready-to-send SMS (max 160 chars) referencing specific details from the call.
"email": object with "subject" (short email subject line) and "body" (a 3-4 paragraph follow-up email, professional and personalised to the call details, ending with a clear next-step CTA).
"invoiceItems": array of suggested invoice line items based on what was discussed. For catering, create one line item per food course/category ordered (e.g. starters, mains, desserts) with qty as guest count and rate as total cost. Each item: { "description": string, "qty": number, "rate": string (e.g. "£1,600 (200 × £8pp)") }.

Use the actual names, dates, venues and details from the transcript in every message. Keep tone warm and professional.`,
          },
          {
            role: 'user',
            content: `Transcript:\n${txText}\n\nCaptured data:\n${fieldSummary}${menuItems?.length ? `\n\nSelected menu items:\n${menuItems.join('\n')}` : ''}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(28000),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(JSON.parse(data.choices[0].message.content));
  } catch (err) {
    console.error('demo-analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

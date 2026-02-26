export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, sessionName, transcript = [], fields = [], fieldValues = {} } = req.body;
  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  if (!['sms', 'email', 'invoice'].includes(type)) {
    return res.status(400).json({ error: 'type must be sms, email, or invoice' });
  }

  // Build a human-readable summary of the form data
  const SKIP_TYPES = ['formula', 'section-header', 'divider', 'instructions'];
  const formSummary = fields
    .filter(f => !SKIP_TYPES.includes(f.type))
    .map(f => {
      const v = fieldValues[f.key];
      if (v === undefined || v === '' || v === null) return null;
      let displayVal = v;
      if (f.type === 'toggle') displayVal = v ? 'Yes' : 'No';
      else if (f.type === 'multi-check') displayVal = Array.isArray(v) ? v.join(', ') : v;
      else if (f.type === 'priced-item') {
        const qty = parseInt(v) || 0;
        displayVal = f.price > 0 ? `${qty} × £${f.price} = £${(f.price * qty).toFixed(2)}` : qty;
      }
      else if (f.type === 'currency') displayVal = `£${v}`;
      else if (f.type === 'percentage') displayVal = `${v}%`;
      else if (f.type === 'rating') displayVal = `${v}/5`;
      else if (f.type === 'duration') displayVal = v?.hours !== undefined ? `${v.hours || 0}h ${v.minutes || 0}m` : v;
      return `${f.label}: ${displayVal}`;
    })
    .filter(Boolean)
    .join('\n');

  const transcriptText = transcript
    .map(l => `${l.speaker}: ${l.text}`)
    .join('\n');

  // Compute priced total for invoice
  const pricedTotal = fields
    .filter(f => f.type === 'priced-item' && f.price > 0)
    .reduce((sum, f) => {
      const qty = parseInt(fieldValues[f.key]) || 0;
      return sum + f.price * qty;
    }, 0);

  const systemPrompts = {
    sms: `You are writing a brief, warm SMS follow-up from a catering business to a client.
Keep it under 160 characters where possible, friendly and professional.
Include the client's name if known, mention the event briefly, and let them know a quote is coming.
No emojis unless they feel natural.
Return only the SMS text — no extra explanation.`,

    email: `You are writing a professional follow-up email from a catering business to a client after an initial enquiry call.
Use a warm, professional tone. Structure:
1. Brief greeting and thanks for calling
2. Short recap of what was discussed (event type, date, guest count, key requirements)
3. Mention that a formal quote will follow
4. Clear call to action (reply with questions, confirm details)
5. Sign off with "Warm regards," and leave the name blank as "[Your Name]"
Return only the email body (no subject line needed). Use line breaks for readability.`,

    invoice: `You are generating a clean, professional catering quote/invoice summary.
Structure it as follows:
- Header: "QUOTE — [Session/Event Name]" and today's date
- Client details section (name, event type, date, venue if known)
- Itemised list of services/items with quantities and prices if available
- Subtotal and any notes about VAT or deposits
- Total amount (if computable from the data)
- Footer: "This quote is valid for 14 days. To confirm your booking please reply to this email."
Return plain text with clear spacing. Use £ for currency.`,
  };

  const userContent = `${type === 'sms' ? 'Session' : 'Enquiry'}: ${sessionName || 'Untitled'}

Form data collected:
${formSummary || '(no form data available)'}

${pricedTotal > 0 ? `Priced total: £${pricedTotal.toFixed(2)}\n` : ''}${transcriptText ? `\nCall transcript:\n${transcriptText}` : ''}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompts[type] },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

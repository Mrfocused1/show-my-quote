import { setCors, requireApiKey } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OpenAI API key not configured' });

  const { business_name, city, state, phone, website, rating, reviews_count } = req.body || {};
  if (!business_name) return res.status(400).json({ error: 'business_name required' });

  const location = [city, state].filter(Boolean).join(', ') || 'Texas';
  const siteHint = website ? ` Their website is ${website}.` : '';
  const ratingHint = rating ? ` They have a ${rating}/5 rating with ${reviews_count || 0} Google reviews.` : '';

  const prompt = `You are a sales research assistant helping a SaaS founder cold call roofing contractors.

Research this business and generate a personalised cold call brief:

Business: ${business_name}
Location: ${location}
Phone: ${phone || 'unknown'}${siteHint}${ratingHint}

The product being sold is "Show My Quote" — an AI tool that listens silently on phone calls and automatically fills out quote forms in real time, so the roofer never has to type while on a call. Quotes are built before the call ends.

Return a JSON object with exactly these fields:
{
  "ownerName": "First name if findable, otherwise null",
  "companySize": "Estimate: sole trader / small (2-5) / medium (6-20) / large (20+)",
  "yearsInBusiness": "Estimate if findable, otherwise null",
  "painPoints": ["3-4 specific pain points this roofer likely faces around quoting and admin"],
  "callOpener": "A natural 2-sentence cold call opener personalised to this specific company",
  "talkingPoints": ["4-5 specific talking points for Show My Quote tailored to a roofer in this location"],
  "objectionHandling": ["3 likely objections and how to handle each, formatted as 'Objection: ... → Response: ...'"]
}

Only return the raw JSON, no markdown, no explanation.`;

  try {
    // Try Responses API with web search first (best for finding owner names / current info)
    let research = null;

    try {
      const responsesRes = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          tools: [{ type: 'web_search_preview' }],
          input: prompt,
        }),
      });
      if (responsesRes.ok) {
        const d = await responsesRes.json();
        const text = d.output?.find(o => o.type === 'message')?.content?.find(c => c.type === 'output_text')?.text || '';
        if (text) research = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      }
    } catch {}

    // Fallback: standard chat completions (no web search, still good for scripts)
    if (!research) {
      const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });
      if (!chatRes.ok) {
        const err = await chatRes.text();
        return res.status(502).json({ error: 'OpenAI error: ' + err });
      }
      const d = await chatRes.json();
      const text = d.choices?.[0]?.message?.content || '{}';
      research = JSON.parse(text);
    }

    return res.json({ research });
  } catch (err) {
    console.error('[leads-research] error:', err);
    return res.status(500).json({ error: err.message });
  }
}

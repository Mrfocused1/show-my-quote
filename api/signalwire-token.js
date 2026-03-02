import { setCors, requireApiKey } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireApiKey(req, res)) return;

  // Proxy through Railway server — Vercel's IPs are blocked by SignalWire's token endpoint
  const railwayUrl = process.env.TRANSCRIPTION_SERVER_URL || 'https://smq-transcription-production.up.railway.app';

  try {
    const response = await fetch(`${railwayUrl}/token`);
    if (!response.ok) {
      const err = await response.text();
      console.error('Railway token proxy error:', response.status, err);
      return res.status(502).json({ error: 'Failed to generate token' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Railway token proxy fetch error:', err.message);
    res.status(502).json({ error: 'Token proxy unavailable' });
  }
}

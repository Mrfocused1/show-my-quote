import { setCors, requireApiKey } from './_lib/auth.js';

export const config = { api: { bodyParser: false } };

/**
 * POST /api/transcribe-remote
 * Body: raw audio bytes (audio/webm, audio/wav, etc.)
 *
 * Sends audio to OpenAI Whisper-1 and returns { text }.
 * Used by the demo page to transcribe the remote party's voice during
 * outbound calls (where no server-side <Stream> LaML is available).
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ text: '' });

  // Read raw body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const audioBuffer = Buffer.concat(chunks);

  if (audioBuffer.length < 500) return res.json({ text: '' });

  try {
    const contentType = req.headers['content-type'] || 'audio/webm';
    const ext = contentType.includes('wav') ? 'wav' : contentType.includes('ogg') ? 'ogg' : 'webm';

    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: contentType }), `audio.${ext}`);
    form.append('model', 'whisper-1');
    form.append('language', 'en');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[transcribe-remote] OpenAI error:', resp.status, err.slice(0, 200));
      return res.json({ text: '' });
    }

    const data = await resp.json();
    const text = (data.text || '').trim();
    console.log('[transcribe-remote] Transcribed:', text.slice(0, 80));
    return res.json({ text });
  } catch (err) {
    console.error('[transcribe-remote] Error:', err.message);
    return res.json({ text: '' });
  }
}

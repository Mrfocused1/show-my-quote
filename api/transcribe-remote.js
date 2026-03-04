import { setCors, requireApiKey } from './_lib/auth.js';

export const config = { api: { bodyParser: false } };

/**
 * POST /api/transcribe-remote
 * Body: raw audio bytes (audio/webm from browser MediaRecorder)
 *
 * Proxies audio to the self-hosted Faster Whisper server on the VPS.
 * Free — no OpenAI charges.
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const wsUrl = process.env.TRANSCRIPTION_WS_URL;
  if (!wsUrl) return res.json({ text: '' });

  // wss://transcribe.showmyquote.com → https://transcribe.showmyquote.com
  const httpBase = wsUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const audioBuffer = Buffer.concat(chunks);

  if (audioBuffer.length < 500) return res.json({ text: '' });

  try {
    const resp = await fetch(`${httpBase}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'audio/webm',
        'x-smq-key': process.env.SMQ_API_KEY || '',
      },
      body: audioBuffer,
    });

    if (!resp.ok) {
      console.error('[transcribe-remote] VPS error:', resp.status);
      return res.json({ text: '' });
    }

    const data = await resp.json();
    const text = (data.text || '').trim();
    console.log('[transcribe-remote] Transcribed via VPS:', text.slice(0, 80));
    return res.json({ text });
  } catch (err) {
    console.error('[transcribe-remote] Error:', err.message);
    return res.json({ text: '' });
  }
}

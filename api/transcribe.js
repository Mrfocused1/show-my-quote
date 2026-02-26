export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { audio, filename = 'audio.webm' } = req.body;
  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  if (!audio) return res.status(400).json({ error: 'No audio provided' });

  try {
    const buffer = Buffer.from(audio, 'base64');
    const blob = new Blob([buffer], { type: 'audio/webm' });

    const form = new FormData();
    form.append('file', blob, filename);
    form.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json({ text: data.text?.trim() || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

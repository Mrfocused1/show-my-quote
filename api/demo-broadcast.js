import Pusher from 'pusher';

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionCode, event, data } = req.body || {};
  if (!sessionCode) return res.status(400).json({ error: 'Missing sessionCode' });

  try {
    await pusher.trigger(`demo-${sessionCode}`, event || 'state-update', data || {});
    res.json({ ok: true });
  } catch (err) {
    console.error('Pusher broadcast error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

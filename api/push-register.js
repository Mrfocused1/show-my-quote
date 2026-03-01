import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { identity = 'demo-presenter', subscription } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Missing subscription' });

  const key = `push:${identity}`;
  const existing = (await kv.get(key)) || [];

  // Deduplicate by endpoint
  const filtered = existing.filter(s => s.endpoint !== subscription.endpoint);
  filtered.push({ ...subscription, updatedAt: Date.now() });

  // Keep max 20 subscriptions per identity
  const trimmed = filtered.slice(-20);
  await kv.set(key, trimmed);

  res.json({ ok: true });
}

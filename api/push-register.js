import { put, list } from '@vercel/blob';

const subsPath = identity => `push-subs/${identity}.json`;

async function readSubs(identity) {
  const { blobs } = await list({ prefix: subsPath(identity), limit: 1 });
  if (!blobs.length) return [];
  try {
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return [];
  }
}

async function writeSubs(identity, subs) {
  await put(subsPath(identity), JSON.stringify(subs), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { identity = 'demo-presenter', subscription } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Missing subscription' });

  const existing = await readSubs(identity);

  // Deduplicate by endpoint, keep max 20
  const filtered = existing.filter(s => s.endpoint !== subscription.endpoint);
  filtered.push({ ...subscription, updatedAt: Date.now() });
  await writeSubs(identity, filtered.slice(-20));

  res.json({ ok: true });
}

import { put, list } from '@vercel/blob';
import { requireApiKey } from './_lib/auth.js';

const subsPath = identity => `push-subs/${identity}.json`;

async function readSubs(identity) {
  const { blobs } = await list({ prefix: subsPath(identity), limit: 1 });
  if (!blobs.length) return [];
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobs[0].url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return await res.json();
  } catch {
    return [];
  }
}

async function writeSubs(identity, subs) {
  await put(subsPath(identity), JSON.stringify(subs), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const { identity = 'demo-presenter', subscription } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Missing subscription' });

  const existing = await readSubs(identity);

  // Deduplicate by endpoint, keep max 20
  const filtered = existing.filter(s => s.endpoint !== subscription.endpoint);
  filtered.push({ ...subscription, updatedAt: Date.now() });
  await writeSubs(identity, filtered.slice(-20));

  res.json({ ok: true });
}

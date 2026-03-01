import webpush from 'web-push';
import { put, list } from '@vercel/blob';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:hello@showmyquote.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

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
    allowOverwrite: true,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { identity = 'demo-presenter', from = 'Unknown number' } = req.body || {};
  const sent = await sendPushToIdentity(identity, { from });
  res.json({ sent });
}

// Exported so twilio-voice.js can inline it without an extra HTTP hop
export async function sendPushToIdentity(identity, payload) {
  const subscriptions = await readSubs(identity);
  if (!subscriptions.length) return 0;

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(sub, JSON.stringify(payload))
    )
  );

  // Remove stale subscriptions (410 Gone = unsubscribed, 404 = not found)
  const stale = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const status = r.reason?.statusCode;
      if (status === 410 || status === 404) stale.push(subscriptions[i].endpoint);
    }
  });

  if (stale.length) {
    await writeSubs(identity, subscriptions.filter(s => !stale.includes(s.endpoint)));
  }

  return results.filter(r => r.status === 'fulfilled').length;
}

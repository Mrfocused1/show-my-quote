import webpush from 'web-push';
import { kv } from '@vercel/kv';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:hello@showmyquote.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { identity = 'demo-presenter', from = 'Unknown number' } = req.body || {};

  const sent = await sendPushToIdentity(identity, { from });
  res.json({ sent });
}

// Exported so twilio-voice.js can inline it without an extra HTTP hop
export async function sendPushToIdentity(identity, payload) {
  const key = `push:${identity}`;
  const subscriptions = (await kv.get(key)) || [];
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
    const fresh = subscriptions.filter(s => !stale.includes(s.endpoint));
    await kv.set(key, fresh);
  }

  return results.filter(r => r.status === 'fulfilled').length;
}

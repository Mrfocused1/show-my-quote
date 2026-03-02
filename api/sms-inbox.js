import { setCors, requireApiKey } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireApiKey(req, res)) return;

  const projectId = process.env.SIGNALWIRE_PROJECT_ID;
  const apiToken  = process.env.SIGNALWIRE_API_TOKEN;
  const spaceUrl  = process.env.SIGNALWIRE_SPACE_URL;
  const toNumber  = process.env.SIGNALWIRE_PHONE_NUMBER;

  if (!projectId || !apiToken) {
    return res.status(503).json({ error: 'SignalWire not configured' });
  }

  const url = `https://${spaceUrl}/api/laml/2010-04-01/Accounts/${projectId}/Messages.json?To=${encodeURIComponent(toNumber)}&PageSize=10`;
  const response = await fetch(url, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${projectId}:${apiToken}`).toString('base64'),
    },
  });

  const data     = await response.json();
  const messages = (data.messages || []).map(m => ({
    from: m.from,
    body: m.body,
    date: m.date_sent,
  }));

  res.json({ messages });
}

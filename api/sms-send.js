import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireApiKey(req, res)) return;

  const { to, body } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'Missing to or body' });

  const projectId = process.env.SIGNALWIRE_PROJECT_ID;
  const apiToken  = process.env.SIGNALWIRE_API_TOKEN;
  const spaceUrl  = process.env.SIGNALWIRE_SPACE_URL;
  const from      = process.env.SIGNALWIRE_PHONE_NUMBER;

  if (!projectId || !apiToken || !spaceUrl || !from) {
    return res.status(503).json({ error: 'SignalWire not configured' });
  }

  try {
    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const response = await fetch(
      `https://${spaceUrl}/api/laml/2010-04-01/Accounts/${projectId}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${projectId}:${apiToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[sms-send] SignalWire error:', response.status, err);
      return res.status(502).json({ error: 'Failed to send SMS' });
    }

    const data = await response.json();
    console.log('[sms-send] Sent to', to, '— sid:', data.sid);

    // Persist to Supabase (best-effort — don't block the response)
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('sms_messages').insert({
        direction: 'outbound',
        to_number: to,
        from_number: from,
        body,
        sid: data.sid,
      }).then(({ error }) => {
        if (error) console.error('[sms-send] Supabase insert error:', error.message);
      });
    }

    res.json({ sid: data.sid });
  } catch (err) {
    console.error('[sms-send] Fetch error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
}

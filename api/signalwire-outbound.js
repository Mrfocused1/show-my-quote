import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

// In-memory cooldown: prevent rapid retries that trigger SignalWire rate limits
// Vercel functions may be different instances, but this catches same-instance retries
const lastCallTime = {};
const COOLDOWN_MS = 45_000; // 45 seconds between calls from same number

/**
 * POST /api/signalwire-outbound
 * Body: { to: "+1XXXXXXXXXX" }
 *
 * Creates an outbound call via the SignalWire Compatibility REST API.
 * Flow:
 *   1. SignalWire rings the PSTN number (the customer)
 *   2. When customer answers, SignalWire fetches LaML from signalwire-outbound-connect
 *   3. LaML sets up transcription streaming and dials the browser client (demo-presenter)
 *   4. Browser auto-answers the inbound bridge leg → both parties connected
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireApiKey(req, res)) return;

  const { to } = req.body || {};
  if (!to) return res.status(400).json({ error: 'Missing "to" phone number' });

  // Validate E.164 format
  const cleaned = to.replace(/[^\d+]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  const projectId = process.env.SIGNALWIRE_PROJECT_ID;
  const apiToken  = process.env.SIGNALWIRE_API_TOKEN;
  const spaceUrl  = process.env.SIGNALWIRE_SPACE_URL;
  const from      = process.env.SIGNALWIRE_PHONE_NUMBER;
  const appUrl    = process.env.APP_URL || 'https://www.showmyquote.com';

  if (!projectId || !apiToken || !spaceUrl || !from) {
    return res.status(503).json({ error: 'SignalWire not configured' });
  }

  // Cooldown check — SignalWire rate-limits rapid outbound calls from the same number
  const now = Date.now();
  const lastCall = lastCallTime[from] || 0;
  const sinceLastCall = now - lastCall;
  if (sinceLastCall < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - sinceLastCall) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSec} seconds before calling again.` });
  }
  lastCallTime[from] = now;

  // Generate a session code for transcription routing
  const session = 'out' + Date.now().toString(36);

  try {
    // Create outbound call via Compatibility REST API
    // Step 1: SignalWire calls the PSTN number
    // Step 2: When answered, fetch LaML from signalwire-outbound-connect which bridges to browser client
    const connectUrl = `${appUrl}/api/signalwire-outbound-connect?` + new URLSearchParams({
      session,
      clientNumber: from,
    }).toString();

    const statusCallbackUrl = `${appUrl}/api/twilio-recording`;

    const params = new URLSearchParams({
      To: cleaned,
      From: from,
      Url: connectUrl,
      Method: 'POST',
      Record: 'true',
      RecordingStatusCallback: statusCallbackUrl,
      RecordingStatusCallbackMethod: 'POST',
    });

    const response = await fetch(
      `https://${spaceUrl}/api/laml/2010-04-01/Accounts/${projectId}/Calls.json`,
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
      console.error(`[signalwire-outbound] SignalWire ${response.status}:`, err.slice(0, 500));
      lastCallTime[from] = 0; // reset cooldown so user can retry immediately
      return res.status(502).json({ error: 'Failed to create outbound call', detail: err });
    }

    const data = await response.json();
    console.log('[signalwire-outbound] Call created:', data.sid, 'to:', cleaned, 'session:', session);

    // Persist outbound call record to Supabase (best-effort)
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('calls').insert({
        call_sid: data.sid || null,
        session,
        direction: 'outbound',
        from_number: from,
        to_number: cleaned,
        status: 'initiated',
      }).then(({ error }) => {
        if (error) console.error('[signalwire-outbound] Supabase insert error:', error.message);
      });
    }

    res.json({ callSid: data.sid, session });
  } catch (err) {
    console.error('[signalwire-outbound] Fetch error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
}

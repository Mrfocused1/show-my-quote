import { sendPushToIdentity } from './push-notify.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  const from            = req.body?.From || req.query?.From || 'Unknown';
  const CallSid         = req.body?.CallSid || req.query?.CallSid || '';
  const signalwireNumber = process.env.SIGNALWIRE_PHONE_NUMBER;

  // Loop detection: if caller is our own number, kill immediately
  if (from === signalwireNumber) {
    return res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }

  // Short session derived from CallSid — routes transcription to the right Pusher channel.
  const session = 'in' + (CallSid.slice(-6) || Date.now().toString(36));

  // Push notification so the app knows a call is arriving
  try {
    await Promise.race([
      sendPushToIdentity('demo-presenter', { from, session }),
      new Promise(r => setTimeout(r, 3000)),
    ]);
  } catch {}

  // Persist inbound call record to Supabase (best-effort)
  const supabase = getSupabase();
  if (supabase) {
    supabase.from('calls').insert({
      call_sid: CallSid || null,
      session,
      direction: 'inbound',
      from_number: from,
      status: 'in-progress',
    }).then(({ error }) => {
      if (error) console.error('[twilio-voice] Supabase insert error:', error.message);
    });
  }

  // Read forwarding number: Supabase app_settings first, env var as fallback
  let ownerPhone = process.env.OWNER_PHONE_NUMBER || null;
  if (supabase) {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'owner_phone').single();
    if (data?.value) ownerPhone = data.value;
  }
  const dialTimeout = ownerPhone ? 20 : 45;

  const transcriptionWsUrl = process.env.TRANSCRIPTION_WS_URL || 'wss://smq-transcription-production.up.railway.app';

  const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${transcriptionWsUrl}" track="both_tracks">
      <Parameter name="session" value="${session}"/>
    </Stream>
  </Start>
  <Dial callerId="${signalwireNumber}" timeout="${dialTimeout}" record="record-from-answer" recordingStatusCallback="${appUrl}/api/twilio-recording" recordingStatusCallbackMethod="POST">
    <Client>
      <Identity>demo-presenter</Identity>
      <Parameter name="session" value="${session}"/>
      <Parameter name="from" value="${escapeXml(from)}"/>
    </Client>${ownerPhone ? `\n    <Number>${escapeXml(ownerPhone)}</Number>` : ''}
  </Dial>
</Response>`;

  console.log('[twilio-voice] inbound LaML:', xml);
  res.send(xml);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

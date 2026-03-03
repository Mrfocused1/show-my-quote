/**
 * POST /api/signalwire-outbound-connect
 *
 * Called by SignalWire when the outbound PSTN call is answered.
 * Returns LaML that sets up transcription streaming and connects audio.
 *
 * Query params:
 *   session       — transcription session code (e.g. "out1a2b3c")
 *   clientNumber  — SignalWire phone number (used as callerId)
 *
 * This is a webhook called by SignalWire — no API key required.
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  const session      = req.query?.session || req.body?.session || '';
  const clientNumber = req.query?.clientNumber || req.body?.clientNumber || process.env.SIGNALWIRE_PHONE_NUMBER || '';

  const transcriptionWsUrl = process.env.TRANSCRIPTION_WS_URL || 'wss://smq-transcription-production.up.railway.app';
  const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';

  // The PSTN party has already answered at this point.
  // We need to bridge audio to the browser client (demo-presenter).
  // The browser is already connected via SignalWire Call Fabric (client.online()).
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${transcriptionWsUrl}" track="both_tracks">
      <Parameter name="session" value="${session}"/>
    </Stream>
  </Start>
  <Dial callerId="${escapeXml(clientNumber)}" record="record-from-answer" recordingStatusCallback="${appUrl}/api/twilio-recording" recordingStatusCallbackMethod="POST">
    <Client>
      <Identity>demo-presenter</Identity>
      <Parameter name="session" value="${session}"/>
    </Client>
  </Dial>
</Response>`;

  console.log('[signalwire-outbound-connect] LaML:', xml);
  res.send(xml);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

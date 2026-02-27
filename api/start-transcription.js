export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { callSid } = req.body || {};
  if (!callSid) return res.status(400).json({ error: 'missing callSid' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const appUrl     = process.env.APP_URL || 'https://showmyquote.com';

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Transcriptions.json`;

  const body = new URLSearchParams({
    track:                'both_tracks',
    languageCode:         'en-US',
    statusCallbackUrl:    `${appUrl}/api/twilio-transcription`,
    statusCallbackMethod: 'POST',
    inboundTrackLabel:    'You',
    outboundTrackLabel:   'Client',
    partialResults:       'false',
  });

  const response = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Failed to start transcription:', data);
    return res.status(500).json({ error: data.message || 'Failed to start transcription' });
  }

  console.log('Transcription started:', data.sid);
  res.json({ ok: true, sid: data.sid });
}

import twilio from 'twilio';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const accountSid    = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid     = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret  = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid   = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    return res.status(503).json({ error: 'Twilio not configured' });
  }

  const { AccessToken } = twilio.jwt;
  const { VoiceGrant }  = AccessToken;

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: 'demo-presenter',
    ttl: 3600,
  });

  token.addGrant(new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: false,
  }));

  res.json({ token: token.toJwt() });
}

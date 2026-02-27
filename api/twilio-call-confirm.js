import twilio from 'twilio';

// Called on the B-leg (called phone) before bridging to the browser.
// Handles both the initial prompt and the digit-press response in one endpoint.
//
// Flow:
//   1. Twilio calls this URL when B-leg answers (no Digits in body) → play prompt
//   2. <Gather> fires back to THIS same URL with Digits=1 → return empty TwiML → bridge forms
//   3. If no digit within 8s, or wrong key → <Hangup> → screening IVR never bridges

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  const twiml = new twilio.twiml.VoiceResponse();
  const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';
  const digits = req.body?.Digits || req.query?.Digits;

  console.log('[twilio-call-confirm] digits:', digits);

  if (digits === '1') {
    // Human confirmed — empty TwiML ends <Number url> processing, bridge forms
    console.log('[twilio-call-confirm] digit 1 received — bridging call');
    res.send(twiml.toString());
    return;
  }

  // Initial call or wrong digit — play the prompt
  const gather = twiml.gather({
    numDigits: '1',
    timeout: '8',
    action: `${appUrl}/api/twilio-call-confirm`,
    method: 'POST',
  });
  gather.say('You have an incoming business call. Press 1 to connect.');

  // No digit pressed within timeout — hang up (prevents call-screening bridge)
  twiml.hangup();

  res.send(twiml.toString());
}

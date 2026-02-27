import twilio from 'twilio';

// Called on the B-leg (the phone being called) after it answers, before bridging to
// the browser. Plays a "press 1 to connect" prompt. This gates the bridge so that:
//   - iPhone call screening IVR → hears prompt, doesn't press 1 → times out → hangs up
//   - Real human → hears prompt, presses 1 → bridge forms → real conversation starts
// Only real conversation audio ever reaches the transcription engine.

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  const twiml = new twilio.twiml.VoiceResponse();

  const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';

  const gather = twiml.gather({
    numDigits: '1',
    timeout: '8',
    action: `${appUrl}/api/twilio-call-confirm-action`,
    method: 'POST',
  });

  gather.say('You have an incoming business call. Press 1 to connect.');

  // No digit pressed within timeout — hang up instead of bridging
  twiml.hangup();

  res.send(twiml.toString());
}

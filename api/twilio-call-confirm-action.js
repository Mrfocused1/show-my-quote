// Called by Twilio when the callee presses a digit in the confirmation <Gather>.
// If they pressed 1, return an empty <Response> — Twilio bridges the call.
// Any other key (or unexpected input) hangs up.

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');

  const digit = req.body?.Digits || req.query?.Digits;

  if (digit === '1') {
    // Bridge the call — empty response tells Twilio to connect A and B legs
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
  } else {
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
}

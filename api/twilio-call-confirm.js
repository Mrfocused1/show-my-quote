import twilio from 'twilio';

// DEPRECATED: This endpoint is no longer used in the call flow.
//
// Previously, twilio-voice.js used <Number url="/api/twilio-call-confirm"> to play
// a "Press 1 to connect" gate on the B-leg before bridging. This caused:
//   - No audio between caller and callee (bridge blocked until TwiML completed)
//   - 5-second disconnects when the webhook timed out or callee couldn't respond
//   - iPhone call screening (Siri "who's calling") would never press 1, killing calls
//
// The press-1 gate has been removed. This file is kept only to return empty TwiML
// if Twilio still has stale webhook references pointing here — empty TwiML will
// cause the call to bridge immediately rather than hang up.

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/xml');
  const twiml = new twilio.twiml.VoiceResponse();
  console.log('[twilio-call-confirm] DEPRECATED — returning empty TwiML to bridge immediately');
  res.send(twiml.toString());
}

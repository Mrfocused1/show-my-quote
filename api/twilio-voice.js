import twilio from 'twilio';

export default async function handler(req, res) {
  // Twilio sends POST with URL-encoded body
  res.setHeader('Content-Type', 'text/xml');

  const To = req.body?.To || req.query?.To;
  const twiml = new twilio.twiml.VoiceResponse();

  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (To && To !== twilioNumber) {
    // Outbound call from browser SDK — dial the destination number directly.
    //
    // Previous issues fixed:
    //   1. <Start><Transcription> before <Dial> was intercepting the early-media
    //      stream, preventing ringback tones from reaching the browser client.
    //   2. <Number url> (press-1 confirmation gate) blocked the audio bridge until
    //      TwiML execution completed on the B-leg — causing no audio on either side
    //      and a ~5s disconnect when the webhook timed out or callee couldn't respond.
    //
    // Transcription is now started via REST API (POST /api/start-transcription)
    // from the browser after the call connects, avoiding early-media interference.
    const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';
    const dial = twiml.dial({
      callerId: twilioNumber,
      record: 'record-from-ringing',
      recordingStatusCallback: `${appUrl}/api/twilio-recording`,
    });
    dial.number(To);
    console.log('[twilio-voice] TwiML:', twiml.toString());
  } else {
    // Inbound call to the Twilio number — ring the browser client
    const dial = twiml.dial({ callerId: req.body?.From || twilioNumber });
    dial.client('demo-presenter');
  }

  res.send(twiml.toString());
}

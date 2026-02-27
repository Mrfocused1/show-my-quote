import twilio from 'twilio';

export default async function handler(req, res) {
  // Twilio sends POST with URL-encoded body
  res.setHeader('Content-Type', 'text/xml');

  const To = req.body?.To || req.query?.To;
  const twiml = new twilio.twiml.VoiceResponse();

  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (To && To !== twilioNumber) {
    // Outbound call from browser SDK — start real-time transcription then dial
    const appUrl = process.env.APP_URL || 'https://showmyquote.com';
    const start = twiml.start();
    start.transcription({
      statusCallbackUrl: `${appUrl}/api/twilio-transcription`,
      track: 'both_tracks',
      inboundTrackLabel: 'Client',
      outboundTrackLabel: 'You',
      languageCode: 'en-GB',
      partialResults: 'false',
    });
    const dial = twiml.dial({
      callerId: twilioNumber,
      record: 'record-from-ringing',
      recordingStatusCallback: '/api/twilio-recording',
    });
    dial.number(To);
  } else {
    // Inbound call to the Twilio number — ring the browser client
    const dial = twiml.dial({ callerId: req.body?.From || twilioNumber });
    dial.client('demo-presenter');
  }

  res.send(twiml.toString());
}

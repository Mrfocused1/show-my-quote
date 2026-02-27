import twilio from 'twilio';

export default async function handler(req, res) {
  // Twilio sends POST with URL-encoded body
  res.setHeader('Content-Type', 'text/xml');

  const To = req.body?.To || req.query?.To;
  const twiml = new twilio.twiml.VoiceResponse();

  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (To && To !== twilioNumber) {
    // Outbound call from browser SDK — start real-time transcription via TwiML,
    // then dial the destination number
    // Use www subdomain to avoid 307 redirect (showmyquote.com → www.showmyquote.com)
    // which can cause Twilio to downgrade POST webhooks to GET, losing the request body.
    const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';
    const Session = req.body?.Session || req.query?.Session || '';
    const cbUrl = `${appUrl}/api/twilio-transcription${Session ? '?session=' + encodeURIComponent(Session) : ''}`;

    const start = twiml.start();
    // Track labels from Twilio's perspective:
    //   inbound_track  = audio Twilio RECEIVES from the browser (WebRTC) = the business owner ("You")
    //   outbound_track = audio Twilio SENDS to the browser, which includes child-call audio
    //                    from <Dial> (the PSTN phone person) = the "Client"
    start.transcription({
      statusCallbackUrl: cbUrl,
      track: 'both_tracks',
      inboundTrackLabel: 'You',
      outboundTrackLabel: 'Client',
      languageCode: 'en-US',
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

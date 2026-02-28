import twilio from 'twilio';

export default async function handler(req, res) {
  // Twilio sends POST with URL-encoded body
  res.setHeader('Content-Type', 'text/xml');

  const To = req.body?.To || req.query?.To;
  const twiml = new twilio.twiml.VoiceResponse();

  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (To && To !== twilioNumber) {
    // Outbound call from browser SDK.
    // <Start><Transcription> is non-blocking and must come before <Dial> so it can
    // tap both legs of the bridged call. The outbound_track (phone person's voice)
    // only exists after <Dial> bridges — the transcription engine waits for it.
    // Previously this was replaced with a REST API call from call.on('accept'), but
    // that approach missed the outbound_track because it fired before B-leg answered.
    const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';
    const Session = req.body?.Session || req.query?.Session || '';
    const cbUrl = `${appUrl}/api/twilio-transcription${Session ? '?session=' + encodeURIComponent(Session) : ''}`;

    const start = twiml.start();
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

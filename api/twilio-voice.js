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
    // Transcribe both tracks. Frontend watchdog falls back to Web Speech API for inbound
    // if Twilio fails to produce results within 12s (e.g. WebRTC/Opus codec issue).
    start.transcription({
      statusCallbackUrl: cbUrl,
      track: 'both_tracks',
      inboundTrackLabel: 'You',
      outboundTrackLabel: 'Client',
      languageCode: 'en-US',
      partialResults: 'false',
    });
    // answerOnBridge: true — keeps A-leg and B-leg separated until human confirms.
    // This prevents carrier call-screening audio (e.g. iPhone "Silence Unknown Callers"
    // prompt) from flowing into the outbound_track and getting transcribed.
    // The <Number url> webhook plays a "press 1 to connect" prompt on the B-leg only.
    // Transcription and bridge only receive real conversation audio after confirmation.
    const confirmUrl = `${appUrl}/api/twilio-call-confirm`;
    const dial = twiml.dial({
      callerId: twilioNumber,
      answerOnBridge: true,
      record: 'record-from-answer',
      recordingStatusCallback: '/api/twilio-recording',
    });
    // Two-arg form: dial.number(attributes, phoneNumber) — required by Twilio SDK
    // to set both the url attribute AND the phone number text content correctly.
    dial.number({ url: confirmUrl }, To);
    console.log('[twilio-voice] TwiML:', twiml.toString());
  } else {
    // Inbound call to the Twilio number — ring the browser client
    const dial = twiml.dial({ callerId: req.body?.From || twilioNumber });
    dial.client('demo-presenter');
  }

  res.send(twiml.toString());
}

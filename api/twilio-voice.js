import twilio from 'twilio';
import { sendPushToIdentity } from './push-notify.js';

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
    // outbound_track = audio Twilio sends TO the browser = the phone person's voice via <Dial>.
    // inbound_track (browser WebRTC/Opus) is transcribed unreliably by Twilio — one stray
    // result cancels the watchdog before Web Speech API can take over. Browser mic is always
    // handled by Web Speech API started immediately on call.on('accept').
    // speechModel: 'long' is required for hints/vocabulary boost to work.
    // 'telephony' (the default) ignores hints entirely.
    // hints are passed directly to Google STT as speech_contexts phrases,
    // boosting recognition of non-English food names and West African words.
    start.transcription({
      statusCallbackUrl: cbUrl,
      track: 'outbound_track',
      outboundTrackLabel: 'Client',
      languageCode: 'en-US',
      partialResults: 'false',
      speechModel: 'long',
      hints: [
        // Nigerian
        'Egusi', 'Eforiro', 'Ewedu', 'Ogbono', 'Edikaikong', 'Banga',
        'Moyin Moyin', 'Moin Moin', 'Moimoi', 'Puff Puff',
        'Jollof', 'Suya', 'Akara', 'Amala', 'Eba', 'Garri', 'Semolina',
        'Asaro', 'Dodo', 'Ugba',
        // Ghanaian
        'Banku', 'Kelewele', 'Fufu', 'Waakye', 'Kenkey', 'Omo Tuo', 'Ampesi',
        'Shito', 'Kontomire',
        // Sierra Leonean
        'Crain Crain', 'Salone', 'Cassava leaves', 'Groundnut soup',
        // Caribbean
        'Callaloo', 'Escovitch', 'Ackee', 'Oxtail', 'Jerk chicken',
        'Jerk pork', 'Curry goat', 'Plantain',
        // General
        'Gizzard', 'Kebab', 'Spring rolls',
      ].join(', '),
    });

    const dial = twiml.dial({
      callerId: twilioNumber,
      record: 'record-from-ringing',
      recordingStatusCallback: `${appUrl}/api/twilio-recording`,
    });
    dial.number(To);
    console.log('[twilio-voice] TwiML:', twiml.toString());
  } else {
    // Inbound call — push notification + transcription + simultaneous ring.
    const from = req.body?.From || req.query?.From || 'Unknown';
    const CallSid = req.body?.CallSid || req.query?.CallSid || '';
    const appUrl = process.env.APP_URL || 'https://www.showmyquote.com';

    // Short session derived from CallSid — routes transcription to the right Pusher channel.
    // Browser receives this via <Parameter> and subscribes to tx-{session}.
    const session = 'in' + (CallSid.slice(-6) || Date.now().toString(36));
    const cbUrl = `${appUrl}/api/twilio-transcription?session=${encodeURIComponent(session)}`;

    // Push notification (include session so app can subscribe to the right channel)
    try {
      await Promise.race([
        sendPushToIdentity('demo-presenter', { from, session }),
        new Promise(r => setTimeout(r, 3000)),
      ]);
    } catch {}

    // Transcribe caller's voice (inbound_track = audio Twilio receives from the PSTN caller).
    // Presenter's voice is handled by Web Speech API in the browser.
    const start = twiml.start();
    start.transcription({
      statusCallbackUrl: cbUrl,
      track: 'inbound_track',
      inboundTrackLabel: 'Client',
      languageCode: 'en-US',
      partialResults: 'false',
      speechModel: 'long',
      hints: [
        'Egusi', 'Eforiro', 'Ewedu', 'Ogbono', 'Edikaikong', 'Banga',
        'Moyin Moyin', 'Moin Moin', 'Moimoi', 'Puff Puff',
        'Jollof', 'Suya', 'Akara', 'Amala', 'Eba', 'Garri', 'Semolina',
        'Asaro', 'Dodo', 'Ugba',
        'Banku', 'Kelewele', 'Fufu', 'Waakye', 'Kenkey', 'Omo Tuo', 'Ampesi',
        'Shito', 'Kontomire',
        'Crain Crain', 'Salone', 'Cassava leaves', 'Groundnut soup',
        'Callaloo', 'Escovitch', 'Ackee', 'Oxtail', 'Jerk chicken',
        'Jerk pork', 'Curry goat', 'Plantain',
        'Gizzard', 'Kebab', 'Spring rolls',
      ].join(', '),
    });

    // Simultaneous ring: browser client + owner's real phone (if configured).
    // timeout:20 avoids connecting inbound caller to voicemail (~25-30s on UK networks).
    // callerId must be the Twilio number — arbitrary numbers are rejected by Twilio for outbound legs.
    const ownerPhone = process.env.OWNER_PHONE_NUMBER;
    const dialTimeout = ownerPhone ? 20 : 45;
    const dial = twiml.dial({ callerId: twilioNumber, timeout: dialTimeout });

    // Pass session + real caller number to browser via <Parameter>.
    // callerId is forced to twilioNumber above so call.parameters.From would show Twilio's number —
    // we use a custom 'from' param instead so the app can display who's actually calling.
    const clientNoun = dial.client();
    clientNoun.identity('demo-presenter');
    clientNoun.parameter({ name: 'session', value: session });
    clientNoun.parameter({ name: 'from', value: from });

    if (ownerPhone) dial.number(ownerPhone);
    console.log('[twilio-voice] inbound TwiML:', twiml.toString());
  }

  res.send(twiml.toString());
}

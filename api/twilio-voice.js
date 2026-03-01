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
    // Inbound call to the Twilio number — send push notification then ring the browser client.
    // Push is sent synchronously (capped at 3s) so it fires before the response is returned.
    const from = req.body?.From || req.query?.From || 'Unknown';
    try {
      await Promise.race([
        sendPushToIdentity('demo-presenter', { from }),
        new Promise(r => setTimeout(r, 3000)),
      ]);
    } catch {}

    // Simultaneous ring: browser client + owner's real phone (if configured).
    // timeout:20 avoids connecting inbound caller to voicemail (voicemail picks up ~25-30s on UK networks).
    // If OWNER_PHONE_NUMBER is not set, falls back to browser-only with longer timeout.
    const ownerPhone = process.env.OWNER_PHONE_NUMBER;
    const dialTimeout = ownerPhone ? 20 : 45;
    const dial = twiml.dial({ callerId: from === 'Unknown' ? twilioNumber : from, timeout: dialTimeout });
    dial.client('demo-presenter');
    if (ownerPhone) dial.number(ownerPhone);
  }

  res.send(twiml.toString());
}

import Pusher from 'pusher';

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain');

  // Twilio sends POST with URL-encoded body, but may also send GET with query params.
  // Merge both sources so we handle either method reliably.
  const params = { ...(req.query || {}), ...(req.body || {}) };

  const {
    TranscriptionEvent,
    TranscriptionData,
    Track,
    Final,
    CallSid,
  } = params;

  // TranscriptionData is a JSON string: {"transcript":"...", "confidence":0.99}
  let transcriptText = '';
  try {
    if (TranscriptionData) {
      const parsed = JSON.parse(TranscriptionData);
      transcriptText = parsed.transcript?.trim() || '';
    }
  } catch { /* ignore malformed JSON */ }

  console.log('Transcription webhook method:', req.method, '| keys:', Object.keys(params));
  console.log('Transcription event:', TranscriptionEvent, '| Track:', Track, '| Final:', Final, '| CallSid:', CallSid, '| Text:', transcriptText);

  // Determine channel: prefer session-based tx channel, fall back to CallSid
  const session = params.session || req.query?.session;
  const channel = session ? `tx-${session}` : (CallSid ? `call-${CallSid}` : null);

  // Only process final transcription content
  if (
    TranscriptionEvent === 'transcription-content' &&
    Final === 'true' &&
    transcriptText &&
    channel
  ) {
    // With our corrected TwiML labels (twilio-voice.js):
    //   inboundTrackLabel  = 'You'     (browser user — audio Twilio receives from WebRTC)
    //   outboundTrackLabel = 'Client'  (phone person — audio from child call via <Dial>)
    // The Track field will contain the label value ('You' or 'Client'),
    // or the raw track name ('inbound_track' / 'outbound_track') if no label was set.
    // We transcribe outbound_track only (phone person's voice via <Dial>).
    // outboundTrackLabel is 'Client', so Track will be 'Client' or fall back to 'outbound_track'.
    const speaker = (Track === 'You' || Track === 'inbound_track') ? 'You' : 'Client';

    console.log('Publishing transcript:', speaker, '→', transcriptText.slice(0, 60));
    await pusher.trigger(channel, 'transcript', {
      speaker,
      text: transcriptText,
    });
  }

  res.status(200).end();
}

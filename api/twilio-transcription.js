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

  const {
    TranscriptionEvent,
    TranscriptionData,
    Track,
    Final,
    CallSid,
  } = req.body || {};

  // TranscriptionData is a JSON string: {"transcript":"...", "confidence":0.99}
  let transcriptText = '';
  try {
    if (TranscriptionData) {
      const parsed = JSON.parse(TranscriptionData);
      transcriptText = parsed.transcript?.trim() || '';
    }
  } catch { /* ignore malformed JSON */ }

  console.log('Transcription webhook body keys:', Object.keys(req.body || {}));
  console.log('Transcription event:', TranscriptionEvent, '| Track:', Track, '| Final:', Final, '| CallSid:', CallSid, '| Text:', transcriptText);

  // Determine channel: prefer session-based tx channel, fall back to CallSid
  const session = req.query?.session;
  const channel = session ? `tx-${session}` : (CallSid ? `call-${CallSid}` : null);

  // Only process final transcription content
  if (
    TranscriptionEvent === 'transcription-content' &&
    Final === 'true' &&
    transcriptText &&
    channel
  ) {
    // With our TwiML labels: inboundTrackLabel='Client', outboundTrackLabel='You'
    // Track field will be 'Client' or 'You'; fall back for default labels
    const speaker = (Track === 'Client' || Track === 'inbound_track') ? 'Client' : 'You';
    await pusher.trigger(channel, 'transcript', {
      speaker,
      text: transcriptText,
    });
  }

  if (!channel) { res.status(200).end(); return; }

  res.status(200).end();
}

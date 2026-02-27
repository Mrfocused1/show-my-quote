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

  // Only process final transcription content
  if (
    TranscriptionEvent === 'transcription-content' &&
    Final === 'true' &&
    transcriptText &&
    CallSid
  ) {
    // For browser-to-PSTN calls via <Dial>:
    //   inbound_track  = browser (caller/presenter) → labelled 'You'
    //   outbound_track = PSTN callee (customer)     → labelled 'Client'
    // Custom labels will appear if Twilio honours inboundTrackLabel/outboundTrackLabel
    const speaker = (Track === 'outbound_track' || Track === 'Client') ? 'Client' : 'You';
    await pusher.trigger(`call-${CallSid}`, 'transcript', {
      speaker,
      text: transcriptText,
    });
  }

  res.status(200).end();
}

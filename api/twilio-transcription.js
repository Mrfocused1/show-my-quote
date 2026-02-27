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

  console.log('Transcription event:', TranscriptionEvent, '| Track:', Track, '| Final:', Final, '| Text:', transcriptText);

  // Only process final transcription content
  if (
    TranscriptionEvent === 'transcription-content' &&
    Final === 'true' &&
    transcriptText &&
    CallSid
  ) {
    // inbound_track = called party (Client), outbound_track = browser presenter (You)
    // Custom labels (Client/You) may also appear if Twilio honours inboundTrackLabel
    const speaker = (Track === 'inbound_track' || Track === 'Client') ? 'Client' : 'You';
    await pusher.trigger(`call-${CallSid}`, 'transcript', {
      speaker,
      text: transcriptText,
    });
  }

  res.status(200).end();
}

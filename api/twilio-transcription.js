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
    TranscriptionText,
    Track,
    Final,
    CallSid,
  } = req.body || {};

  console.log('Transcription event:', TranscriptionEvent, '| Track:', Track, '| Final:', Final, '| Text:', TranscriptionText);

  // Only process final transcription content
  if (
    TranscriptionEvent === 'transcription-content' &&
    Final === 'true' &&
    TranscriptionText?.trim() &&
    CallSid
  ) {
    const speaker = Track === 'Client' ? 'Client' : 'You';
    await pusher.trigger(`call-${CallSid}`, 'transcript', {
      speaker,
      text: TranscriptionText.trim(),
    });
  }

  res.status(200).end();
}

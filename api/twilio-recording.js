export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  // POST — Twilio recordingStatusCallback webhook (just acknowledge)
  if (req.method === 'POST') {
    const { RecordingUrl, RecordingSid, RecordingStatus, CallSid } = req.body || {};
    console.log('Recording callback:', { RecordingSid, RecordingStatus, CallSid, RecordingUrl });
    return res.status(200).end();
  }

  // GET — front-end requests recording info or audio stream
  const callSid     = req.query?.callSid;
  const stream      = req.query?.stream;       // if 'true', proxy the audio bytes
  const recordingSid = req.query?.recordingSid; // for streaming a specific recording

  if (!callSid && !recordingSid) {
    return res.status(400).json({ error: 'missing callSid or recordingSid' });
  }

  if (!accountSid || !authToken) {
    return res.status(503).json({ error: 'Twilio not configured' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  // Stream mode: proxy the MP3 audio from Twilio (avoids auth issues in <audio> tag)
  if (stream === 'true' && recordingSid) {
    try {
      const mp3Url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;
      const audioRes = await fetch(mp3Url, {
        headers: { Authorization: authHeader },
        redirect: 'follow',
      });
      if (!audioRes.ok) {
        return res.status(502).json({ error: 'Failed to fetch audio' });
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const buffer = Buffer.from(await audioRes.arrayBuffer());
      return res.send(buffer);
    } catch (err) {
      console.error('Audio proxy error:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // Metadata mode: check if a completed recording exists for this CallSid
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Recordings.json`;
    const response = await fetch(url, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Twilio recordings fetch failed:', err);
      return res.status(502).json({ error: 'Failed to fetch recordings' });
    }

    const data = await response.json();
    const recordings = data.recordings || [];

    // Find a completed recording
    const completed = recordings.find(r => r.status === 'completed');
    if (!completed) {
      return res.json({ ready: false });
    }

    // Return metadata — the front-end will use the stream URL for playback
    return res.json({
      ready: true,
      recordingSid: completed.sid,
      duration: completed.duration,
    });
  } catch (err) {
    console.error('Error fetching recording:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

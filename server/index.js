/**
 * Show My Quote — Real-Time Transcription Server
 *
 * Receives SignalWire Media Stream WebSocket connections,
 * transcribes audio locally via Faster Whisper,
 * and publishes results to Pusher (tx-{session} channel).
 *
 * Audio pipeline:
 *   SignalWire (mulaw 8000 Hz) → decode → upsample 16000 Hz → WAV → Whisper → Pusher
 */

'use strict';

const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const Pusher = require('pusher');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT         = parseInt(process.env.PORT || '8080', 10);
const WHISPER_URL  = process.env.WHISPER_URL  || 'http://localhost:8001';

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS:  true,
});

// ── Mulaw → PCM16 decode table ────────────────────────────────────────────────
const MULAW_TABLE = (() => {
  const t = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    const u   = ~i & 0xFF;
    const sgn = (u & 0x80) ? -1 : 1;
    const exp = (u >> 4) & 0x07;
    const man = u & 0x0F;
    t[i] = sgn * (((man << 1) + 33) << (exp + 2)) - sgn * 33;
  }
  return t;
})();

function mulawToLinear16(mulawBuf) {
  const out = new Int16Array(mulawBuf.length);
  for (let i = 0; i < mulawBuf.length; i++) out[i] = MULAW_TABLE[mulawBuf[i]];
  return out;
}

// Simple linear-interpolation upsample 8000 Hz → 16000 Hz
function upsample8to16(pcm8k) {
  const n   = pcm8k.length;
  const out = new Int16Array(n * 2);
  for (let i = 0; i < n - 1; i++) {
    out[i * 2]     = pcm8k[i];
    out[i * 2 + 1] = (pcm8k[i] + pcm8k[i + 1]) >> 1;
  }
  out[(n - 1) * 2]     = pcm8k[n - 1];
  out[(n - 1) * 2 + 1] = pcm8k[n - 1];
  return out;
}

// Build a minimal WAV header + PCM data buffer
function buildWav(pcm16kArray) {
  const numSamples = pcm16kArray.length;
  const dataSize   = numSamples * 2;
  const buf        = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);       // fmt chunk size
  buf.writeUInt16LE(1, 20);        // PCM format
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(16000, 24);    // sample rate
  buf.writeUInt32LE(32000, 28);    // byte rate
  buf.writeUInt16LE(2, 32);        // block align
  buf.writeUInt16LE(16, 34);       // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(pcm16kArray[i], 44 + i * 2);
  }
  return buf;
}

// ── webm/opus → WAV 16 kHz mono via ffmpeg ────────────────────────────────────
// Used for outbound call audio sent as blobs from the browser MediaRecorder.
function convertToWav(inputBuf) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', 'pipe:0',   // read from stdin
      '-ar', '16000',   // 16 kHz — Whisper's native rate
      '-ac', '1',       // mono
      '-f', 'wav',      // output format
      'pipe:1',         // write to stdout
    ]);
    const out = [];
    ff.stdout.on('data', d => out.push(d));
    ff.stderr.on('data', () => {});   // suppress ffmpeg noise
    ff.on('error', reject);
    ff.on('close', code => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}`));
      resolve(Buffer.concat(out));
    });
    ff.stdin.write(inputBuf);
    ff.stdin.end();
  });
}

// ── Transcription + Pusher publish ────────────────────────────────────────────
async function transcribeAndPublish(wavBuf, session, speaker) {
  try {
    const res = await fetch(`${WHISPER_URL}/transcribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body:    wavBuf,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[whisper] ${res.status}: ${body}`);
      return;
    }

    const { text } = await res.json();
    const cleaned = (text || '').trim();
    if (!cleaned) return;

    console.log(`[${session}] ${speaker}: ${cleaned}`);

    await pusher.trigger(`tx-${session}`, 'transcript', { speaker, text: cleaned });
  } catch (err) {
    console.error('[transcribeAndPublish] error:', err.message);
  }
}

// ── WebSocket server ──────────────────────────────────────────────────────────

// SignalWire sends 160 bytes of mulaw per 20ms packet (8000 Hz × 0.02s).
// We accumulate CHUNKS_PER_FLUSH packets (~2 seconds) before transcribing.
// Smaller = lower latency; larger = better accuracy.
const CHUNKS_PER_FLUSH = 100; // 100 × 20ms = 2 seconds

const http = createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }

  // ── POST /api/transcribe — outbound call audio from browser MediaRecorder ──
  // Receives raw webm/opus bytes, converts to WAV, runs through local Whisper,
  // returns { text }. Called by Vercel api/transcribe-remote.js (server→server).
  if (req.method === 'POST' && req.url === '/api/transcribe') {
    const key = req.headers['x-smq-key'];
    if (process.env.SMQ_API_KEY && key !== process.env.SMQ_API_KEY) {
      res.writeHead(401); res.end('Unauthorized'); return;
    }

    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', async () => {
      const audioBuf = Buffer.concat(chunks);
      if (audioBuf.length < 500) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: '' }));
        return;
      }
      try {
        const wav = await convertToWav(audioBuf);
        const whisperRes = await fetch(`${WHISPER_URL}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'audio/wav' },
          body: wav,
        });
        if (!whisperRes.ok) throw new Error(`Whisper ${whisperRes.status}`);
        const data = await whisperRes.json();
        const text = (data.text || '').trim();
        console.log('[http-transcribe]', text.slice(0, 80));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text }));
      } catch (err) {
        console.error('[http-transcribe] error:', err.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: '' }));
      }
    });
    return;
  }

  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws, req) => {
  console.log('[ws] New connection from', req.socket.remoteAddress);

  let session = null;
  const state = {
    inbound_track:  { chunks: [], count: 0 },
    outbound_track: { chunks: [], count: 0 },
  };

  function flushTrack(track, final = false) {
    const s = state[track];
    if (!s || s.chunks.length === 0 || !session) return;

    const combined = Buffer.concat(s.chunks);
    s.chunks = [];
    s.count  = 0;

    // Skip tiny clips (< 0.3s at 8000 Hz = 2400 bytes) — likely silence
    if (!final && combined.length < 2400) return;

    const speaker = track === 'inbound_track' ? 'Client' : 'You';
    const pcm8k   = mulawToLinear16(combined);
    const pcm16k  = upsample8to16(pcm8k);
    const wav     = buildWav(pcm16k);

    transcribeAndPublish(wav, session, speaker); // fire-and-forget
  }

  ws.on('message', (rawData) => {
    let msg;
    try { msg = JSON.parse(rawData.toString()); } catch { return; }

    switch (msg.event) {
      case 'start': {
        session = msg.start?.customParameters?.session || null;
        console.log('[ws] Stream started — session:', session);
        break;
      }

      case 'media': {
        const track   = msg.media?.track;
        const payload = msg.media?.payload;
        if (!track || !payload || !state[track] || !session) return;

        const bytes = Buffer.from(payload, 'base64');
        state[track].chunks.push(bytes);
        state[track].count++;

        if (state[track].count >= CHUNKS_PER_FLUSH) {
          flushTrack(track);
        }
        break;
      }

      case 'stop': {
        console.log('[ws] Stream stopped — session:', session);
        flushTrack('inbound_track',  true);
        flushTrack('outbound_track', true);
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log('[ws] Connection closed — session:', session);
    // Final flush in case 'stop' event wasn't received
    flushTrack('inbound_track',  true);
    flushTrack('outbound_track', true);
  });

  ws.on('error', (err) => console.error('[ws] error:', err.message));
});

http.listen(PORT, () => {
  console.log(`[smq-transcription] WebSocket server ready on port ${PORT}`);
  console.log(`[smq-transcription] Whisper endpoint: ${WHISPER_URL}`);
});

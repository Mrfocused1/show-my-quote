// Run once: node scripts/generate-narration.mjs
// Generates public/demo-audio/line-{0-11}.mp3 — one file per conversation line
// "You" → echo voice, "Client" (Emma) → shimmer voice

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const keyMatch = env.match(/VITE_OPENAI_API_KEY=(.+)/);
if (!keyMatch) { console.error('No VITE_OPENAI_API_KEY in .env'); process.exit(1); }
const API_KEY = keyMatch[1].trim();

// Must match DEMO_SEQUENCE in Homepage.jsx exactly
const LINES = [
  { speaker: 'You',    text: "Thanks for calling! How can I help you today?" },
  { speaker: 'Client', text: "Hi, I'm Emma Clarke — we're getting married next summer and looking for a photographer." },
  { speaker: 'Client', text: "We've already got our venue — Aynhoe Park in Oxfordshire." },
  { speaker: 'You',    text: "Lovely! What date have you set for the wedding?" },
  { speaker: 'Client', text: "Saturday the 21st of June — ceremony at 2pm." },
  { speaker: 'You',    text: "Are you thinking full-day coverage, from bridal prep through to the evening?" },
  { speaker: 'Client', text: "Yes — full day, prep to first dance. And around 120 guests." },
  { speaker: 'You',    text: "Would you like a second shooter, or solo coverage?" },
  { speaker: 'Client', text: "A second shooter, please — and the Premium package." },
  { speaker: 'Client', text: "We'd also love a wedding film and an engagement shoot beforehand." },
  { speaker: 'You',    text: "Wonderful. And what's your rough budget for photography?" },
  { speaker: 'Client', text: "We're thinking around three and a half thousand pounds." },
];

const VOICE = { You: 'echo', Client: 'shimmer' };

async function generateLine(text, voice) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text, voice, speed: 1.0 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return res.arrayBuffer();
}

async function generate() {
  const outDir = path.join(__dirname, '../public/demo-audio');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating ${LINES.length} lines in parallel…`);
  const results = await Promise.all(
    LINES.map(({ speaker, text }, i) =>
      generateLine(text, VOICE[speaker]).then(buf => ({ i, speaker, buf }))
    )
  );

  results.forEach(({ i, speaker, buf }) => {
    fs.writeFileSync(path.join(outDir, `line-${i}.mp3`), Buffer.from(buf));
    console.log(`  ✓ line-${i}.mp3  [${speaker}]  ${Math.round(buf.byteLength / 1024)}kb`);
  });
  console.log('Done — public/demo-audio/ ready.');
}

generate().catch(err => { console.error(err.message); process.exit(1); });

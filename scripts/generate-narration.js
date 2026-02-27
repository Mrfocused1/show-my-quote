// Run once: node scripts/generate-narration.js
// Generates public/hero-narration.mp3 using OpenAI TTS

const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '../.env');
const env = fs.readFileSync(envPath, 'utf8');
const keyMatch = env.match(/VITE_OPENAI_API_KEY=(.+)/);
if (!keyMatch) { console.error('No VITE_OPENAI_API_KEY in .env'); process.exit(1); }
const API_KEY = keyMatch[1].trim();

const TEXT = `You pick up the phone. In the background, the AI starts listening.
As your client talks, their details fill in automatically — date, venue, what they need.
When they mention a second shooter, it's added. When they say film, it's priced.
The call ends. The quote is done. Send it before they've even left the conversation.
That's Show My Quote.`;

async function generate() {
  console.log('Calling OpenAI TTS…');
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: TEXT,
      voice: 'nova',
      speed: 0.92,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const buffer = await res.arrayBuffer();
  const outPath = path.join(__dirname, '../public/hero-narration.mp3');
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`✓ Saved to public/hero-narration.mp3 (${Math.round(buffer.byteLength / 1024)}kb)`);
}

generate().catch(err => { console.error(err.message); process.exit(1); });

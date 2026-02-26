// All OpenAI calls go through /api/* serverless functions.
// The API key lives server-side only — never in the browser bundle.

function fetchWithTimeout(url, options, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Whisper — transcribe an audio blob to text (via /api/transcribe)
// ---------------------------------------------------------------------------
export async function transcribeAudio(blob) {
  // Convert blob → base64 so we can send as JSON
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const audio = btoa(binary);

  const res = await fetchWithTimeout('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio, filename: 'audio.webm' }),
  }, 30000);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Transcribe ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.text?.trim() || '';
}

// ---------------------------------------------------------------------------
// GPT-4o-mini — P1: extract all form fields from a transcript line
// ---------------------------------------------------------------------------
export async function suggestField(line, recentContext = [], existingLabels = []) {
  const res = await fetchWithTimeout('/api/suggest-field', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line, recentContext, existingLabels }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`suggestField ${res.status}: ${err}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// GPT-4o-mini — P2: extract field values from a transcript line
// ---------------------------------------------------------------------------
export async function fillFields(line, fields, recentContext = []) {
  if (!fields.length) return { fills: [] };

  const res = await fetchWithTimeout('/api/fill-fields', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line, fields, recentContext }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`fillFields ${res.status}: ${err}`);
  }

  try {
    return await res.json();
  } catch {
    return { fills: [] };
  }
}

// ---------------------------------------------------------------------------
// GPT-4o — P1 end: re-analyse full transcript, reconcile fields, return summary
// ---------------------------------------------------------------------------
export async function analyzeFullConversation(transcript, currentFields) {
  const res = await fetchWithTimeout('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, currentFields }),
  }, 58000);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`analyzeFullConversation ${res.status}: ${err}`);
  }

  return res.json();
}

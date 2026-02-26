// API key — cached once at module load, never logged
const KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Valid field types — used to sanitise GPT responses
const VALID_TYPES = ['text','number','currency','date','time','toggle','select','multi-check','priced-item'];

// ---------------------------------------------------------------------------
// Helper: fetch with a 20-second timeout
// ---------------------------------------------------------------------------
function fetchWithTimeout(url, options, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Whisper — transcribe an audio blob to text
// ---------------------------------------------------------------------------
export async function transcribeAudio(blob) {
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  form.append('model', 'whisper-1');

  const res = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  }, 30000);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.text?.trim() || '';
}

// ---------------------------------------------------------------------------
// GPT-4o-mini — P1: extract all form fields from a transcript line
// existingLabels: labels already detected — prevents duplicates
// recentContext: last few transcript lines — helps understand continuations
// ---------------------------------------------------------------------------
export async function suggestField(line, recentContext = [], existingLabels = []) {
  const existingNote = existingLabels.length
    ? `\n\nFields already extracted (do NOT suggest these again or near-duplicates):\n${existingLabels.join(', ')}`
    : '';

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyse transcripts from discovery calls with service business owners (caterers, photographers, florists, venues, etc). They are describing what information they collect from their own clients. Always respond with a valid JSON object.

CRITICAL: Extract EVERY NEW intake field mentioned — one block of speech often contains many fields at once.${existingNote}

KEY PATTERNS TO RECOGNISE:
1. Rapid-fire oral lists — business owners often rattle off many fields in one breath with no punctuation. Treat each item as a separate field. E.g. "we ask name email date type of event" → 4 fields.
2. Question form — "what's your name / what's your email / when is the event" → extract the implied field for each.
3. Phrase form — "I ask about their name, the date, how many guests" → extract each.
4. Speech-to-text has no punctuation and may mis-hear words ("should" may mean "and" or "or"). Use context to infer intent.
5. Conditional yes/no — "do you have allergies / do you bring your own waiter" → toggle fields.

Common fields — extract these even if only briefly mentioned:
- "name" / "what's your name" → Client Name (text)
- "email" → Client Email (text)
- "phone" / "contact number" → Phone Number (text)
- "date" / "when" / "event date" → Event Date (date)
- "time" / "start time" / "arrival" → Start Time (time)
- "type of event" / "what's the occasion" → Event Type (select/text)
- "how many" / "guests" / "headcount" / "people" → Guest Count (number)
- "venue" / "location" / "where" → Venue (text)
- "budget" / "spend" → Budget (currency)
- "course" / "3-course" / "buffet" / "meal style" → Meal Style (select)
- "food type" / "cuisine" → Food Type (text)
- "allergies" / "dietary" / "requirements" → Dietary Requirements (multi-check)
- "drinks" / "bar" / "bring own drinks" → Drinks Provided (toggle or select)
- "waiter" / "staff" / "servers" → Waiter Provided (toggle)
- "entertainment" → Entertainment Options (text)

Return:
{
  "suggest": true,
  "fields": [
    {
      "label": "concise field name",
      "type": "text" | "number" | "currency" | "date" | "time" | "toggle" | "select" | "multi-check" | "priced-item",
      "options": ["Option A", "Option B"],
      "price": 45,
      "priceUnit": "per_head" | "flat"
    }
  ]
}

Type rules:
- "date" for any date/when/anniversary
- "time" for start/arrival/finish/setup times
- "number" for guest count, headcount, quantity, staff count
- "currency" for budget, spend, total cost
- "toggle" for yes/no questions (allergies present, speeches, disabled access, bring own drinks, bring own waiter)
- "select" for single-choice from fixed options (service style, package tier, meal course count)
- "multi-check" for multiple-choice selections (dietary requirements, food preferences)
- "priced-item" for specific food dishes, drinks, or menu items with a price
- "text" for everything else (names, email, phone, venue, free-text notes)

Only include "options" for select/multi-check. Only include "price"/"priceUnit" for priced-item.

Only return { "suggest": false } when the line is PURELY small talk (greetings, filler words like "okay", "that's great", "sure") with absolutely no intake fields at all.`,
        },
        {
          role: 'user',
          content: `Analyse this transcript line and respond in json.${
            recentContext.length
              ? `\n\nRecent context (for understanding continuations):\n${recentContext.map(l => `${l.speaker}: ${l.text}`).join('\n')}`
              : ''
          }\n\nLatest line:\n${line}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`suggestField ${res.status}: ${err}`);
  }

  const data = await res.json();
  const result = JSON.parse(data.choices[0].message.content);

  // Normalise old {field} shape
  if (result.suggest && result.field && !result.fields) {
    result.fields = [result.field];
  }

  // Sanitise types
  if (result.fields) {
    result.fields = result.fields.map(f => ({
      ...f,
      type: VALID_TYPES.includes(f.type) ? f.type : 'text',
    }));
  }

  return result;
}

// ---------------------------------------------------------------------------
// GPT-4o-mini — P2: extract field values from a transcript line
// recentContext: last few lines so GPT can match "yes" / "120" to a question
// ---------------------------------------------------------------------------
export async function fillFields(line, fields, recentContext = []) {
  if (!fields.length) return { fills: [] };

  const fieldList = fields.map(f =>
    `key="${f.key}" label="${f.label}" type="${f.type}"` +
    (f.options?.length ? ` options=[${f.options.join(', ')}]` : '') +
    (f.type === 'priced-item' ? ` price=£${f.price} ${f.priceUnit === 'per_head' ? 'per head' : 'flat'}` : '')
  ).join('\n');

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyse a live intake call. Extract field values from what the client just said and return a valid JSON object:
{ "fills": [ { "key": "...", "value": ... } ] }

Value format by type:
- toggle → true or false (boolean)
- number → integer
- priced-item → integer quantity (if client just confirms they want it without a number, return 1)
- multi-check → array of strings matching available options
- date → "DD Mon YYYY" (e.g. "14 Sep 2026")
- time → "HH:MM" 24h
- currency → numeric string (e.g. "3500")
- text / select → plain string

Use the conversation context to resolve short answers like "yes", "120", "June" to the correct field.

Available fields:\n${fieldList}

If nothing in this line answers any field, return { "fills": [] }.`,
        },
        {
          role: 'user',
          content: `Analyse this transcript line and respond in json.${
            recentContext.length
              ? `\n\nRecent conversation:\n${recentContext.map(l => `${l.speaker}: ${l.text}`).join('\n')}`
              : ''
          }\n\nLatest line:\n${line}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`fillFields ${res.status}: ${err}`);
  }

  try {
    return JSON.parse((await res.json()).choices[0].message.content);
  } catch {
    return { fills: [] };
  }
}

// ---------------------------------------------------------------------------
// GPT-4o — P1 end: re-analyse full transcript, reconcile fields, return summary
// ---------------------------------------------------------------------------
export async function analyzeFullConversation(transcript, currentFields) {
  const transcriptText = transcript
    .map(l => `${l.speaker}: ${l.text}`)
    .join('\n');

  const existing = currentFields.map(f =>
    `label="${f.label}" type="${f.type}"` +
    (f.options?.length ? ` options=[${f.options.join(', ')}]` : '') +
    (f.type === 'priced-item' ? ` price=£${f.price} ${f.priceUnit}` : '')
  ).join('\n') || '(none yet)';

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are reviewing a completed discovery call transcript. Return a valid JSON object with two keys:

"fields": clean, deduplicated array of ALL data points the owner mentioned. Each: { "label": string, "type": one of text/number/currency/date/time/toggle/select/multi-check/priced-item, "options": [] (only select/multi-check), "price": number (only priced-item), "priceUnit": "per_head"|"flat" (only priced-item) }

"summary": 2-3 sentence plain-English summary of what this business collects.

Rules:
- Merge duplicates (e.g. "Event Date" and "Date of Event" → one field)
- Correct wrong types (guest count → "number", not "text")
- Add clearly mentioned fields that were missed
- Remove false positives from small talk
- Preserve the order fields were first mentioned`,
        },
        {
          role: 'user',
          content: `Analyse this transcript in json and return the final field list.\n\nTranscript:\n${transcriptText}\n\nFields detected so far:\n${existing}`,
        },
      ],
    }),
  }, 45000); // longer timeout for full analysis

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`analyzeFullConversation ${res.status}: ${err}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

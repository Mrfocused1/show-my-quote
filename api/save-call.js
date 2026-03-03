import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const { direction, from_number, duration, transcript, call_sid, status = 'completed', niche = null } = req.body || {};

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  let result;
  if (call_sid) {
    // Upsert: inbound calls already have a row from twilio-voice webhook; update it with final data
    result = await supabase
      .from('calls')
      .upsert({
        call_sid,
        direction: direction || 'outbound',
        from_number: from_number || null,
        duration: duration || null,
        transcript: transcript || [],
        status,
        niche: niche || null,
      }, { onConflict: 'call_sid' })
      .select('id')
      .single();
  } else {
    // No call_sid (e.g. mic-only or outbound without a SID) — plain insert
    result = await supabase
      .from('calls')
      .insert({
        direction: direction || 'outbound',
        from_number: from_number || null,
        duration: duration || null,
        transcript: transcript || [],
        status,
        niche: niche || null,
      })
      .select('id')
      .single();
  }

  const { data, error } = result;
  if (error) {
    console.error('[save-call] Supabase error:', error.code, error.message, error.hint, error.details);
    return res.status(500).json({ error: error.message, code: error.code, hint: error.hint, details: error.details });
  }
  res.json({ id: data.id });
}

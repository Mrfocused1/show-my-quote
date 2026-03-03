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

  const row = {
    direction:   direction || 'outbound',
    from_number: from_number || null,
    duration:    duration || null,
    transcript:  transcript || [],
    status,
    niche:       niche || null,
  };

  const { data, error } = call_sid
    ? await supabase.from('calls').upsert({ call_sid, ...row }, { onConflict: 'call_sid' }).select('id').single()
    : await supabase.from('calls').insert(row).select('id').single();

  if (error) {
    console.error('[save-call] Supabase error:', error.message);
    return res.status(500).json({ error: error.message });
  }
  res.json({ id: data.id });
}

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

  const baseRow = {
    direction:   direction || 'outbound',
    from_number: from_number || null,
    duration:    duration || null,
    transcript:  transcript || [],
    status,
  };

  const doInsert = (row) => call_sid
    ? supabase.from('calls').upsert({ call_sid, ...row }, { onConflict: 'call_sid' }).select('id').single()
    : supabase.from('calls').insert(row).select('id').single();

  // Try with niche first; fall back without it (column may not exist in older DB schemas)
  let result = await doInsert({ ...baseRow, niche: niche || null });
  if (result.error?.code === '42703') {
    // column does not exist — retry without niche
    result = await doInsert(baseRow);
  }

  const { data, error } = result;
  if (error) {
    console.error('[save-call] Supabase error:', error.code, error.message, error.hint, error.details);
    return res.status(500).json({ error: error.message, code: error.code, hint: error.hint, details: error.details });
  }
  res.json({ id: data.id });
}

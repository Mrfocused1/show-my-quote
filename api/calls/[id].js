import { setCors, requireApiKey } from '../_lib/auth.js';
import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireApiKey(req, res)) return;

  const { id } = req.query;
  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  if (req.method === 'PATCH') {
    const { from_number, transcript, status, niche } = req.body || {};
    const updates = {};
    if (from_number !== undefined) updates.from_number = from_number;
    if (transcript !== undefined) updates.transcript = transcript;
    if (status !== undefined) updates.status = status;
    if (niche !== undefined) updates.niche = niche;
    const { data, error } = await supabase
      .from('calls')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ call: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('calls')
      .delete()
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.status(405).end();
}

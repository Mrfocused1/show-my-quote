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
    const body = req.body || {};
    const updates = {};
    const fields = ['status', 'notes', 'ai_research', 'contact_id', 'last_contacted_at',
                    'phone', 'email', 'website', 'business_name'];
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ lead: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.status(405).end();
}

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
    const { name, phone, email, event_type, notes } = req.body || {};
    const updates = {};
    if (name       !== undefined) updates.name       = name;
    if (phone      !== undefined) updates.phone      = phone;
    if (email      !== undefined) updates.email      = email;
    if (event_type !== undefined) updates.event_type = event_type;
    if (notes      !== undefined) updates.notes      = notes;
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ contact: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.status(405).end();
}

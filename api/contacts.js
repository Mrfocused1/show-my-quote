import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === 'GET') {
    if (!requireApiKey(req, res)) return;
    if (!supabase) return res.json({ contacts: [] });
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ contacts: data || [] });
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'DB not configured' });
    const { name, phone, email, event_type } = req.body || {};
    const { data, error } = await supabase
      .from('contacts')
      .insert({ name, phone, email, event_type })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ contact: data });
  }

  res.status(405).end();
}

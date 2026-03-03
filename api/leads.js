import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireApiKey(req, res)) return;

  const supabase = getSupabase();

  if (req.method === 'GET') {
    if (!supabase) return res.json({ leads: [] });
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ leads: data || [] });
  }

  if (req.method === 'POST') {
    if (!supabase) return res.status(503).json({ error: 'DB not configured' });
    const body = req.body || {};
    // Accept a single object or an array for bulk insert
    const rows = Array.isArray(body) ? body : [body];
    // Upsert on google_place_id — silently skips any row that already exists
    const { data, error } = await supabase
      .from('leads')
      .upsert(rows, { onConflict: 'google_place_id', ignoreDuplicates: true })
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ leads: data || [] });
  }

  res.status(405).end();
}

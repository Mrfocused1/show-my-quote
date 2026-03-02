import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const supabase = getSupabase();
  if (!supabase) return res.json({ calls: [] });

  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ calls: data || [] });
}

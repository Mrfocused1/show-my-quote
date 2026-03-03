import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

/**
 * GET  /api/app-settings        — returns all settings as { key: value }
 * POST /api/app-settings        — upserts settings, body: { key: value, ... }
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireApiKey(req, res)) return;

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (error) return res.status(500).json({ error: error.message });
    const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]));
    // Merge env var fallback for owner_phone
    if (!settings.owner_phone && process.env.OWNER_PHONE_NUMBER) {
      settings.owner_phone = process.env.OWNER_PHONE_NUMBER;
    }
    return res.json(settings);
  }

  if (req.method === 'POST') {
    const updates = req.body || {};
    const rows = Object.entries(updates).map(([key, value]) => ({ key, value: value || null }));
    if (!rows.length) return res.json({ ok: true });
    const { error } = await supabase
      .from('app_settings')
      .upsert(rows, { onConflict: 'key' });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

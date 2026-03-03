import { setCors } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  // Public endpoint — no API key required (clients sign without being logged in)

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token required' });

  const { signature_data, signer_name } = req.body || {};
  if (!signature_data) return res.status(400).json({ error: 'signature_data required' });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  // Check it exists and hasn't already been signed
  const { data: existing } = await supabase
    .from('signature_requests')
    .select('signed_at')
    .eq('token', token)
    .single();

  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.signed_at) return res.status(409).json({ error: 'Already signed' });

  const { error } = await supabase
    .from('signature_requests')
    .update({
      signature_data,
      signer_name: signer_name || null,
      signed_at:   new Date().toISOString(),
      signer_ip:   req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
    })
    .eq('token', token);

  if (error) {
    console.error('[sign-submit]', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
}

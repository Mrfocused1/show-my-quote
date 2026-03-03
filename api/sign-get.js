import { setCors } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  // Public endpoint — no API key required (clients need to access this without auth)

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token required' });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  const { data, error } = await supabase
    .from('signature_requests')
    .select('token, client_name, client_email, document_title, document_data, signed_at, created_at')
    .eq('token', token)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Signing request not found' });

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    token:          data.token,
    client_name:    data.client_name,
    client_email:   data.client_email,
    document_title: data.document_title,
    document_data:  data.document_data,
    signed_at:      data.signed_at,
    created_at:     data.created_at,
    already_signed: !!data.signed_at,
  });
}

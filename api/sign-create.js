import { setCors, requireApiKey } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const { call_id, client_name, client_email, document_title, document_data } = req.body || {};
  if (!document_title) return res.status(400).json({ error: 'document_title required' });

  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  const token = randomUUID();

  const { error } = await supabase.from('signature_requests').insert({
    token,
    call_id:        call_id || null,
    client_name:    client_name || null,
    client_email:   client_email || null,
    document_title,
    document_data:  document_data || {},
  });

  if (error) {
    console.error('[sign-create]', error.message);
    return res.status(500).json({ error: error.message });
  }

  const base = process.env.APP_URL || 'https://www.showmyquote.com';
  res.json({ token, sign_url: `${base}/sign?token=${token}` });
}

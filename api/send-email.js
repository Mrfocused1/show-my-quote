import { Resend } from 'resend';
import { setCors, requireApiKey } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireApiKey(req, res)) return;

  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject and body are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set');
    return res.status(503).json({ error: 'Email not configured' });
  }

  const resend = new Resend(apiKey);

  console.log('Sending email to:', to, '| subject:', subject);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Show My Quote <hello@showmyquote.com>',
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        ${body.replace(/\n/g, '<br>')}
        <br><br>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="font-size:12px;color:#94a3b8">Sent via Show My Quote · <a href="https://showmyquote.com" style="color:#94a3b8">showmyquote.com</a></p>
      </div>`,
    });

    if (error) {
      console.error('Resend error:', JSON.stringify(error));
      return res.status(500).json({ error: error.message || 'Failed to send' });
    }

    console.log('Email sent:', JSON.stringify(data));
    return res.json({ ok: true });
  } catch (err) {
    console.error('Send email exception:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to send' });
  }
}

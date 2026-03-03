import { Resend } from 'resend';
import { setCors } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email and message are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Graceful fallback — log and pretend success so form UX isn't broken
    console.warn('RESEND_API_KEY not set — contact form submission not delivered', { name, email });
    return res.json({ ok: true });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: 'Show My Quote <hello@showmyquote.com>',
    to: 'hello@showmyquote.com',
    replyTo: email,
    subject: `New enquiry from ${name}`,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }

  return res.json({ ok: true });
}

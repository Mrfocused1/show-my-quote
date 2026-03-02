import Pusher from 'pusher';
import { getSupabase } from './_lib/supabase.js';

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

export default async function handler(req, res) {
  // Webhook from SignalWire — no API key check (external POST)
  const from = req.body?.From || '';
  const body = req.body?.Body || '';
  const to   = process.env.SIGNALWIRE_PHONE_NUMBER || '';
  console.log('[sms-receive] from:', from, '| body:', body);

  // Broadcast the raw SMS via Pusher so the dashboard can show it live
  await pusher.trigger('sms-inbox', 'message', { from, body, date: new Date().toISOString() });

  // Persist to Supabase (best-effort)
  const supabase = getSupabase();
  if (supabase) {
    supabase.from('sms_messages').insert({
      direction: 'inbound',
      to_number: to,
      from_number: from,
      body,
    }).then(({ error }) => {
      if (error) console.error('[sms-receive] Supabase insert error:', error.message);
    });
  }

  // Respond with empty TwiML so SignalWire is happy
  res.setHeader('Content-Type', 'text/xml');
  res.send('<Response></Response>');
}

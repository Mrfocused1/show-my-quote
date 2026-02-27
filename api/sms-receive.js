import Pusher from 'pusher';

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

export default async function handler(req, res) {
  // Twilio sends POST with URL-encoded body
  const from = req.body?.From || '';
  const body = req.body?.Body || '';
  console.log('SMS received from:', from, '| body:', body);

  // Broadcast the raw SMS via Pusher so the dashboard can show it live
  await pusher.trigger('sms-inbox', 'message', { from, body, date: new Date().toISOString() });

  // Respond with empty TwiML so Twilio is happy
  res.setHeader('Content-Type', 'text/xml');
  res.send('<Response></Response>');
}

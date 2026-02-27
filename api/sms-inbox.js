export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const toNumber   = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    return res.status(503).json({ error: 'Twilio not configured' });
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?To=${encodeURIComponent(toNumber)}&PageSize=10`;
  const response = await fetch(url, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
  });

  const data = await response.json();
  const messages = (data.messages || []).map(m => ({
    from: m.from,
    body: m.body,
    date: m.date_sent,
  }));

  res.json({ messages });
}

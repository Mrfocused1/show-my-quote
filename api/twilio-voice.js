import twilio from 'twilio';

export default async function handler(req, res) {
  // Twilio sends POST with URL-encoded body
  res.setHeader('Content-Type', 'text/xml');

  const To = req.body?.To || req.query?.To;
  const twiml = new twilio.twiml.VoiceResponse();

  if (To) {
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      record: 'record-from-ringing',
      recordingStatusCallback: '/api/twilio-recording',
    });
    dial.number(To);
  } else {
    twiml.say('No number provided.');
  }

  res.send(twiml.toString());
}

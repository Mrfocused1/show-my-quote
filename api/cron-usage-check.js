import { getSupabase } from './_lib/supabase.js';
import { Resend } from 'resend';

const MINUTE_LIMIT  = 3500;
const WARN_AT       = Math.floor(MINUTE_LIMIT * 0.8); // 2,800 mins

/**
 * GET /api/cron-usage-check
 * Runs daily via Vercel cron (see vercel.json).
 * For each business that has hit 80% of their monthly minutes,
 * sends a warning email (once per month).
 */
export default async function handler(req, res) {
  // Vercel cron authenticates with CRON_SECRET
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const supabase = getSupabase();
  if (!supabase) return res.json({ ok: false, error: 'no supabase' });

  const now          = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart   = `${currentMonth}-01`;

  // All businesses with an email address
  const { data: businesses, error: bizErr } = await supabase
    .from('businesses')
    .select('id, name, email, usage_warning_sent_month')
    .not('email', 'is', null);

  if (bizErr) {
    console.error('[cron-usage-check] businesses fetch error:', bizErr.message);
    return res.status(500).json({ ok: false });
  }

  const warned = [];

  for (const biz of businesses || []) {
    // Only send once per calendar month
    if (biz.usage_warning_sent_month === currentMonth) continue;

    // Sum all call seconds for this business in the current month
    const { data: calls } = await supabase
      .from('calls')
      .select('duration')
      .eq('business_id', biz.id)
      .gte('created_at', monthStart)
      .not('duration', 'is', null);

    const totalSecs = (calls || []).reduce((sum, c) => sum + (c.duration || 0), 0);
    const totalMins = Math.floor(totalSecs / 60);

    if (totalMins < WARN_AT) continue;

    const pct       = Math.round((totalMins / MINUTE_LIMIT) * 100);
    const remaining = MINUTE_LIMIT - totalMins;

    // Send warning email
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailErr } = await resend.emails.send({
      from: 'Show My Quote <hello@showmyquote.com>',
      to:   biz.email,
      subject: `Heads up — you've used ${pct}% of your monthly call minutes`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
          <h2 style="color:#1e293b;margin-bottom:8px">Monthly usage update</h2>
          <p>Hi ${biz.name || 'there'},</p>
          <p>
            You've used <strong>${totalMins.toLocaleString()} of your 3,500 monthly minutes</strong>
            (${pct}%) on Show My Quote this month.
          </p>
          <p>You have approximately <strong>${remaining.toLocaleString()} minutes remaining</strong> for the rest of the month.</p>
          <p style="margin-top:24px;padding:16px;background:#fef9c3;border-radius:8px;border-left:4px solid #eab308">
            If you expect a high volume of calls this month (e.g. after a storm event),
            reply to this email and we'll make sure you're covered.
          </p>
          <p>Your calls and transcriptions will continue to work as normal — this is just a heads up.</p>
          <p>— The Show My Quote team</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="font-size:12px;color:#94a3b8">
            Show My Quote · <a href="https://showmyquote.com" style="color:#94a3b8">showmyquote.com</a>
          </p>
        </div>
      `,
    });

    if (emailErr) {
      console.error('[cron-usage-check] email error for', biz.id, emailErr.message);
      continue;
    }

    // Mark as warned for this month
    await supabase
      .from('businesses')
      .update({ usage_warning_sent_month: currentMonth })
      .eq('id', biz.id);

    console.log(`[cron-usage-check] warned ${biz.name} (${totalMins} mins, ${pct}%)`);
    warned.push({ business: biz.name, mins: totalMins, pct });
  }

  return res.json({ ok: true, checked: (businesses || []).length, warned });
}

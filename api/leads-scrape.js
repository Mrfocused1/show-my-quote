import { setCors, requireApiKey } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const apiKey = process.env.APIFY_API_TOKEN;
  if (!apiKey) {
    return res.status(503).json({
      error: 'APIFY_API_TOKEN not configured. Sign up free at apify.com — you get $5/month free credit (~1,000 leads/month). Add APIFY_API_TOKEN to your Vercel environment variables.',
    });
  }

  const { query, location, limit = 20, minReviews = 0 } = req.body || {};
  if (!query || !location) {
    return res.status(400).json({ error: 'query and location are required' });
  }

  const searchString = `${query} ${location}`;
  const maxCrawled = Math.min(Number(limit) || 20, 50);

  try {
    const r = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apiKey}&format=json`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [searchString],
          maxCrawledPlacesPerSearch: maxCrawled,
          language: 'en',
          countryCode: 'us',
        }),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      console.error('[leads-scrape] Apify error:', errText);
      return res.status(502).json({ error: 'Apify API error: ' + errText });
    }

    const raw = await r.json();
    const min = Number(minReviews) || 0;

    const leads = raw
      .filter(p => (p.reviewsCount || 0) >= min)
      .map(p => ({
        business_name:   p.title || 'Unknown',
        phone:           p.phone || null,
        email:           p.email || null,
        website:         p.website || null,
        address:         p.address || null,
        city:            p.city || null,
        state:           p.state || null,
        rating:          p.totalScore || null,
        reviews_count:   p.reviewsCount || 0,
        category:        p.categoryName || null,
        google_place_id: p.placeId || null,
        source:          'google_maps',
      }));

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ leads, total: leads.length, query: searchString });
  } catch (err) {
    console.error('[leads-scrape] error:', err);
    return res.status(500).json({ error: err.message });
  }
}

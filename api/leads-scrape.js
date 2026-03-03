import { setCors, requireApiKey } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireApiKey(req, res)) return;

  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'OUTSCRAPER_API_KEY not configured. Get a free API key at outscraper.com and add it to your Vercel environment variables.',
    });
  }

  const { query, location, limit = 20, minReviews = 0, scrapeEmail = false } = req.body || {};
  if (!query || !location) {
    return res.status(400).json({ error: 'query and location are required' });
  }

  const searchQuery = `${query} ${location}`;
  const params = new URLSearchParams({
    query: searchQuery,
    limit: String(Math.min(Number(limit) || 20, 50)),
    async: 'false',
    language: 'en',
  });
  if (scrapeEmail) params.set('enrichment', 'emails_and_contacts');

  try {
    const r = await fetch(`https://api.app.outscraper.com/maps/search-v3?${params}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('[leads-scrape] Outscraper error:', errText);
      return res.status(502).json({ error: 'Outscraper API error: ' + errText });
    }

    const data = await r.json();
    const raw = (data.data || []).flat().filter(Boolean);

    const min = Number(minReviews) || 0;
    const leads = raw
      .filter(b => (b.reviews || 0) >= min)
      .map(b => {
        const emails = b.emails_and_contacts?.emails || [];
        return {
          business_name:   b.name || 'Unknown',
          phone:           b.phone || null,
          email:           emails[0] || null,
          website:         b.site || null,
          address:         b.full_address || null,
          city:            b.city || null,
          state:           b.us_state || b.state || null,
          rating:          b.rating || null,
          reviews_count:   b.reviews || 0,
          category:        b.type || b.category || null,
          google_place_id: b.place_id || null,
          source:          'google_maps',
        };
      });

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ leads, total: leads.length, query: searchQuery });
  } catch (err) {
    console.error('[leads-scrape] error:', err);
    return res.status(500).json({ error: err.message });
  }
}

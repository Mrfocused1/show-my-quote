// Shared helpers for API endpoint protection.

const ALLOWED_ORIGINS = [
  'https://www.showmyquote.com',
  'https://showmyquote.com',
];

/**
 * Set CORS headers — allows the production domain, Vercel preview deployments,
 * and local dev servers. Call before any res.json() or res.send().
 */
export function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1');

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-smq-key');
}

/**
 * Check x-smq-key header against the SMQ_API_KEY env var.
 * Returns true if the request is authorised (or if the key is not configured).
 * Returns false and sends a 401 response if unauthorised.
 */
export function requireApiKey(req, res) {
  const expected = process.env.SMQ_API_KEY;
  if (!expected) return true; // Key not configured → open (dev mode)
  const actual = req.headers['x-smq-key'];
  if (actual !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

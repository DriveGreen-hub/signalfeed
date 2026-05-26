export default async function handler(req, res) {
  // Allow all origins so the frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Decode and validate URL
  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    const parsed = new URL(targetUrl);
    // Only allow safe domains — RSS feeds, Reddit JSON, Nitter instances
    const allowed = [
      'news.google.com',
      'electrek.co',
      'cnevpost.com',
      'www.reddit.com',
      'reddit.com',
      'nitter.poast.org',
      'nitter.privacydev.net',
      'nitter.nl',
      'nitter.esmailelbob.xyz',
      'nitter.tiekoetter.com',
      'nitter.1d4.us',
    ];
    const host = parsed.hostname;
    const ok = allowed.some(d => host === d || host.endsWith('.' + d));
    if (!ok) {
      return res.status(403).json({ error: 'Domain not allowed: ' + host });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SignalFeed/1.0; RSS reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/json, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error: ' + response.status });
    }

    const contentType = response.headers.get('content-type') || 'text/plain';
    const text = await response.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // cache 5 min on Vercel edge
    return res.status(200).send(text);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

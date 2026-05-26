export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    new URL(targetUrl); // validate
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL: ' + url });
  }

  // Allowed domains — RSS sources + Nitter instances
  const ALLOWED = [
    'news.google.com',
    'electrek.co',
    'cnevpost.com',
    'insideevs.com',
    'www.reddit.com',
    'reddit.com',
    'nitter.poast.org',
    'nitter.privacydev.net',
    'nitter.nl',
    'nitter.esmailelbob.xyz',
    'nitter.tiekoetter.com',
    'nitter.1d4.us',
    'nitter.kavin.rocks',
    'nitter.unixfox.eu',
    'nitter.namazso.eu',
  ];

  const host = new URL(targetUrl).hostname;
  const allowed = ALLOWED.some(d => host === d || host.endsWith('.' + d));
  if (!allowed) return res.status(403).json({ error: 'Domain not allowed: ' + host });

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9,zh;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    const contentType = response.headers.get('content-type') || 'text/plain';
    const text = await response.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(text);

  } catch (e) {
    return res.status(500).json({ error: 'Fetch failed: ' + e.message });
  }
}

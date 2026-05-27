export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    new URL(targetUrl);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

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
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Domain not allowed: ' + host }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

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

    return new Response(text, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Fetch failed: ' + e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

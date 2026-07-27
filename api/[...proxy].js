// The one server-side proxy. Reddit and GamerPower don't send CORS headers,
// so the browser can't call them directly — this fetches them server-side and
// passes the bytes straight back.
//
// Routes: /api/reddit?sub=&limit=   /api/games?platform=
// Also used by devpulse-proxy.js for local dev, so it sticks to the plain
// node req/res API rather than Vercel's res.status().send() sugar.

const https = require('https');

const UA = 'devpulse-dashboard/1.0';

// ponytail: one fetcher. JSON and XML are both just text we pass through
// untouched, so there's nothing for a second parser-aware version to do.
function fetchUpstream(url, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft === 0) return reject(new Error('Too many redirects'));
        return fetchUpstream(new URL(res.headers.location, url).href, redirectsLeft - 1)
          .then(resolve, reject);
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error('Upstream returned HTTP ' + res.statusCode));
      });
    }).on('error', reject);
  });
}

// Query values land in a URL, so every one of them is scrubbed here.
// 100 is Reddit's own listing ceiling; anything above it is pointless.
const clamp = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : fallback;
};

const ROUTES = {
  reddit: (q) => [
    'https://www.reddit.com/r/' +
      encodeURIComponent(q.get('sub') || 'programming') +
      '/.rss?limit=' + clamp(q.get('limit'), 8),
    'application/xml; charset=utf-8'
  ],
  games: (q) => [
    // GamerPower joins platforms with '+', which encodeURIComponent would
    // mangle — strip to the characters their filter accepts instead.
    'https://www.gamerpower.com/api/filter?platform=' +
      (q.get('platform') || 'epic-games-store+steam').replace(/[^a-z0-9.+-]/gi, '') +
      '&type=game&sort-by=date',
    'application/json; charset=utf-8'
  ]
};

module.exports = async function handler(req, res) {
  const { pathname, searchParams } = new URL(req.url, 'http://localhost');
  const route = ROUTES[pathname.split('/').filter(Boolean).pop()];

  if (!route) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }

  const [target, contentType] = route(searchParams);
  try {
    const body = await fetchUpstream(target);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      // Reddit rate-limits datacenter IPs hard; let the CDN absorb the traffic.
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
    });
    res.end(body);
  } catch (err) {
    res.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: err.message }));
  }
};

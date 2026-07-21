// devpulse-proxy.js
// A tiny, zero-dependency local proxy for the DevPulse dashboard.
// Fetches Reddit + GamerPower data server-side (where CORS doesn't apply)
// and re-serves it to the browser with an Access-Control-Allow-Origin header.
//
// Run:   node devpulse-proxy.js
// Then just open devpulse.html normally — it auto-detects this and uses it
// instead of the public relay. Ctrl+C to stop. Nothing is stored; it's a
// pure pass-through, request in -> JSON out.

const http = require('http');
const https = require('https');

const PORT = 8787;

function fetchJSON(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      // Follow a single redirect if Reddit/GamerPower send one
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location, headers).then(resolve, reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error('Upstream returned HTTP ' + res.statusCode));
        }
      });
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // Chrome's Private Network Access blocks file:// / public pages from reaching
  // localhost unless the server explicitly opts in with this header — without
  // it, the browser silently fails the request before your code ever sees it.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');

  try {
    if (url.pathname === '/reddit') {
      const sub = url.searchParams.get('sub') || 'programming';
      const limit = url.searchParams.get('limit') || '8';
      const data = await fetchJSON(
        `https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=${encodeURIComponent(limit)}`,
        // Reddit requires a descriptive User-Agent or it rate-limits/blocks you.
        { 'User-Agent': 'devpulse-personal-dashboard/1.0 (local script, single user)' }
      );
      res.setHeader('Content-Type', 'application/json');
      res.end(data);

    } else if (url.pathname === '/games') {
      const platform = url.searchParams.get('platform') || 'epic-games-store+steam';
      const data = await fetchJSON(
        `https://www.gamerpower.com/api/filter?platform=${platform}&type=game&sort-by=date`,
        { 'User-Agent': 'devpulse-personal-dashboard/1.0' }
      );
      res.setHeader('Content-Type', 'application/json');
      res.end(data);

    } else if (url.pathname === '/health') {
      res.end('ok');

    } else {
      res.statusCode = 404;
      res.end('Not found. Try /reddit?sub=programming or /games');
    }
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`DevPulse local proxy running at http://localhost:${PORT}`);
  console.log('Leave this running, then open devpulse.html in your browser.');
  console.log('Ctrl+C to stop.');
});
// devpulse-proxy.js
// A tiny, zero-dependency local proxy for the DevPulse dashboard.
// Fetches Reddit + GamerPower data server-side (where CORS doesn't apply)
// and re-serves it to the browser with an Access-Control-Allow-Origin header.
//
// Run:   node devpulse-proxy.js
// Then just open devpulse.html normally — it auto-detects this and uses it
// instead of the public relay. Ctrl+C to stop. Nothing is stored; it's a
// pure pass-through, request in -> JSON out.

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const PORT = 8787;
const PUBLIC_ROOT = process.cwd();

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
          const err = new Error('Upstream returned HTTP ' + res.statusCode);
          err.statusCode = res.statusCode;
          err.body = data;
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function fetchText(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, headers).then(resolve, reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          const err = new Error('Upstream returned HTTP ' + res.statusCode);
          err.statusCode = res.statusCode;
          err.body = data;
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function fetchWithRelayText(targetUrl) {
  const relayUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl);
  return await fetchText(relayUrl, {
    'User-Agent': 'devpulse-personal-dashboard/1.0 (local script, single user)',
    'Accept': 'application/xml, text/xml, */*'
  });
}

function getContentType(filename) {
  if (filename.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filename.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filename.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filename.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filename.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

function sendStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', getContentType(filePath));
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (url.pathname === '/reddit') {
      const sub = url.searchParams.get('sub') || 'programming';
      const limit = url.searchParams.get('limit') || '8';
      const format = url.searchParams.get('format') || 'json';
      if (format === 'rss') {
        const rssUrl = `https://www.reddit.com/r/${encodeURIComponent(sub)}/.rss?limit=${encodeURIComponent(limit)}`;
        const data = await fetchText(rssUrl, {
          'User-Agent': 'devpulse-personal-dashboard/1.0 (local script, single user)',
          'Accept': 'application/xml, text/xml, */*'
        });
        res.setHeader('Content-Type', 'application/xml');
        res.end(data);
      } else {
        const redditUrl = `https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=${encodeURIComponent(limit)}&raw_json=1`;
        try {
          const data = await fetchJSON(redditUrl, {
            'User-Agent': 'devpulse-personal-dashboard/1.0 (local script, single user)',
            'Accept': 'application/json'
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(data);
        } catch (err) {
          const rssUrl = `https://www.reddit.com/r/${encodeURIComponent(sub)}/.rss?limit=${encodeURIComponent(limit)}`;
          try {
            const data = await fetchText(rssUrl, {
              'User-Agent': 'devpulse-personal-dashboard/1.0 (local script, single user)',
              'Accept': 'application/xml, text/xml, */*'
            });
            res.setHeader('Content-Type', 'application/xml');
            res.end(data);
          } catch (rssErr) {
            const data = await fetchWithRelayText(rssUrl);
            res.setHeader('Content-Type', 'application/xml');
            res.end(data);
          }
        }
      }

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
      let filePath = path.join(PUBLIC_ROOT, url.pathname === '/' ? 'devpulse.html' : url.pathname.slice(1));
      if (!filePath.startsWith(PUBLIC_ROOT)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        sendStaticFile(res, filePath);
      } else {
        res.statusCode = 404;
        res.end('Not found');
      }
    }
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`DevPulse local proxy running at http://localhost:${PORT}`);
  console.log('Leave this running, then open http://localhost:' + PORT + '/devpulse.html in your browser.');
  console.log('Ctrl+C to stop.');
});
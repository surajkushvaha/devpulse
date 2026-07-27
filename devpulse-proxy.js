// devpulse-proxy.js
// Local dev server. Serves the static files and mounts the exact same /api
// handler Vercel runs in production, so localhost and the deployed site
// behave identically — there is no second copy of the proxy logic.
//
// Run:  node devpulse-proxy.js   ->  http://localhost:8787

const fs = require('fs');
const http = require('http');
const path = require('path');

const apiHandler = require('./api/[...proxy].js');

const PORT = 8787;
// Same directory Vercel serves statically, so local matches the deploy.
const ROOT = path.join(__dirname, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // new URL() already collapses ../ segments; the ROOT check below covers
  // whatever encoding tricks survive that.
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname.startsWith('/api/')) return apiHandler(req, res);
  if (pathname === '/health') return res.end('ok');

  const filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }

  res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`DevPulse running at http://localhost:${PORT}`);
  console.log('Ctrl+C to stop.');
});

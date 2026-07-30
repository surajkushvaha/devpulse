// The one server-side proxy. Reddit, GamerPower, and arXiv send no CORS headers,
// so the browser can't call them directly — this route fetches them server-side
// and passes the bytes straight back.
//
// Routes: /api/reddit?sub=&limit=   /api/games?platform=   /api/papers?cat=&limit=

// Reading the query string makes this handler dynamic; be explicit so Next never
// tries to prerender or cache it at build time.
export const dynamic = 'force-dynamic';

const UA = 'devpulse-dashboard/2.0';

// Query values land in a URL, so every one of them is scrubbed here.
// 100 is Reddit's own listing ceiling; anything above it is pointless.
const clamp = (v: string | null, fallback: number): number => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : fallback;
};

// arXiv paging offset — 0-based, with a generous ceiling so the papers feed can
// scroll deep without letting an arbitrary value through.
const clampStart = (v: string | null): number => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 && n <= 2000 ? n : 0;
};

const ROUTES: Record<string, (q: URLSearchParams) => [string, string]> = {
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
  ],
  papers: (q) => [
    // arXiv's Atom API sends no CORS headers, so it goes through here too.
    // A category is 'cs.AI'-shaped, so dots survive but nothing else does.
    'https://export.arxiv.org/api/query?search_query=cat:' +
      (q.get('cat') || 'cs.AI').replace(/[^a-z0-9.]/gi, '') +
      '&sortBy=submittedDate&sortOrder=descending&start=' + clampStart(q.get('start')) +
      '&max_results=' + clamp(q.get('limit'), 25),
    'application/atom+xml; charset=utf-8'
  ]
};

export async function GET(req: Request, { params }: { params: Promise<{ proxy: string[] }> }) {
  // Next 15+ hands params in as a promise.
  const { proxy } = await params;
  const key = Array.isArray(proxy) ? proxy[proxy.length - 1] : proxy;
  const route = ROUTES[key];

  if (!route) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const { searchParams } = new URL(req.url);
  const [target, contentType] = route(searchParams);

  try {
    // Global fetch follows redirects on its own, so there's nothing to unwind here.
    const upstream = await fetch(target, {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      cache: 'no-store'
    });
    if (!upstream.ok) throw new Error('Upstream returned HTTP ' + upstream.status);

    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        // Reddit rate-limits datacenter IPs hard; let the CDN absorb the traffic.
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

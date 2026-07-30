// Feed sources for the dashboard. Each source describes its panel (title,
// eyebrow, optional filter chips) and exposes:
//   start(ctx, filter) -> next()   — sets up a source and returns a pager
//   toCard(rawItem)                — maps one upstream item to the shared card
// `next()` returns the next array of items, or [] when the source is exhausted;
// whether that means another HTTP request or another slice of an already-fetched
// list is the source's own business. These run in the browser (Panel is a
// client component), so DOMParser and same-origin /api are both available.

export interface PillOption {
  label: string;
  value: string;
}

export interface CardModel {
  href: string;
  img: string | null;
  letter: string;
  badge?: string;
  title: string;
  meta: (string | false | null | undefined)[];
}

export type Pager = () => Promise<unknown[]> | unknown[];

export interface FeedCtx {
  setVia: (via: string) => void;
}

export interface Source {
  key: string;
  title: string;
  eyebrow: string;
  badge?: boolean;
  wide?: boolean;
  skeletonRows?: number;
  pills?: { options: PillOption[]; initial: string };
  emptyMessage?: string;
  error: { href: string; label: string };
  start: (ctx: FeedCtx, filter: string | null) => Promise<Pager>;
  // Upstream payloads are heterogeneous JSON/XML shapes; each mapper knows its own.
  toCard: (raw: any) => CardModel; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 3600) return Math.max(1, Math.floor(diff / 60)) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

function hnFavicon(url?: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return 'https://www.google.com/s2/favicons?domain=' + host + '&sz=64';
  } catch {
    return null;
  }
}

interface RedditItem {
  title: string;
  href: string;
  time: number;
  thumbnail: string | null;
  subreddit: string;
}

function parseRedditRss(xmlText: string): Omit<RedditItem, 'subreddit'>[] {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  return Array.from(doc.querySelectorAll('entry')).map((entry) => {
    const title = entry.querySelector('title')?.textContent || '';
    const link =
      entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
      entry.querySelector('link')?.getAttribute('href') ||
      '';
    const updated =
      entry.querySelector('updated')?.textContent ||
      entry.querySelector('published')?.textContent ||
      '';
    const time = updated ? Math.floor(Date.parse(updated) / 1000) : Math.floor(Date.now() / 1000);
    let thumbnail = entry.querySelector('media\\:thumbnail, thumbnail')?.getAttribute('url');
    if (!thumbnail) {
      const content = entry.querySelector('content')?.textContent || '';
      thumbnail = content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    }
    // Reddit puts 'self'/'default'/'nsfw' here when there is no real image.
    return { title, href: link, time, thumbnail: /^https?:\/\//.test(thumbnail || '') ? thumbnail! : null };
  });
}

interface ArxivItem {
  title: string;
  href: string;
  time: number;
  authors: string[];
  primary: string;
}

function parseArxiv(xmlText: string): ArxivItem[] {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  return Array.from(doc.querySelectorAll('entry')).map((entry) => {
    // arXiv wraps titles across lines; collapse the whitespace back down.
    const title = (entry.querySelector('title')?.textContent || '').replace(/\s+/g, ' ').trim();
    // <id> is the canonical abstract URL.
    const href = entry.querySelector('id')?.textContent || '';
    const published = entry.querySelector('published')?.textContent || '';
    const time = published ? Math.floor(Date.parse(published) / 1000) : Math.floor(Date.now() / 1000);
    const authors = Array.from(entry.querySelectorAll('author > name')).map((n) => n.textContent || '');
    // primary_category is namespaced (arxiv:); fall back to the first plain
    // <category> term, which every entry carries.
    const primary = entry.querySelector('primary_category, category')?.getAttribute('term') || '';
    return { title, href, time, authors, primary };
  });
}

const RELAYS: ((u: string) => string)[] = [
  (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u)
];

// Same-origin /api is the primary path (the Next route handler). If it isn't
// reachable, fall through to the public CORS relays.
async function fetchProxied(
  apiPath: string,
  directUrl: string,
  as: 'json' | 'text' = 'json'
): Promise<{ data: any; via: string }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const res = await fetch('/api' + apiPath, { cache: 'no-store' });
    if (res.ok) return { data: await res[as](), via: 'server proxy' };
  } catch {
    /* no server proxy reachable — fall through */
  }
  let lastErr: unknown;
  for (const relay of RELAYS) {
    try {
      const res = await fetch(relay(directUrl));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return { data: await res[as](), via: 'public relay' };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('no source reachable');
}

// Game giveaways, grouped by store. GamerPower joins platforms with '+', and its
// filter accepts every id below. The default keeps the classic epic+steam view.
const GAME_PLATFORMS: PillOption[] = [
  { label: 'Epic + Steam', value: 'epic-games-store+steam' },
  { label: 'Steam', value: 'steam' },
  { label: 'Epic', value: 'epic-games-store' },
  { label: 'Xbox', value: 'xbox-one+xbox-series-xs+xbox-360' },
  { label: 'PlayStation', value: 'ps4+ps5' },
  { label: 'GOG', value: 'gog' },
  { label: 'PC (all)', value: 'pc' }
];

// arXiv categories, grouped by field. Each maps to one arXiv archive code.
const PAPER_CATS: PillOption[] = [
  { label: 'AI', value: 'cs.AI' },
  { label: 'Machine Learning', value: 'cs.LG' },
  { label: 'Computer Vision', value: 'cs.CV' },
  { label: 'NLP', value: 'cs.CL' },
  { label: 'Systems', value: 'cs.DC' },
  { label: 'Robotics', value: 'cs.RO' }
];

export const SOURCES: Source[] = [
  {
    key: 'hn',
    title: 'Hacker News',
    eyebrow: 'top stories',
    skeletonRows: 8,
    error: { href: 'https://news.ycombinator.com', label: 'Open Hacker News' },
    async start() {
      const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      if (!idsRes.ok) throw new Error('HTTP ' + idsRes.status);
      // ~500 ids, but each story needs its own request, so fetch them in batches
      // as you scroll rather than firing 500 requests up front.
      const ids: number[] = await idsRes.json();
      let i = 0;
      return async () => {
        const batch = ids.slice(i, i + 20);
        i += 20;
        const items = await Promise.all(
          batch.map((id) =>
            fetch('https://hacker-news.firebaseio.com/v0/item/' + id + '.json').then((r) => r.json())
          )
        );
        return items.filter(Boolean);
      };
    },
    toCard: (it) => ({
      href: it.url || 'https://news.ycombinator.com/item?id=' + it.id,
      img: hnFavicon(it.url),
      letter: 'Y',
      title: it.title || '',
      meta: [(it.score || 0) + ' pts', (it.descendants || 0) + ' comments', timeAgo(it.time)]
    })
  },
  {
    key: 'reddit',
    title: 'Reddit',
    eyebrow: 'r/programming · r/webdev',
    badge: true,
    skeletonRows: 8,
    error: { href: 'https://reddit.com/r/programming', label: 'Open r/programming' },
    async start(ctx) {
      const subs = ['programming', 'webdev'];
      let via = 'server proxy';
      // Reddit's RSS has no cursor — one request per sub is all we get, so ask
      // for the maximum and page through the result client-side.
      const results = await Promise.all(
        subs.map(async (sub) => {
          const r = await fetchProxied(
            `/reddit?sub=${sub}&limit=100`,
            `https://www.reddit.com/r/${sub}/.rss?limit=100`,
            'text'
          );
          if (r.via === 'public relay') via = 'public relay';
          return parseRedditRss(r.data).map((item) => ({ ...item, subreddit: sub }));
        })
      );
      // Newest first, so the two subs interleave instead of one following the other.
      const combined = results.flat().sort((a, b) => b.time - a.time);
      ctx.setVia(via);
      let i = 0;
      return () => {
        const batch = combined.slice(i, i + 20);
        i += 20;
        return batch;
      };
    },
    toCard: (p: RedditItem) => ({
      href: p.href,
      img: p.thumbnail,
      letter: p.subreddit[0].toUpperCase(),
      title: p.title,
      meta: ['r/' + p.subreddit, timeAgo(p.time)]
    })
  },
  {
    key: 'github',
    title: 'GitHub Trending',
    eyebrow: 'stars this week',
    skeletonRows: 8,
    error: { href: 'https://github.com/trending', label: 'Open GitHub Trending' },
    async start() {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const url =
        'https://api.github.com/search/repositories?q=created:>' +
        since +
        '&sort=stars&order=desc&per_page=30&page=';
      let page = 0;
      return async () => {
        page++;
        // Unauthenticated search is rate-limited and caps at 1000 results anyway.
        if (page > 5) return [];
        const res = await fetch(url + page, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return (await res.json()).items || [];
      };
    },
    toCard: (repo) => ({
      href: repo.html_url,
      img: repo.owner && repo.owner.avatar_url,
      letter: (repo.name || '?')[0].toUpperCase(),
      title: repo.full_name,
      meta: ['★ ' + repo.stargazers_count, repo.language, repo.description && repo.description.slice(0, 60)]
    })
  },
  {
    key: 'games',
    title: 'Free Game Deals',
    eyebrow: 'free giveaways',
    badge: true,
    skeletonRows: 6,
    pills: { options: GAME_PLATFORMS, initial: GAME_PLATFORMS[0].value },
    emptyMessage: 'No active giveaways right now.',
    error: { href: 'https://www.gamerpower.com/giveaways', label: 'Open GamerPower' },
    async start(ctx, platform) {
      const { data, via } = await fetchProxied(
        '/games?platform=' + platform,
        'https://www.gamerpower.com/api/filter?platform=' + platform + '&type=game&sort-by=date'
      );
      ctx.setVia(via);
      // GamerPower answers with a status object, not an array, when nothing is
      // live. It has no pagination and returns every active giveaway at once,
      // so there is nothing to page — show them all in one batch.
      const giveaways = Array.isArray(data) ? data : [];
      let sent = false;
      return () => {
        if (sent) return [];
        sent = true;
        return giveaways;
      };
    },
    toCard: (g) => ({
      href: g.open_giveaway_url || g.gamerpower_url,
      img: g.thumbnail || g.image,
      letter: (g.title || 'F')[0].toUpperCase(),
      badge: 'FREE',
      title: g.title,
      meta: [
        g.platforms || g.platform,
        'was ' + (g.worth || 'N/A'),
        'ends ' + (g.end_date === '2099-01-01 00:00:00' ? 'no fixed date' : (g.end_date || '').slice(0, 10))
      ]
    })
  },
  {
    key: 'tech',
    title: 'Tech Feed',
    eyebrow: 'bluesky · #technology',
    badge: true,
    skeletonRows: 8,
    emptyMessage: 'No posts found.',
    error: { href: 'https://bsky.app/search?q=technology', label: 'Open Bluesky' },
    async start(ctx) {
      // Bluesky's public AppView is a real twitter-style tech feed with genuine
      // infinite scroll (cursor paging). It does NOT send CORS headers for
      // searchPosts, so the browser can't call it directly — it goes through
      // /api like Reddit/GamerPower/arXiv, with the public relay as a fallback.
      // (X/Twitter itself has no free, unauthenticated public feed; Bluesky is
      // the open, twitter-style equivalent.)
      const direct =
        'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=technology&sort=latest&limit=25';
      let cursor: string | null = null;
      let exhausted = false;
      let first = true;
      return async () => {
        if (exhausted) return [];
        const cq = cursor ? '&cursor=' + encodeURIComponent(cursor) : '';
        const { data, via } = await fetchProxied('/bsky' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), direct + cq);
        if (first) {
          ctx.setVia(via);
          first = false;
        }
        const posts = Array.isArray(data.posts) ? data.posts : [];
        cursor = data.cursor || null;
        if (!cursor || posts.length === 0) exhausted = true;
        return posts;
      };
    },
    toCard: (post) => {
      const a = post.author || {};
      const rkey = (post.uri || '').split('/').pop();
      const img =
        post.embed?.images?.[0]?.thumb || a.avatar || null;
      const stamp = Date.parse(post.record?.createdAt || post.indexedAt || '');
      return {
        href: a.handle && rkey ? `https://bsky.app/profile/${a.handle}/post/${rkey}` : 'https://bsky.app',
        img,
        letter: (a.displayName || a.handle || 'B')[0].toUpperCase(),
        title: post.record?.text || '',
        meta: [
          a.handle ? '@' + a.handle : '',
          (post.likeCount || 0) + ' likes',
          timeAgo(Number.isFinite(stamp) ? Math.floor(stamp / 1000) : Math.floor(Date.now() / 1000))
        ]
      };
    }
  },
  {
    key: 'papers',
    title: 'Research Papers',
    eyebrow: 'arXiv · newest first',
    badge: true,
    skeletonRows: 8,
    pills: { options: PAPER_CATS, initial: PAPER_CATS[0].value },
    emptyMessage: 'No papers found for this category.',
    error: { href: 'https://arxiv.org/list/cs.AI/recent', label: 'Open arXiv' },
    async start(ctx, cat) {
      // True infinite scroll: arXiv supports real paging (start/max_results), so
      // pull the next window on each call and stop when a short page comes back.
      const PAGE = 25;
      let start = 0;
      let exhausted = false;
      let first = true;
      return async () => {
        if (exhausted) return [];
        const r = await fetchProxied(
          `/papers?cat=${cat}&limit=${PAGE}&start=${start}`,
          `https://export.arxiv.org/api/query?search_query=cat:${cat}&sortBy=submittedDate&sortOrder=descending&start=${start}&max_results=${PAGE}`,
          'text'
        );
        if (first) {
          ctx.setVia(r.via);
          first = false;
        }
        const papers = parseArxiv(r.data);
        start += PAGE;
        if (papers.length < PAGE) exhausted = true;
        return papers;
      };
    },
    toCard: (p: ArxivItem) => ({
      href: p.href,
      img: null,
      letter: (p.authors[0] || 'A')[0].toUpperCase(),
      title: p.title,
      meta: [
        p.authors.length > 1 ? p.authors[0] + ' +' + (p.authors.length - 1) : p.authors[0] || '',
        p.primary,
        timeAgo(p.time)
      ]
    })
  }
];

# Decisions

## [2026-07-27] Infinite scroll per panel, with per-source ceilings

**Context:** Every panel was capped at a hardcoded slice (15 HN, 16 Reddit, 15
GitHub, 15 games). Request was to raise the caps or add infinite scroll.

**Decision:** `render()` became `card()` + `renderPaged(bodyEl, nextPage,
toCard, emptyMessage)`. Panels fill a batch at a time and pull the next one near
the bottom of the scroll. `nextPage()` hides where the batch comes from, so each
source uses whatever it actually supports — measured, not assumed:

- **Hacker News** — 500 ids up front, but one request per story, so details are
  fetched 20 at a time as you scroll. True infinite scroll.
- **GitHub** — real API paging, 30 per page, stopping at page 5 (unauthenticated
  search is rate-limited and caps at 1000 results).
- **Reddit** — RSS has no cursor, so one request per sub at `limit=100` (verified
  ceiling; 200 posts total) and the rendering pages through it. Now sorted by
  time so the two subs interleave rather than one following the other.
- **GamerPower** — no pagination and only 14 active giveaways exist, so it
  returns everything in one batch.

`renderPaged` keeps pulling while the panel is too short to overflow — otherwise
there is nothing to scroll and the second page would never be requested. Also
raised the proxy's `limit` clamp from 50 to 100, which would otherwise have
silently dropped `limit=100` back to the fallback of 8.

**Rejected:** Just raising the hardcoded slices. It moves the cap without
removing it, and HN would have meant 500 requests on page load.

**Files touched:** `public/index.html`, `api/[...proxy].js`

---

## [2026-07-27] vercel.json is required after all; static assets moved to public/

**Context:** The first deploy failed with `No entrypoint found in "/vercel/path0"`.
Vercel CLI 56 now detects Node.js **backend** apps: it sees a `package.json`
with no framework preset and looks for a server entrypoint (`app.js`,
`server.js`, or `main`). Deleting `main` in the cleanup pass is what surfaced
this — but keeping `main` would have been worse, since Vercel would then have
booted `devpulse-proxy.js` as the site's server.

**Decision:** Added `vercel.json` with `framework: null` (the documented way to
select the "Other" preset) and `outputDirectory: "public"`, and moved
`index.html` + `favicon.ico` into `public/`. Vercel now serves `public/` from
the CDN and compiles `api/` into functions. `devpulse-proxy.js` serves the same
directory via `path.join(__dirname, 'public')`.

**Rejected:** (a) Running `devpulse-proxy.js` as a Vercel Node server. It would
put every static page load behind a function, and `fs` reads of paths computed
at runtime aren't traced into the bundle, so `index.html` would likely be
missing at runtime and need `includeFiles` to patch. (b) `outputDirectory: "."`,
which avoids moving files but publishes `package.json`, `README.md`, and `docs/`
as static assets.

**Note:** this reverses the earlier "no config needed" decision below. Zero
config stopped being true when Vercel added backend-framework detection.

**Files touched:** `vercel.json`, `public/index.html`, `public/favicon.ico`,
`devpulse-proxy.js`, `README.md`

---

## [2026-07-27] One render() for all four panels

**Context:** Each of the four `load*` functions hand-built the same
`<a class="card">` markup — thumbnail, title, dot-separated meta — differing only
in which fields it read. Four copies of the same DOM string concatenation.

**Decision:** Added `render(bodyEl, items, emptyMessage, toCard)`. Each loader
now supplies a `toCard` mapper and nothing else. The `·` separators come from
joining a `meta` array, which also removed GitHub's hand-written conditional
separator logic. Panel bodies dropped from ~15 lines each to ~6.

**Rejected:** A template engine or a `<template>` element. The markup is three
nested divs; string concatenation is already the smallest thing that works.

**Files touched:** `index.html`

---

## [2026-07-27] Deleted everything nothing referenced

**Context:** Cleanup pass over the whole repo.

**Decision:** Removed `api/proxy.js` (dead re-export stub), `vercel.json` (had
been reduced to `{}`), `index.html.TEMP` (unrelated 436-line app), the `.loading`
CSS rule, four unused `id="panel-*"` attributes, `redditThumbUrl()` (folded its
one check into `parseRedditRss`, where the value is created), the `subreddit`
field `parseRedditRss` extracted and every caller immediately overwrote,
`showError`'s dead no-link branch, `updateSrcBadge`'s unreachable null guard, the
`dev` script that duplicated `start`, and the `main`/`keywords`/`author` fields
of a package that is never published.

**Rejected:** Keeping `redditThumbUrl` as a named function for readability. It
was one boolean test used once; the check belongs where the field is set.

**Files touched:** `index.html`, `package.json`, `docs/CONTEXT.md`

---

## [2026-07-27] Collapse three copies of the proxy into one handler

**Context:** The proxy logic existed three times — `api/proxy.js` (ESM, which
breaks in a package without `"type": "module"`, and mounted at the wrong route),
`api/[...proxy].js`, and inline in `devpulse-proxy.js`. Each copy carried
`fetchJson` and `fetchText`, which were byte-identical to each other.

**Decision:** One handler in `api/[...proxy].js` with a single `fetchUpstream`.
`devpulse-proxy.js` requires it rather than reimplementing it. Dropped the Reddit
JSON branch — the page only ever requested `format=rss`, so it was dead.

**Rejected:** Keeping a separate local implementation "because local dev is
different". It isn't; the handler only needs plain node `req`/`res`, which is
what Vercel passes anyway.

**Files touched:** `api/[...proxy].js`, `devpulse-proxy.js`, `api/proxy.js`

---

## [2026-07-27] `index.html` at root instead of a vercel.json rewrite

**Context:** The entrypoint was `devpulse.html`, so `vercel.json` carried a
rewrite from `/` to reach it. Meanwhile `index.html` was deleted from git.

**Decision:** Renamed `devpulse.html` to `index.html`. Vercel serves it at `/`
by convention, so `vercel.json` is no longer needed.

**Rejected:** Keeping the rewrite. It is config that exists only to work around
a filename, and it would have 404'd the site once `devpulse.html` was gone.

**Files touched:** `index.html`, `vercel.json`, `README.md`, `.github/workflows/ci.yml`

---

## [2026-07-27] Drop the localhost:8787 probe from the browser

**Context:** The page tried `http://localhost:8787` first, then `/api`, then
public relays — three layers, with two near-identical fetch chains (one for
Reddit RSS, one for JSON). From an HTTPS deploy the localhost call is blocked as
mixed content on every single load.

**Decision:** Removed the probe. Relative `/api/...` already covers both the
deployed site and the local dev server, since the handler routes on the last
path segment. One `fetchProxied(apiPath, directUrl, as)` replaced
`fetchWithTimeout`, `proxiedFetch`, `fetchViaLocalOrRelay`, and `fetchRedditRss`.

**Rejected:** Keeping the probe for `file://` users. That case has no origin, so
it falls to the public relays regardless — the probe bought nothing.

**Files touched:** `index.html`

---

## [2026-07-27] CI checks routing, not upstream availability

**Context:** CI curled `/devpulse.html`, a path that no longer exists.

**Decision:** Check that `/` serves and that an unknown `/api/*` route returns
404 (proving the handler is mounted). Syntax checks moved into `npm run check`.

**Rejected:** Calling `/api/games` in CI. It would turn a GamerPower outage into
a red build on an unrelated PR.

**Files touched:** `.github/workflows/ci.yml`, `package.json`

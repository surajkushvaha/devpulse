# Decisions

## [2026-07-30] Bluesky tech feed, infinite-scroll papers, header fix

**Context:** Add a "twitter feed" of latest tech updates, make the games and
research-paper panels scroll infinitely, and fix the header.

**Twitter → Bluesky:** X/Twitter has no free, unauthenticated public feed (the
v2 API needs paid credentials, and Nitter is effectively dead), so a real Twitter
feed isn't buildable without keys. Used **Bluesky** instead — the open,
twitter-style network where the tech community is active. Its public AppView
(`public.api.bsky.app/xrpc/app.bsky.feed.searchPosts`) needs no auth, is
CORS-enabled (so the browser calls it directly), and paginates by cursor. Query
is `q=technology&sort=latest`; the new **Tech Feed** panel is a full-width
feature row alongside Research Papers.

**Infinite scroll:**
- **Research Papers** now pages arXiv for real — each `next()` fetches the next
  `start`/`max_results` window and stops on a short page (the proxy `papers`
  route gained a scrubbed `start` param). Previously it fetched 40 once and
  stopped; now it's unbounded.
- **Bluesky** pages by cursor — genuinely infinite.
- **Free Game Deals** was asked for too, but GamerPower has no pagination: it
  returns every active giveaway in one response. The panel already shows all of
  them and scrolls; there is nothing further upstream to fetch, so it's left as
  is (documented, not a regression).

**Header fix:** aligned the island's `max-width` to the content grid (1160 → 1200)
so its right edge lines up with the panels, and removed the `flex-wrap` that let
the pill wrap to two lines at some widths — the mobile breakpoint (≤900px) still
stacks it cleanly. Verified the island renders as a single 60px line.

**Layout:** the bento is now four regular panels (2×2) above two full-width
feature rows (Tech Feed, Research Papers) — no empty cells.

**Verified:** `next build` green; headless run with Bluesky + paged arXiv stubbed
shows the tech feed rendering, papers growing 25 → 58 cards on scroll, a
single-line header, and no JS errors.

**Files touched:** `lib/feeds.ts`, `app/api/[...proxy]/route.ts`,
`app/globals.css`, `README.md`, `docs/CONTEXT.md`.

---

## [2026-07-29] Apple design language: system font + Liquid Glass

**Context:** Request to adopt a full Apple design system — Apple sans fonts and
Apple's "Liquid Glass" UI.

**Fonts (honest constraint):** SF Pro is not licensed for web self-hosting and
is not on Google Fonts, so it cannot be bundled via `next/font`. The authentic
approach (what apple.com uses) is the **system font stack**: `-apple-system,
BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue',
system-ui` renders real SF Pro on Apple platforms and the native UI font
everywhere else. So `next/font` was removed entirely — the app now downloads
zero web fonts. Meta strips moved from a mono face to the system sans with
`font-variant-numeric: tabular-nums`, matching how Apple sets numbers.

**Liquid Glass (honest label):** there is no official Apple web material; this is
the sanctioned web *approximation* — `backdrop-filter: blur() saturate()` for
vibrancy, layered inner highlight + refractive hairline + hairline ring, over a
colorful fixed wallpaper (soft blue/indigo/pink/green blobs) so the glass has
something to refract. A `prefers-reduced-transparency: reduce` block drops the
blur to a solid fill. Applied to the header island and every panel surface; the
opaque double-bezel tray from the previous design is gone.

**System alignment:** accent is now Apple system blue (#007aff light / #0a84ff
dark); the primary "refresh all" button is an Apple-blue filled pill; chips are
Apple system-fill pills that fill blue when active; colors are Apple label /
fill / separator semantics; corners use Apple's larger radii. The dark theme is
true-black-based (iOS style) rather than the previous charcoal.

**Kept:** all structure, class names, and behavior — this is a CSS + layout-font
change only; no component logic touched. Interactions and both themes verified
in headless Chromium.

**Note on the taste skill:** its Appendix C explicitly says Liquid Glass is an
Apple-platform material with no official web package, and to label web versions
as approximations — which is exactly what the code comments do.

**Files touched:** `app/globals.css`, `app/layout.tsx`, `README.md`,
`docs/CONTEXT.md`.

---

## [2026-07-29] TypeScript + taste-skill UI review (dark mode, a11y, icons)

**Context:** Two follow-ups: convert the fresh Next app to TypeScript (it had
been authored as `.jsx`/`.js` to match the old vanilla codebase, which no longer
applies), and run the installed `design-taste-frontend` skill over the UI.

**TypeScript:**
- Converted every file to `.ts`/`.tsx` with real prop/model types (`Source`,
  `CardModel`, `Pager`, `PanelProps`, etc.). Upstream payloads stay `any` —
  they're heterogeneous external JSON and typing them fully buys nothing.
- **TypeScript version:** npm's `latest` is now `7.0.2`, the native-port preview,
  and Next 16 rejects it ("does not provide the compiler API required by
  Next.js"). Pinned to the newest *stable* line Next supports, **6.0.3**.
  "Latest, well-maintained" means the newest release that actually works with the
  toolchain, not a preview that breaks the type-checker.

**Taste review (honest scope):** the skill is explicitly for landing pages, "not
dashboards," so only its universal rules were applied, not the hero/bento/image
machinery. Findings acted on:
- **Dark mode** added (the skill mandates it for consumer-facing pages). All
  colours are semantic CSS variables now; a `prefers-color-scheme: dark` block
  swaps the token set. Greys became concrete (not alpha-over-white) so text meets
  WCAG AA in both modes.
- **Em-dashes removed** from visible text (the skill's hard ban): the game card's
  `FREE — title` is now a standalone `FREE` pill, footer sentences were split, and
  the tab title uses a middle dot. Verified: zero `—` in the served HTML.
- **Contrast:** eyebrow micro-labels moved from a 0.34-alpha grey (~2.5:1) to a
  concrete AA-passing grey.
- **Focus:** cards got a `:focus-visible` ring (keyboard a11y).
- **Empty/error states** now compose to the panel center instead of floating at
  the top-left of a tall panel.
- **Icons:** the unicode `↻`/`→` glyphs became `@phosphor-icons/react`
  (`ArrowClockwise`, `ArrowUpRight`) — the skill's recommended, actively
  maintained icon family.
- **Softened** the accent-coloured glow on active chips to a neutral shadow.

**Deliberately kept (dashboard idiom, against a landing-page rule):** dot-separated
meta strips and the brand pulse-dot. The skill rations middle-dots and bans
decorative dots, but those rules target marketing pages; a compact data feed
legitimately uses dot-separated metadata, and the pulse dot is the brand mark.

**Files touched:** every source file (`.jsx`→`.tsx`, `.js`→`.ts`),
`app/globals.css`, `tsconfig.json` (new), `package.json`, `README.md`,
`docs/CONTEXT.md`.

---

## [2026-07-29] Migrate from vanilla static + serverless to Next.js

**Context:** The app was a single `public/index.html` plus a plain-node
`api/[...proxy].js`, deployed with `framework: null`. The high-end redesign had
just pulled in Google Fonts over a `<link>` — the project's first runtime
dependency. Direction from the user: "it's hosted on Vercel, use Next.js," and
"always use the latest, actively-maintained libraries."

**Decision:** Rebuilt the app on Next.js (App Router) + React. Latest at time of
writing: **Next 16, React 19**.

- **Fonts:** `next/font/google` self-hosts Space Grotesk / Plus Jakarta Sans /
  JetBrains Mono at build time and exposes each as a CSS variable. This *removes*
  the runtime font-CDN request the previous step introduced — the concern that
  prompted this migration is gone, not just relocated. System-font fallbacks stay
  in every stack.
- **Proxy:** `api/[...proxy].js` (raw `https` module, node req/res) became
  `app/api/[...proxy]/route.js` — a catch-all Route Handler using global `fetch`
  (which follows redirects itself, so the manual redirect loop is gone). Same
  three routes, same scrubbing, same CORS + `s-maxage` cache headers.
- **UI:** the one imperative `<script>` became React. `lib/feeds.js` holds the
  source descriptors, parsers, and pager factories; `components/Panel.jsx` is one
  reusable panel driving every feed; `components/Header.jsx` is the island header.
  The `globals.css` design system carried over unchanged except the font vars now
  point at `next/font` and the card fade-up became a CSS `@keyframes` (React keeps
  card DOM stable across renders, so only newly mounted cards animate).
- **Paging:** `renderPaged`'s scroll handler + "keep pulling until it overflows"
  loop became an `IntersectionObserver` on a bottom sentinel plus a post-render
  top-up effect — cleaner in React, and it reads `scrollHeight` only after the DOM
  has actually updated. A per-load request id cancels stale reloads.
- **Removed:** `public/index.html`, `api/[...proxy].js`, `devpulse-proxy.js`
  (Next's dev server replaces it), and `vercel.json` (`framework: null` was there
  precisely to *stop* Vercel treating this as an app — with Next it auto-detects).
- **CI:** now `npm ci` + `next build` (which type-checks, compiles routes, and
  fetches the self-hosted fonts) plus a boot-and-route-check on port 3000.

**Rejected:** (a) Keeping vanilla and just self-hosting the woff2 files — would
have solved the font dependency without a framework, but the user explicitly
asked for Next.js. (b) Adding a data-fetching library (TanStack Query et al.) —
plain hooks cover the five feeds without another dependency to keep current;
"latest libraries" governs what we *do* pull in, not a mandate to pull in more.
(c) TypeScript — the codebase was JS; kept it JS to stay approachable, and
`next build` still type-checks via JSDoc-free inference.

**Verified:** `next build` passes (fonts downloaded, routes compiled). Ran the
production server under headless Chromium with upstreams stubbed: all five panels
render, chips switch categories and reload only their panel, the FREE badge and
proxy/relay labels show, HN/GitHub paging tops up a short panel, the sync clock
updates, fonts resolve to Space Grotesk, and there are no console or hydration
errors. Live upstream fetches remain blocked by egress policy in the sandbox, as
before.

**Files touched:** everything — see the commit. New tree under `app/`,
`components/`, `lib/`; `package.json`, `.github/workflows/ci.yml`, `.gitignore`,
`README.md`, `docs/CONTEXT.md` updated.

---

## [2026-07-29] High-end visual overhaul (Soft Structuralism + double-bezel)

**Context:** Follow-up to the papers/games work — "choose the best template, use
the taste skill for the UI." Applied the `high-end-visual-design` taste skill
(installed via `npx skills add`). The user explicitly chose the full agency
overhaul over a self-contained polish, accepting the one tradeoff it forces.

**Decision:** Rebuilt `index.html`'s styling around the skill's rules while
keeping every id, data attribute, and the entire `<script>` untouched — the
redesign is CSS + a little markup, not a rewrite.

- **Variance engine roll:** *Soft Structuralism* vibe (silver-white canvas,
  bold grotesk type, soft diffused ambient shadows) + *Asymmetrical Bento*
  layout (2×2 panels above a full-width featured Research Papers row). Soft
  Structuralism was chosen because it elevates the existing Apple-clean identity
  rather than replacing it, and suits a dense data dashboard better than the
  OLED "Ethereal Glass" or serif "Editorial Luxury" archetypes.
- **Double-bezel panels:** each `.panel` is now an outer tray (subtle bg,
  hairline ring, squircle radius, ambient float shadow) wrapping a `.panel-core`
  inner surface (white, concentric smaller radius, inset top highlight) — the
  "glass plate in an aluminium tray" nesting the skill mandates.
- **Fluid-island header:** replaced the banned edge-to-edge sticky navbar with a
  floating glass pill (`backdrop-blur`, detached, `top:18px`).
- **Button-in-button CTA:** "refresh all" is a dark pill with the ↻ nested in
  its own circular wrapper that rotates on hover; panel refreshers became
  circular ghost buttons.
- **Motion:** all transitions use one custom `--ease`
  `cubic-bezier(0.32,0.72,0,1)`; cards fade-up on draw (double-rAF reveal),
  gated behind `prefers-reduced-motion` so reduced-motion visitors get static
  cards, not stuck-invisible ones. Only `transform`/`opacity` animate; the
  only `backdrop-blur` is on the sticky header.
- **Type:** Space Grotesk (display) / Plus Jakarta Sans (UI) / JetBrains Mono
  (meta), replacing the system stack — the skill bans Inter/Roboto/Arial/etc.

**Tradeoff / rejected:** This is the first external dependency in the project —
three Google Fonts loaded via `<link>`, which breaks the long-standing "no
dependencies, fully self-contained" rule. The self-contained *polish* option
(keep system fonts, no network) was offered and explicitly declined in favor of
the premium look. Fallbacks in every font stack (`system-ui`, `ui-monospace`)
keep the page fully functional if the font CDN is blocked or offline — verified
in the headless render, where the fonts don't load and the layout still holds.

**Files touched:** `public/index.html`, `README.md`, `docs/CONTEXT.md`

---

## [2026-07-29] Research papers panel + category chips on papers and games

**Context:** Request was to list research papers (AI / computer / machine
learning) by category, and to group the game deals by store (Xbox, Steam, Epic,
…). Both are "one feed, several categories" — the same shape.

**Decision:** One shared `.pill` chip row and a `buildPills(rowId, items,
getActive, onSelect)` helper drive both. A chip click sets a module-level state
variable (`paperCat` / `gamePlatform`) and reloads only that panel — no full
refresh. The two panels reuse the existing `card()` / `renderPaged()` pipeline
unchanged; only their loaders and a filter variable are new.

- **Research Papers** — new panel, arXiv Atom API. Chips map to arXiv archive
  codes (AI → `cs.AI`, Machine Learning → `cs.LG`, Computer Vision → `cs.CV`,
  NLP → `cs.CL`, Systems → `cs.DC`, Robotics → `cs.RO`), sorted newest first.
  arXiv sends no CORS headers, so it joins Reddit and GamerPower behind `/api`
  (new `papers` route) with the public relay as the same fallback. `parseArxiv`
  mirrors `parseRedditRss` — both are Atom, parsed with `DOMParser`. The panel
  is full-width (`.panel.wide`) with two-up cards, since paper titles are long.
- **Free Game Deals** — the existing panel gained a store chip row. GamerPower's
  `platform` filter already joins ids with `+`, so `Xbox` is
  `xbox-one+xbox-series-xs+xbox-360`, `PlayStation` is `ps4+ps5`, and the
  default chip keeps the old `epic-games-store+steam` view.

**Rejected:** (a) A second dropdown/`<select>` for filtering — chips show every
option at a glance and match the flat, no-chrome look of the rest of the page.
(b) A separate render path for the wide panel — the two-column layout is pure
CSS grid on the panel body, so `card()`/`renderPaged()` needed no changes. (c)
Fetching arXiv directly from the browser — its API sends no CORS headers, same
as Reddit, so it takes the same proxy path rather than a fourth code path.

**Verified:** Loaded the page in headless Chromium with the `/api` responses
stubbed (realistic arXiv Atom + GamerPower JSON): both chip rows render, the
active chip tracks state, clicking a chip reloads only its panel with the new
category, and paper cards show author / category / age correctly. Live upstream
fetches are blocked by egress policy in the build sandbox (the existing
GamerPower route 403s there too), so this is the same "verified by eye/DOM,
not against live upstream" posture already noted for `render()`.

**Files touched:** `public/index.html`, `api/[...proxy].js`, `README.md`,
`docs/CONTEXT.md`

---

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

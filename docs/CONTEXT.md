# DevPulse — Context

## What it is

A single-page developer news dashboard: Hacker News, Reddit, GitHub trending,
free game giveaways, and arXiv research papers in six panels. No build step, no
dependencies, no framework. `index.html` is the whole app.

The game and paper panels carry a row of filter chips (`.pill`). Picking one
sets a module-level state variable and reloads just that panel — games by store
(Steam / Epic / Xbox / …), papers by arXiv category (cs.AI / cs.LG / …).

## Current state

Working and deployable to Vercel with zero config.

- `public/index.html` — markup, styles, and script in one file
- `api/[...proxy].js` — the only server-side code; proxies Reddit RSS,
  GamerPower, and the arXiv Atom API, none of which send CORS headers
- `devpulse-proxy.js` — local dev server; serves `public/` and mounts the
  same `api/[...proxy].js` handler, so local matches production
- `vercel.json` — `framework: null` + `outputDirectory: public`; required, see
  DECISIONS.md

Data path for Reddit/GamerPower: same-origin `/api` first, public CORS relay as
fallback. Hacker News and GitHub are called directly from the browser.

No build step, no lockfile, no dependencies.

## Open items

- `render()` in `index.html` has no automated test — it is DOM code, and a
  headless DOM would be a bigger dependency than the function it checks. CI
  covers routing only; the panels are verified by eye.
- Reddit blocks datacenter IPs intermittently. Proxy responses are CDN-cached
  for 5 minutes to reduce hits; if Vercel's egress gets blocked outright, the
  panel silently falls back to the public relay.
- Public relays (allorigins, corsproxy.io) are third parties with no uptime
  guarantee. They are the last resort, not the primary path.

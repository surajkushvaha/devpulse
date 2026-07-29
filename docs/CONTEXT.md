# DevPulse — Context

## What it is

A developer news dashboard: Hacker News, Reddit, GitHub trending, free game
giveaways, and arXiv research papers in five panels. A **Next.js** (App Router)
+ **React** + **TypeScript** app deployed on Vercel, with light and dark themes
(`prefers-color-scheme`).

The game and paper panels carry a row of filter chips (`.pill`). Picking one
sets the panel's `filter` state and reloads just that panel — games by store
(Steam / Epic / Xbox / …), papers by arXiv category (cs.AI / cs.LG / …).

## Current state

Working and deployable to Vercel (auto-detected framework, zero config).

- `app/layout.tsx` — root layout; `next/font` (self-hosted fonts) + metadata
- `app/page.tsx` — the dashboard client component (header + panel grid + footer)
- `app/globals.css` — the entire design system; semantic CSS-variable tokens with
  a `prefers-color-scheme: dark` override block
- `app/api/[...proxy]/route.ts` — the only server-side code; a catch-all Route
  Handler proxying Reddit RSS, GamerPower, and the arXiv Atom API, none of which
  send CORS headers
- `components/Header.tsx`, `components/Panel.tsx` — the header and the reusable
  feed panel (paging, chips, loading/error/empty states); icons from
  `@phosphor-icons/react`
- `lib/feeds.ts` — typed source descriptors, upstream parsers, pager factories

Data path for Reddit/GamerPower/arXiv: same-origin `/api/<source>` first, public
CORS relay as fallback. Hacker News and GitHub are called directly from the
browser.

Dependencies: `next` / `react` / `react-dom` and `@phosphor-icons/react`. No web
fonts — the UI uses the Apple system font stack (`-apple-system` → SF Pro on
Apple platforms), so nothing is downloaded.

Visual language: an Apple **Liquid Glass** approximation — a colorful fixed
wallpaper (blue/indigo/pink/green blobs) with translucent `backdrop-filter`
glass surfaces (header island + panels), Apple system-blue accent, system-fill
chips, and Apple label/fill/separator color semantics. Dark mode is true-black
(iOS style). A `prefers-reduced-transparency` block swaps glass for solid fills;
motion is reduced-motion aware.

## Panel paging model

`Panel.jsx` fills a batch at a time. Each source's `start()` returns a `next()`
that yields the next array of items (or `[]` when exhausted). Two effects drive
loading: an `IntersectionObserver` on a bottom sentinel pulls the next batch as
you scroll near the end, and a post-render check keeps topping up any panel too
short to scroll (so the sentinel can eventually fire). A per-load request id
discards in-flight results when a refresh or chip change supersedes them.

## Open items

- The panels (DOM/React) are verified by eye and with an ad-hoc headless render
  check, not a committed test suite. CI covers `next build` + route mounting.
- Reddit blocks datacenter IPs intermittently. Proxy responses are CDN-cached
  for 5 minutes to reduce hits; if Vercel's egress gets blocked outright, the
  panel silently falls back to the public relay.
- Public relays (allorigins, corsproxy.io) are third parties with no uptime
  guarantee. They are the last resort, not the primary path.

# DevPulse — Personal Feed

A lightweight web dashboard that aggregates developer news from six sources into
one page. Built with **Next.js** (App Router), **React**, and **TypeScript**,
deployed on Vercel. An Apple-flavored **Liquid Glass** UI with the system (SF)
font, light and dark themes (follows `prefers-color-scheme`).

## Features

- **Hacker News** — Top stories from the community
- **Reddit** — Hot posts from r/programming and r/webdev
- **GitHub Trending** — Repositories trending this week
- **Free Game Deals** — Free game giveaways, filterable by store (Steam, Epic,
  Xbox, PlayStation, GOG, PC)
- **Tech Feed** — Latest technology posts from Bluesky (the open, twitter-style
  network), with infinite scroll
- **Research Papers** — Newest papers from arXiv, filterable by field (AI,
  Machine Learning, Computer Vision, NLP, Systems, Robotics), with infinite scroll

Every panel loads more as you scroll. Nothing is stored.

Nothing is stored. Every request goes to the original source.

## How it works

Hacker News, GitHub, and Bluesky send CORS headers, so the browser calls them
directly. Reddit, GamerPower, and arXiv don't, so they go through `/api/<source>`
— a catch-all Next.js Route Handler (`app/api/[...proxy]/route.ts`) that fetches
upstream and passes the bytes back. Responses are CDN-cached for 5 minutes.

Infinite scroll: each panel pulls the next batch as you near the bottom (an
`IntersectionObserver` sentinel). Hacker News fetches story details in batches,
GitHub and arXiv page their APIs, Bluesky follows its cursor, and Free Game Deals
shows every active giveaway (GamerPower returns them all at once, with no further
pages to fetch).

If `/api` ever fails, the affected panels fall back to a public CORS relay. The
label next to each panel shows which one answered.

The UI uses the Apple system font stack (`-apple-system` renders SF Pro on Apple
platforms, the native UI font elsewhere), so there are no web fonts to download
at all. Surfaces are a web approximation of Apple's Liquid Glass material
(`backdrop-filter` vibrancy over a colorful wallpaper), with a solid fallback
under `prefers-reduced-transparency`.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

`npm run build && npm start` runs the production server the same way Vercel does.

## Deploying to Vercel

Push to `main`. Vercel auto-detects Next.js — no `vercel.json`, no framework
override, no env vars. The page is served statically from the CDN and
`app/api/[...proxy]` is compiled into a serverless function.

## Project structure

- **app/layout.tsx** — root layout; wires up `next/font` and global metadata
- **app/page.tsx** — the dashboard (client component: header + panel grid)
- **app/globals.css** — the whole design system, incl. light/dark tokens
- **app/api/[...proxy]/route.ts** — the CORS proxy for Reddit + GamerPower + arXiv
- **components/Header.tsx** — the fluid-island header (clock, sync, refresh, auto)
- **components/Panel.tsx** — the reusable feed panel (paging, chips, states)
- **lib/feeds.ts** — source definitions, upstream parsers, and pager factories
- **public/favicon.ico**

## Data Sources

- [Hacker News API](https://github.com/HackerNews/API)
- [Reddit RSS](https://www.reddit.com/dev/api)
- [GitHub API](https://api.github.com)
- [GamerPower API](https://www.gamerpower.com/api)
- [arXiv API](https://info.arxiv.org/help/api/index.html)
- [Bluesky public API](https://docs.bsky.app/) (`public.api.bsky.app`, no auth)

## Notes

- Dependencies: `next` / `react` / `react-dom` and `@phosphor-icons/react`
  (latest); `typescript` pinned to the 6.x line Next supports
- No web fonts — uses the Apple system font stack (SF on Apple devices)
- Light and dark themes; respects `prefers-color-scheme` and
  `prefers-reduced-transparency`
- Not affiliated with Reddit, GamerPower, or arXiv
- Respects `prefers-reduced-motion`
- Reddit rate-limits datacenter IPs, so proxy responses are CDN-cached for 5 minutes

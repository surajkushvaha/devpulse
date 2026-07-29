# DevPulse — Personal Feed

A lightweight web dashboard that aggregates developer news from five sources into
one page. Built with **Next.js** (App Router) and **React**, deployed on Vercel.

## Features

- **Hacker News** — Top stories from the community
- **Reddit** — Hot posts from r/programming and r/webdev
- **GitHub Trending** — Repositories trending this week
- **Free Game Deals** — Free game giveaways, filterable by store (Steam, Epic,
  Xbox, PlayStation, GOG, PC)
- **Research Papers** — Newest papers from arXiv, filterable by field (AI,
  Machine Learning, Computer Vision, NLP, Systems, Robotics)

Nothing is stored. Every request goes to the original source.

## How it works

Hacker News and GitHub send CORS headers, so the browser calls them directly.
Reddit, GamerPower, and arXiv don't, so they go through `/api/<source>` — a
catch-all Next.js Route Handler (`app/api/[...proxy]/route.js`) that fetches
upstream and passes the bytes back. Responses are CDN-cached for 5 minutes.

If `/api` ever fails, the affected panels fall back to a public CORS relay. The
label next to each panel shows which one answered.

Fonts (Space Grotesk / Plus Jakarta Sans / JetBrains Mono) are self-hosted at
build time via `next/font` — there is no runtime request to a font CDN, and
every font stack falls back to system fonts.

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

- **app/layout.jsx** — root layout; wires up `next/font` and global metadata
- **app/page.jsx** — the dashboard (client component: header + panel grid)
- **app/globals.css** — the whole design system (one file)
- **app/api/[...proxy]/route.js** — the CORS proxy for Reddit + GamerPower + arXiv
- **components/Header.jsx** — the fluid-island header (clock, sync, refresh, auto)
- **components/Panel.jsx** — the reusable feed panel (paging, chips, states)
- **lib/feeds.js** — source definitions, upstream parsers, and pager factories
- **public/favicon.ico**

## Data Sources

- [Hacker News API](https://github.com/HackerNews/API)
- [Reddit RSS](https://www.reddit.com/dev/api)
- [GitHub API](https://api.github.com)
- [GamerPower API](https://www.gamerpower.com/api)
- [arXiv API](https://info.arxiv.org/help/api/index.html)

## Notes

- Dependencies are kept to `next` / `react` / `react-dom` (latest)
- Fonts are self-hosted via `next/font` — no runtime font-CDN dependency
- Not affiliated with Reddit, GamerPower, or arXiv
- Respects `prefers-reduced-motion`
- Reddit rate-limits datacenter IPs, so proxy responses are CDN-cached for 5 minutes

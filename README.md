# DevPulse — Personal Feed

A lightweight web dashboard that aggregates developer news from four sources into one page.

## Features

- **Hacker News** — Top stories from the community
- **Reddit** — Hot posts from r/programming and r/webdev
- **GitHub Trending** — Repositories trending this week
- **Free Game Deals** — Free games from Epic Games Store and Steam

Nothing is stored. Every request goes to the original source.

## How it works

Hacker News and GitHub send CORS headers, so the browser calls them directly.
Reddit and GamerPower don't, so they go through `/api` — a single serverless
function (`api/[...proxy].js`) that fetches upstream and passes the bytes back.

If `/api` isn't reachable — opening `index.html` straight off disk, for example —
those two panels fall back to a public CORS relay. The label next to each panel
shows which one answered.

## Running locally

```bash
npm start          # http://localhost:8787
```

`devpulse-proxy.js` serves the static files and mounts the exact same `/api`
handler Vercel runs in production, so local and deployed behave identically.

## Deploying to Vercel

Zero config — Vercel serves `index.html` at `/` and turns `api/[...proxy].js`
into a serverless function automatically.

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production
```

Or import the repo at [vercel.com/new](https://vercel.com/new) and accept the
defaults: no framework, no build command, no output directory.

## Files

- **index.html** — the entire app (markup, styles, script)
- **api/[...proxy].js** — the CORS proxy for Reddit + GamerPower
- **devpulse-proxy.js** — local dev server; reuses the handler above

## Data Sources

- [Hacker News API](https://github.com/HackerNews/API)
- [Reddit RSS](https://www.reddit.com/dev/api)
- [GitHub API](https://api.github.com)
- [GamerPower API](https://www.gamerpower.com/api)

## Notes

- No dependencies, no build step
- Not affiliated with Reddit or GamerPower
- Respects `prefers-reduced-motion`
- Reddit rate-limits datacenter IPs, so proxy responses are CDN-cached for 5 minutes

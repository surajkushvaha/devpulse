# DevPulse — Personal Feed

A lightweight web dashboard that aggregates developer news from four sources into one page.

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
Reddit, GamerPower, and arXiv don't, so they go through `/api` — a single
serverless function (`api/[...proxy].js`) that fetches upstream and passes the
bytes back.

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

Push to `main` and Vercel builds it. No build step, no dependencies, no env vars.

`vercel.json` sets `framework: null` and `outputDirectory: public`. Both are
load-bearing: without them Vercel sees a `package.json` with no framework,
assumes this is a Node **server** app, and fails the build looking for an
entrypoint (`app.js`, `server.js`, `main`…). Declaring "Other" plus a static
output directory tells it to serve `public/` from the CDN and compile `api/`
into functions.

```bash
npm i -g vercel
vercel --prod   # or just push to main
```

## Files

- **public/index.html** — the entire app (markup, styles, script)
- **public/favicon.ico**
- **api/[...proxy].js** — the CORS proxy for Reddit + GamerPower + arXiv
- **devpulse-proxy.js** — local dev server; reuses the handler above
- **vercel.json** — see the deploy note above

## Data Sources

- [Hacker News API](https://github.com/HackerNews/API)
- [Reddit RSS](https://www.reddit.com/dev/api)
- [GitHub API](https://api.github.com)
- [GamerPower API](https://www.gamerpower.com/api)
- [arXiv API](https://info.arxiv.org/help/api/index.html)

## Notes

- No dependencies, no build step
- Not affiliated with Reddit, GamerPower, or arXiv
- Respects `prefers-reduced-motion`
- Reddit rate-limits datacenter IPs, so proxy responses are CDN-cached for 5 minutes

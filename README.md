# DevPulse — Personal Feed

A lightweight, client-side web application that aggregates curated content from multiple sources into a personalized dashboard.

## Features

- **Hacker News** — Top stories from the community
- **Reddit** — Hot posts from r/programming and r/webdev
- **GitHub Trending** — Repositories trending this week
- **Free Game Deals** — Free games from Epic Games Store and Steam

All data is fetched client-side, nothing is stored or sent anywhere except to the original sources.

## How to Use

1. Open `index.html` in your web browser to view the dashboard
2. Click **refresh all** to manually update all feeds, or enable **auto-refresh every 15 min**
3. Click individual refresh buttons (↻) to update a specific panel

## Local Proxy Setup (Optional)

Reddit and GamerPower require a CORS workaround. For better performance and reliability:

1. Ensure Node.js is installed
2. Run the local proxy server:
   ```bash
   node devpulse-proxy.js
   ```
3. Open `devpulse.html` — Reddit and Free Game Deals panels will now use your local proxy instead of a public relay

You'll see a small label next to Reddit and Free Game Deals indicating which source is active (green "local proxy" vs gray "public relay").

## Files

- **devpulse.html** — Main application (open this in your browser)
- **devpulse-proxy.js** — Optional Node.js proxy for CORS handling
- **index.html** — Landing page
- **README.md** — This file

## Technical Details

- Runs entirely in the browser — no backend required
- Uses native Fetch API for all data requests
- Implements CORS workarounds via local proxy or public relays
- Responsive design, supports mobile viewing
- No external dependencies

## Data Sources

- [Hacker News API](https://github.com/HackerNews/API)
- [Reddit API](https://www.reddit.com/dev/api)
- [GitHub API](https://api.github.com)
- [GamerPower API](https://www.gamerpower.com/api)

## Notes

- Not affiliated with Anthropic, Reddit, or GamerPower
- Built for personal use
- Respects prefers-reduced-motion for accessibility
- Dark mode support via CSS custom properties

---

**Tip:** Bookmark this page in your browser for quick access to your developer news dashboard.

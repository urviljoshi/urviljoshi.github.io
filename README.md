# urviljoshi.github.io

Personal site. Static HTML, CSS and vanilla JavaScript, served by GitHub Pages.
No build step, no framework, no dependencies.

## Layout

```
index.html              the whole page
css/style.css           retro pixel-terminal theme, light + dark
js/main.js              boot screen, theme, command palette, feeds
data/feeds.json         generated — latest Medium posts and YouTube videos
scripts/fetch-feeds.mjs generates the above
images/og-image.png     1200x630 social preview card
```

## Self-updating writing and video sections

The writing and video sections read `data/feeds.json` instead of hard-coded
markup, so they never go stale by hand.

`.github/workflows/update-feeds.yml` runs daily at 05:30 UTC, fetches the
Medium and YouTube RSS feeds, and commits the result only when a post or video
actually changed. Neither feed sends CORS headers, so the page cannot fetch
them directly from the browser; doing it in CI keeps the site same-origin and
free of third-party services at runtime.

Run it locally the same way CI does:

```bash
node scripts/fetch-feeds.mjs
```

If one feed is unreachable, the script keeps the previously cached half rather
than blanking the section. If `data/feeds.json` is missing entirely, the page
falls back to the static article list in `index.html` and a link to the
YouTube channel.

To point the feeds at different accounts, edit `MEDIUM_FEED` and
`YT_CHANNEL_ID` at the top of `scripts/fetch-feeds.mjs`.

## Local preview

Any static server works, for example:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

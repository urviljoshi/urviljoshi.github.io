# urvil.dev

Personal site of Urvil Joshi. Built with Astro, GSAP and Lenis, deployed to
GitHub Pages at <https://urvil.dev>.

## Layout

```
src/data/content.ts      everything the page says: roles, skills, projects, awards
src/components/          one component per section, plus Scene.astro (the desk scene)
src/scripts/main.ts      motion system: smooth scroll, reveals, tilt, theme switch
src/scripts/scene.ts     the monitor story: hand-typed code and Claude Code sessions
src/scripts/flux.ts      WebGL contour field behind the hero
src/styles/global.css    design tokens (light + dark), cards, motion hooks
scripts/fetch-feeds.mjs  pulls Medium + YouTube into data/feeds.json, mirrors thumbnails
public/                  static files served as-is (CNAME, images, resume, certificates)
design/                  source artwork, not shipped
```

## Develop

```bash
npm install
npm run feeds     # optional: refresh posts and videos
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
```

Node 22.12 or newer.

## Deploy

`.github/workflows/deploy.yml` builds and publishes on every push to `main`,
every day at 05:30 UTC, and on demand from the Actions tab. The daily run is
what keeps the writing and video sections current: it refreshes the feeds
before building, so new posts and videos appear without a commit. If a feed
is unreachable the committed `data/feeds.json` is used and the deploy still
goes out.

GitHub Pages must be set to deploy from **GitHub Actions** (Settings, Pages,
Source). The custom domain lives in `public/CNAME`.

## Editing content

Change text in `src/data/content.ts`. Job durations and years of experience
are computed at build time, so they never need updating by hand. The feed
accounts are set at the top of `scripts/fetch-feeds.mjs`.

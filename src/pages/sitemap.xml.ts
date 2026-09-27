import type { APIRoute } from 'astro';
import { posts, videos, shorts } from '../data/content';

// One page, so one URL. lastmod tracks the newest post or video, so it only
// moves when the content does (Google ignores lastmod values that change
// on every build).
export const GET: APIRoute = ({ site }) => {
    const base = site?.toString() ?? 'https://urvil.dev/';
    const newest = [...posts, ...videos, ...shorts]
        .map((item) => item.date)
        .filter(Boolean)
        .sort()
        .at(-1);
    const lastmod = (newest ?? new Date().toISOString()).slice(0, 10);

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`;
    return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

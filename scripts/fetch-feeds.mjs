#!/usr/bin/env node
/* ========================================================================
   fetch-feeds.mjs
   Pulls the latest Medium posts and YouTube uploads and writes them to
   data/feeds.json so the site can render them from its own origin.

   Neither medium.com nor youtube.com sends CORS headers on their feeds,
   so the browser cannot read them directly. This runs in CI instead.

   Usage: node scripts/fetch-feeds.mjs
   ======================================================================== */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'data/feeds.json');

const MEDIUM_FEED = 'https://medium.com/feed/@urvvil08';
const YT_CHANNEL_ID = 'UCh89P7Jv512B8YpAELZms2A';
const YT_FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;

const MAX_POSTS = 12;
const MAX_VIDEOS = 12;

const UA = 'Mozilla/5.0 (compatible; urviljoshi.github.io feed builder)';

/* ---------------- tiny XML helpers ---------------- */

const decode = (s = '') =>
    s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
        .replace(/&#8217;|&rsquo;/gi, '’')
        .replace(/&#8216;|&lsquo;/gi, '‘')
        .replace(/&#8220;|&ldquo;/gi, '“')
        .replace(/&#8221;|&rdquo;/gi, '”')
        .replace(/&#8212;|&mdash;/gi, '—')
        .replace(/&#8211;|&ndash;/gi, '–')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

/** First <tag>...</tag> inside a chunk, decoded. */
const tag = (xml, name) => {
    const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
    return m ? decode(m[1]) : '';
};

/** All <tag>...</tag> inside a chunk, decoded. */
const tagAll = (xml, name) => {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi');
    return [...xml.matchAll(re)].map((m) => decode(m[1]));
};

/** Split a document into repeated blocks (<item>, <entry>). */
const blocks = (xml, name) => {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi');
    return [...xml.matchAll(re)].map((m) => m[1]);
};

const attr = (xml, name, key) => {
    const m = xml.match(new RegExp(`<${name}\\b[^>]*\\b${key}="([^"]*)"`, 'i'));
    return m ? decode(m[1]) : '';
};

async function get(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/xml, text/xml, */*' } });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return res.text();
}

/* ---------------- feed parsers ---------------- */

/** Medium RSS 2.0 -> post records. */
function parseMedium(xml) {
    return blocks(xml, 'item')
        .map((item) => {
            const iso = new Date(tag(item, 'pubDate'));
            return {
                title: tag(item, 'title'),
                // Medium appends a tracking query string; the bare URL is cleaner.
                url: tag(item, 'link').split('?')[0],
                date: Number.isNaN(iso.valueOf()) ? null : iso.toISOString(),
                tags: tagAll(item, 'category').slice(0, 3)
            };
        })
        .filter((p) => p.title && p.url && p.date)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, MAX_POSTS);
}

/** YouTube Atom -> video records. */
function parseYouTube(xml) {
    return blocks(xml, 'entry')
        .map((entry) => {
            const id = tag(entry, 'yt:videoId');
            const title = tag(entry, 'title');
            const iso = new Date(tag(entry, 'published'));
            const views = Number(attr(entry, 'media:statistics', 'views') || 0);
            return {
                id,
                title,
                url: `https://www.youtube.com/watch?v=${id}`,
                thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                date: Number.isNaN(iso.valueOf()) ? null : iso.toISOString(),
                views: Number.isFinite(views) ? views : 0,
                short: /#shorts?\b/i.test(title)
            };
        })
        .filter((v) => v.id && v.title && v.date)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, MAX_VIDEOS);
}

/* ---------------- main ---------------- */

/** Keep the previous section if a single feed is down, so CI never blanks the site. */
async function previous() {
    try {
        return JSON.parse(await readFile(OUT, 'utf8'));
    } catch {
        return { posts: [], videos: [] };
    }
}

async function main() {
    const prev = await previous();

    const [postsResult, videosResult] = await Promise.allSettled([
        get(MEDIUM_FEED).then(parseMedium),
        get(YT_FEED).then(parseYouTube)
    ]);

    let failed = 0;

    const pick = (result, key, label) => {
        if (result.status === 'fulfilled' && result.value.length) {
            console.log(`${label}: ${result.value.length} items`);
            return result.value;
        }
        failed++;
        const reason = result.status === 'rejected' ? result.reason.message : 'feed returned no items';
        console.error(`${label}: FAILED (${reason}) — keeping ${prev[key]?.length || 0} cached`);
        return prev[key] || [];
    };

    const data = {
        generated: new Date().toISOString(),
        channel: { name: 'FluxStack', url: 'https://www.youtube.com/@fluxstack' },
        blog: { name: 'Medium', url: 'https://medium.com/@urvvil08' },
        posts: pick(postsResult, 'posts', 'medium'),
        videos: pick(videosResult, 'videos', 'youtube')
    };

    // Both feeds down and no cache: fail loudly rather than commit an empty file.
    if (failed === 2 && !data.posts.length && !data.videos.length) {
        throw new Error('both feeds failed and no cached data exists');
    }

    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`wrote ${OUT}`);

    if (failed) process.exitCode = 0; // partial success is still worth committing
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});

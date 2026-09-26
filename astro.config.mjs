import { defineConfig } from 'astro/config';

// Static output for GitHub Pages. This is a user site (urviljoshi.github.io),
// so it serves from the domain root and needs no `base`.
export default defineConfig({
    site: 'https://urviljoshi.github.io',
    output: 'static',
    build: {
        inlineStylesheets: 'always'
    },
    compressHTML: true
});

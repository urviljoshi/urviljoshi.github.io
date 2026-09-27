import { defineConfig } from 'astro/config';

// Static output for GitHub Pages, served from the custom domain urvil.dev
// (public/CNAME). The domain is the site root, so no `base` is needed.
export default defineConfig({
    site: 'https://urvil.dev',
    output: 'static',
    build: {
        inlineStylesheets: 'always'
    },
    compressHTML: true
});

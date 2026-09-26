/* ========================================================================
   Resolve — images arrive as coarse pixels and sharpen into place.
   Pixel direction only. The image itself is never altered: a canvas veil
   sits over it, steps down through block sizes, then removes itself.
   ======================================================================== */

const STEPS = [36, 22, 14, 8, 4, 2];
const STEP_MS = 75;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Where an object-fit: cover image actually lands inside its box. */
function cover(iw: number, ih: number, cw: number, ch: number) {
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s;
    const h = ih * s;
    return [(cw - w) / 2, (ch - h) / 2, w, h] as const;
}

const playing = new WeakSet<HTMLImageElement>();

export async function resolveImage(img: HTMLImageElement) {
    if (playing.has(img)) return;
    playing.add(img);

    try {
        if (!img.complete) await img.decode().catch(() => {});
        const box = img.parentElement;
        if (!box || !img.naturalWidth) return;

        const cw = Math.round(img.clientWidth);
        const ch = Math.round(img.clientHeight);
        if (!cw || !ch) return;

        const veil = document.createElement('canvas');
        veil.className = 'px-veil';
        veil.width = cw;
        veil.height = ch;
        veil.setAttribute('aria-hidden', 'true');
        Object.assign(veil.style, {
            position: 'absolute',
            left: `${img.offsetLeft}px`,
            top: `${img.offsetTop}px`,
            width: `${cw}px`,
            height: `${ch}px`,
            imageRendering: 'pixelated',
            pointerEvents: 'none',
            zIndex: '1'
        });

        const ctx = veil.getContext('2d');
        const small = document.createElement('canvas');
        const sctx = small.getContext('2d');
        if (!ctx || !sctx) return;

        box.appendChild(veil);
        img.classList.remove('px-pending');

        for (const step of STEPS) {
            const w = Math.max(1, Math.ceil(cw / step));
            const h = Math.max(1, Math.ceil(ch / step));
            small.width = w;
            small.height = h;
            const [x, y, dw, dh] = cover(img.naturalWidth, img.naturalHeight, w, h);
            sctx.drawImage(img, x, y, dw, dh);
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, cw, ch);
            ctx.drawImage(small, 0, 0, w, h, 0, 0, cw, ch);
            await wait(STEP_MS);
        }

        veil.remove();
    } finally {
        img.classList.remove('px-pending');
        playing.delete(img);
    }
}

let io: IntersectionObserver | null = null;

/** Arm every [data-pixelate] image to resolve the first time it scrolls in. */
export function armPixelate(root: ParentNode = document) {
    io?.disconnect();
    io = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                io?.unobserve(e.target);
                resolveImage(e.target as HTMLImageElement);
            }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
    );

    root.querySelectorAll<HTMLImageElement>('img[data-pixelate]').forEach((img) => {
        const r = img.getBoundingClientRect();
        const inView = r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
        if (inView) {
            // Already on screen when the direction switched: resolve now
            resolveImage(img);
        } else {
            img.classList.add('px-pending');
            io!.observe(img);
        }
    });
}

export function disarmPixelate() {
    io?.disconnect();
    io = null;
    document.querySelectorAll('img.px-pending').forEach((img) => img.classList.remove('px-pending'));
    document.querySelectorAll('.px-veil').forEach((c) => c.remove());
}

/* ========================================================================
   Motion system
   One orchestrated intro, then quiet, purposeful reveals. Every effect
   checks prefers-reduced-motion, and nothing is hidden unless JS runs:
   with scripts off, the page is complete and static.
   ======================================================================== */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { initFlux, type Flux } from './flux';
import { initScene } from './scene';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

/* ---------------- smooth scroll ---------------- */

let lenis: Lenis | null = null;
if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
}

document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href')!;
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -8, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
});

/* ---------------- hero ---------------- */

const sceneRoot = $('[data-scene]');
function scene() {
    if (!sceneRoot) return;
    initScene(sceneRoot, { reduced, finePointer });
    if (reduced) return;
    // The scene settles in after the name, then drifts slower than the page
    gsap.from('[data-hero-scene]', { opacity: 0, '--ry': '40px', scale: 0.96, duration: 1.4, ease: 'expo.out', delay: 0.5 });
    gsap.to('[data-hero-scene]', {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
}

let flux: Flux | null = null;
const canvas = $<HTMLCanvasElement>('[data-flux]');
if (canvas) flux = initFlux(canvas, { reduced });

function heroIntro() {
    const lines = $$('[data-hero-name] .hero-line');
    const fades = $$('[data-hero-fade]');
    if (reduced || !lines.length) return;

    const split = SplitText.create(lines, { type: 'chars', charsClass: 'hc' });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl.from(split.chars, {
        yPercent: 70,
        opacity: 0,
        rotateX: -70,
        filter: 'blur(10px)',
        transformOrigin: '50% 100%',
        duration: 1.4,
        stagger: 0.045,
        clearProps: 'filter'
    }).from(
        fades,
        { '--ry': '22px', opacity: 0, duration: 1.1, stagger: 0.09, ease: 'power3.out' },
        0.55
    );
}

/* ---------------- scroll reveals ---------------- */

function reveals() {
    if (reduced) return;

    $$('[data-split]').forEach((el) => {
        const split = SplitText.create(el, { type: 'words', wordsClass: 'sw' });
        gsap.from(split.words, {
            yPercent: 55,
            opacity: 0,
            duration: 0.95,
            stagger: 0.045,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
    });

    $$('[data-reveal]').forEach((el) => {
        if (el.closest('.career.is-scrub .roles')) return;
        gsap.from(el, {
            '--ry': '36px',
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
    });

    $$('[data-stagger]').forEach((group) => {
        const items = Array.from(group.children) as HTMLElement[];
        const cards = items.map((el) => (el.classList.contains('card') ? el : el.querySelector<HTMLElement>('.card'))).filter(Boolean) as HTMLElement[];
        gsap.from(items, {
            '--ry': '44px',
            opacity: 0,
            scale: cards.length ? 0.96 : 1,
            duration: 1,
            stagger: 0.09,
            ease: 'power3.out',
            clearProps: 'scale',
            scrollTrigger: { trigger: group, start: 'top 88%', once: true },
            onComplete: () => cards.forEach((c, i) => sheen(c, i * 0.08))
        });
    });

    // Standalone cards (featured work) get the same sweep once they settle
    $$('.card[data-reveal]').forEach((card) => {
        ScrollTrigger.create({ trigger: card, start: 'top 80%', once: true, onEnter: () => sheen(card, 0.5) });
    });

    $$('[data-rail]').forEach((railEl) => {
        const vids = $$('[data-stagger-item]', railEl);
        if (!vids.length) return;
        gsap.from(vids, {
            '--ry': '40px',
            opacity: 0,
            duration: 1.1,
            stagger: 0.06,
            ease: 'expo.out',
            scrollTrigger: { trigger: railEl, start: 'top 88%', once: true }
        });
    });
}

/* ---------------- nav: hide on scroll down, progress, active section ---------------- */

const nav = $('[data-nav]');
const progress = $('[data-progress]');
let menuOpen = false;

function navBehaviour() {
    ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate(self) {
            if (progress) progress.style.transform = `scaleX(${self.progress.toFixed(4)})`;
            if (!nav || menuOpen) return;
            nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 400);
        }
    });

    const links = $$('[data-nav-link]');
    $$('[data-section]').forEach((sec) => {
        ScrollTrigger.create({
            trigger: sec,
            start: 'top 45%',
            end: 'bottom 45%',
            onToggle(self) {
                if (!self.isActive) return;
                const id = sec.dataset.section;
                links.forEach((l) => l.classList.toggle('is-active', l.dataset.navLink === id));
            }
        });
    });
}

/* ---------------- mobile menu ---------------- */

const menu = $('[data-menu]');
const menuBtn = $<HTMLButtonElement>('[data-menu-open]');

function openMenu() {
    if (!menu || !menuBtn) return;
    menuOpen = true;
    nav?.classList.remove('is-hidden');
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    lenis?.stop();
    if (reduced) return;
    gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' });
    gsap.from($$('[data-menu-link], .menu-resume', menu), {
        yPercent: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: 'expo.out',
        delay: 0.25
    });
}

function closeMenu() {
    if (!menu || !menuBtn || !menuOpen) return;
    menuOpen = false;
    menuBtn.setAttribute('aria-expanded', 'false');
    lenis?.start();
    if (reduced) {
        menu.hidden = true;
        return;
    }
    gsap.to(menu, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.55,
        ease: 'expo.inOut',
        onComplete: () => {
            menu.hidden = true;
        }
    });
}

menuBtn?.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
});

/* ---------------- career: a playhead sweeps the years ---------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function careerScrub() {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
        const section = $('.career');
        const stage = $('[data-career]');
        if (!section || !stage) return;

        section.classList.add('is-scrub');

        const min = Number(stage.dataset.axisMin);
        const max = Number(stage.dataset.axisMax);
        const roles = $$('.role', stage).sort((a, b) => Number(a.dataset.role) - Number(b.dataset.role));
        const segs = $$('[data-seg]', stage);
        const marbles = $$('[data-marble]', stage);
        const playhead = $('[data-playhead]', stage)!;
        const yearEl = $('[data-year]', stage)!;
        const fill = $('[data-axis-fill]', stage)!;

        gsap.set(roles, { autoAlpha: 0 });
        let active = -1;

        const setActive = (i: number) => {
            if (i === active) return;
            const prev = roles[active];
            const next = roles[i];
            if (prev) gsap.to(prev, { autoAlpha: 0, '--ry': '-20px', duration: 0.3, ease: 'power2.in', overwrite: true });
            if (next)
                gsap.fromTo(
                    next,
                    { autoAlpha: 0, '--ry': '24px' },
                    { autoAlpha: 1, '--ry': '0px', duration: 0.6, ease: 'power3.out', delay: prev ? 0.12 : 0, overwrite: true }
                );
            segs.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.seg) === i));
            marbles.forEach((m) => m.classList.toggle('is-active', Number(m.dataset.marble) <= i));
            active = i;
        };

        const update = (p: number) => {
            const y = min + (max - min) * p;
            playhead.style.left = `${p * 100}%`;
            fill.style.transform = `scaleX(${p})`;
            const whole = Math.floor(y);
            const month = Math.min(11, Math.floor((y - whole) * 12));
            yearEl.textContent = `${MONTHS[month]} ${whole}`;

            let idx = 0;
            roles.forEach((r, i) => {
                if (y >= Number(r.dataset.from)) idx = i;
            });
            setActive(idx);
        };

        update(0);

        const st = ScrollTrigger.create({
            trigger: stage,
            start: 'top top',
            end: () => `+=${Math.round(innerHeight * 2.6)}`,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => update(self.progress)
        });

        return () => {
            st.kill();
            section.classList.remove('is-scrub');
            gsap.set(roles, { clearProps: 'all' });
            segs.forEach((s) => s.classList.remove('is-active'));
            marbles.forEach((m) => m.classList.remove('is-active'));
        };
    });
}

/* ---------------- video rails ---------------- */

function rails() {
    $$('[data-rail-group]').forEach((group) => rail(group));
}

function rail(group: HTMLElement) {
    const el = $('[data-rail]', group);
    if (!el) return;
    const bar = $('[data-rail-progress]', group);

    const sync = () => {
        if (!bar) return;
        const k = Math.min(1, (el.scrollLeft + el.clientWidth) / el.scrollWidth);
        bar.style.transform = `scaleX(${k.toFixed(4)})`;
    };
    el.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();

    const step = () => Math.max(240, el.clientWidth * 0.75);
    $('[data-rail-prev]', group)?.addEventListener('click', () => el.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    $('[data-rail-next]', group)?.addEventListener('click', () => el.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));

    // Click-and-drag with a mouse; touch already scrolls natively
    let down = false;
    let moved = false;
    let x0 = 0;
    let s0 = 0;
    el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true;
        moved = false;
        x0 = e.clientX;
        s0 = el.scrollLeft;
    });
    addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - x0;
        if (!moved && Math.abs(dx) > 5) {
            moved = true;
            el.classList.add('is-dragging');
        }
        if (moved) el.scrollLeft = s0 - dx;
    });
    addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        // Let the click that follows a drag land on the rail, not a link
        setTimeout(() => el.classList.remove('is-dragging'), 0);
    });
}

/* ---------------- micro-interactions ---------------- */

function micro() {
    if (finePointer && !reduced) {
        $$('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
            });
            el.addEventListener('pointerleave', () => {
                gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.45)' });
            });
        });
    }

    if (finePointer) {
        $$('[data-spotlight]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${e.clientX - r.left}px`);
                el.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });
    }

    $$<HTMLButtonElement>('[data-copy]').forEach((btn) => {
        const label = $('[data-copy-label]', btn);
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy ?? '';
            let ok = false;
            try {
                await navigator.clipboard.writeText(text);
                ok = true;
            } catch {
                const email = btn.parentElement?.querySelector('.email');
                if (email) {
                    const range = document.createRange();
                    range.selectNodeContents(email);
                    const sel = getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            }
            if (label) {
                label.textContent = ok ? 'Copied' : 'Selected';
                setTimeout(() => (label.textContent = 'Copy'), 1800);
            }
        });
    });
}

/* ---------------- theme: light / dark with a circular reveal ---------------- */

const THEME_KEY = 'uj-theme';
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => root.dataset.theme ?? (systemDark.matches ? 'dark' : 'light');

function themeToggle() {
    const btn = $<HTMLButtonElement>('[data-theme-toggle]');
    if (!btn) return;

    const label = () => btn.setAttribute('aria-label', `Switch to ${effectiveTheme() === 'dark' ? 'light' : 'dark'} theme`);
    label();

    // Keep the WebGL field in sync however the theme changes: the OS
    // setting, this button, or a host page stamping data-theme on <html>
    systemDark.addEventListener('change', () => {
        if (!root.dataset.theme) {
            flux?.retheme();
            label();
        }
    });
    new MutationObserver(() => {
        flux?.retheme();
        label();
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    btn.addEventListener('click', (e) => {
        const next = effectiveTheme() === 'dark' ? 'light' : 'dark';

        const apply = () => {
            root.dataset.theme = next;
            try {
                localStorage.setItem(THEME_KEY, next);
            } catch {}
            flux?.retheme(true);
            label();
        };

        const vt = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }).startViewTransition;
        if (reduced || !vt) {
            apply();
            return;
        }

        // The new theme grows out of the button as a circle
        const r = btn.getBoundingClientRect();
        const x = e.clientX || r.left + r.width / 2;
        const y = e.clientY || r.top + r.height / 2;
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

        root.classList.add('theme-switching');
        const t = vt.call(document, apply);
        t.ready.then(() => {
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                { duration: 750, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
            );
        });
        t.finished.finally(() => root.classList.remove('theme-switching'));
    });
}

/* ---------------- cards: tilt, sheen, parallax ---------------- */

/** One band of light across a card. */
function sheen(card: HTMLElement, delay = 0) {
    if (reduced) return;
    let band = card.querySelector<HTMLElement>(':scope > .card-sheen');
    if (!band) {
        band = document.createElement('span');
        band.className = 'card-sheen';
        band.setAttribute('aria-hidden', 'true');
        card.appendChild(band);
    }
    gsap.fromTo(
        band,
        { xPercent: -100, autoAlpha: 1 },
        { xPercent: 100, duration: 1.3, ease: 'power2.inOut', delay, onComplete: () => gsap.set(band, { autoAlpha: 0 }) }
    );
}

/** 3D tilt toward the cursor, with inner [data-depth] layers drifting for parallax. */
function tilt() {
    if (!finePointer || reduced) return;

    $$('[data-tilt]').forEach((el) => {
        const max = Number(el.dataset.tiltMax ?? 6);
        const layers = $$('[data-depth]', el).map((node) => ({
            node,
            depth: Number(node.dataset.depth),
            x: gsap.quickTo(node, 'x', { duration: 0.6, ease: 'power3.out' }),
            y: gsap.quickTo(node, 'y', { duration: 0.6, ease: 'power3.out' })
        }));

        gsap.set(el, { transformPerspective: 1000 });
        const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
        const lift = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });

        el.addEventListener('pointerenter', () => lift(-6));
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 .. 0.5
            const py = (e.clientY - r.top) / r.height - 0.5;
            ry(px * max * 2);
            rx(-py * max * 2);
            layers.forEach((l) => {
                l.x(px * l.depth);
                l.y(py * l.depth);
            });
        });
        el.addEventListener('pointerleave', () => {
            gsap.to(el, { rotationX: 0, rotationY: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
            layers.forEach((l) => gsap.to(l.node, { x: 0, y: 0, duration: 0.9, ease: 'power3.out', overwrite: 'auto' }));
        });
    });
}

/** Images drift slower than the page, so frames feel like windows. */
function parallax() {
    if (reduced) return;
    $$('[data-parallax]').forEach((img) => {
        gsap.fromTo(
            img,
            { yPercent: -6 },
            {
                yPercent: 6,
                ease: 'none',
                scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
            }
        );
    });
}

/* ---------------- boot ---------------- */

async function boot() {
    // Split text only once real fonts are in, or line breaks shift mid-animation
    await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
    root.classList.add('is-ready');

    themeToggle();
    heroIntro();
    scene();
    careerScrub();
    reveals();
    navBehaviour();
    rails();
    micro();
    tilt();
    parallax();

    ScrollTrigger.refresh();
}

boot();

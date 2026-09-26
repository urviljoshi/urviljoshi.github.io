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
import { armPixelate, disarmPixelate } from './pixelate';

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
        gsap.from(group.children, {
            '--ry': '30px',
            opacity: 0,
            duration: 0.9,
            stagger: 0.07,
            ease: 'power3.out',
            scrollTrigger: { trigger: group, start: 'top 90%', once: true }
        });
    });

    const vids = $$('[data-stagger-item]');
    if (vids.length) {
        gsap.from(vids, {
            '--ry': '40px',
            opacity: 0,
            duration: 1.1,
            stagger: 0.06,
            ease: 'expo.out',
            scrollTrigger: { trigger: '[data-rail]', start: 'top 88%', once: true }
        });
    }
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

/* ---------------- video rail ---------------- */

function rail() {
    const el = $('[data-rail]');
    if (!el) return;
    const bar = $('[data-rail-progress]');

    const sync = () => {
        if (!bar) return;
        const k = Math.min(1, (el.scrollLeft + el.clientWidth) / el.scrollWidth);
        bar.style.transform = `scaleX(${k.toFixed(4)})`;
    };
    el.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();

    const step = () => Math.max(280, el.clientWidth * 0.75);
    $('[data-rail-prev]')?.addEventListener('click', () => el.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    $('[data-rail-next]')?.addEventListener('click', () => el.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));

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

/* ---------------- direction toggle (prototype only) ---------------- */

function directionToggle() {
    const group = $('[data-compare]');
    if (!group) return;
    const buttons = $$<HTMLButtonElement>('[data-set-variant]', group);
    const themeMeta = $<HTMLMetaElement>('meta[name="theme-color"]');

    const apply = (v: string, initial = false) => {
        root.dataset.variant = v;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setVariant === v)));
        themeMeta?.setAttribute('content', v === 'pixel' ? '#10101d' : '#0a0f14');
        flux?.setVariant(v);
        if (v === 'pixel' && !reduced) armPixelate();
        else disarmPixelate();
        try {
            localStorage.setItem('uj-direction', v);
        } catch {}
        // Pixel labels are wider; let pinned sections re-measure
        if (!initial) setTimeout(() => ScrollTrigger.refresh(), 700);
    };

    buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.setVariant!)));

    let start = 'sleek';
    if (location.hash === '#pixel') start = 'pixel';
    else {
        try {
            start = localStorage.getItem('uj-direction') ?? 'sleek';
        } catch {}
    }
    apply(start === 'pixel' ? 'pixel' : 'sleek', true);
}

/* ---------------- boot ---------------- */

async function boot() {
    // Split text only once real fonts are in, or line breaks shift mid-animation
    await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
    root.classList.add('is-ready');

    directionToggle();
    heroIntro();
    careerScrub();
    reveals();
    navBehaviour();
    rail();
    micro();

    ScrollTrigger.refresh();
}

boot();

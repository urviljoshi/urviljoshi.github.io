/* ========================================================================
   urvil.exe — Cozy Pixel Terminal :: main.js
   ======================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    Boot.init();
    ThemeToggle.init();
    CrtToggle.init();
    Navigation.init();
    TypingEffect.init();
    ScrollProgress.init();
    ScrollAnimations.init();
    BackToTop.init();
    RippleEffect.init();
    HeroSky.init();
    CommandPalette.init();
});

/* ========================================
   BOOT SEQUENCE
   ======================================== */
const Boot = {
    steps: [
        { at: 15,  msg: 'loading assets<span class="blink">_</span>' },
        { at: 45,  msg: 'mounting /skills<span class="blink">_</span>' },
        { at: 75,  msg: 'spawning player one<span class="blink">_</span>' },
        { at: 100, msg: 'ready<span class="blink">_</span>' }
    ],
    init() {
        this.boot = document.getElementById('boot');
        this.fill = document.getElementById('bootFill');
        this.text = document.getElementById('bootText');
        if (!this.boot) return;

        const reduce = prefersReducedMotion();
        let i = 0;
        const advance = () => {
            if (i >= this.steps.length) return this.finish();
            const step = this.steps[i++];
            if (this.fill) this.fill.style.width = step.at + '%';
            if (this.text) this.text.innerHTML = step.msg;
            setTimeout(advance, reduce ? 60 : 380);
        };
        setTimeout(advance, reduce ? 0 : 250);
    },
    finish() {
        setTimeout(() => {
            this.boot.classList.add('hidden');
            setTimeout(() => { this.boot.style.display = 'none'; }, 400);
        }, 250);
    }
};

/* ========================================
   THEME TOGGLE
   ======================================== */
const ThemeToggle = {
    init() {
        this.toggle = document.getElementById('themeToggle');
        this.html = document.documentElement;
        const saved = localStorage.getItem('theme') || 'dark';
        this.setTheme(saved);
        if (this.toggle) this.toggle.addEventListener('click', () => this.toggleTheme());
    },
    setTheme(theme) {
        this.html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'light' ? '#efe6cf' : '#16162a');
    },
    toggleTheme() {
        const next = this.html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
    }
};

/* ========================================
   CRT SCANLINE TOGGLE
   ======================================== */
const CrtToggle = {
    init() {
        this.btn = document.getElementById('crtToggle');
        this.overlay = document.getElementById('crtOverlay');
        if (!this.btn || !this.overlay) return;

        if (localStorage.getItem('crt') === 'on') this.set(true);
        this.btn.addEventListener('click', () => {
            this.set(!this.overlay.classList.contains('on'));
        });
    },
    set(on) {
        this.overlay.classList.toggle('on', on);
        this.btn.classList.toggle('on', on);
        localStorage.setItem('crt', on ? 'on' : 'off');
    }
};

/* ========================================
   NAVIGATION
   ======================================== */
const Navigation = {
    init() {
        this.sidebar = document.getElementById('sidebar');
        this.hamburger = document.getElementById('hamburger');
        this.overlay = document.getElementById('mobileOverlay');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.section');
        if (!this.sidebar || !this.hamburger) return;

        this.hamburger.addEventListener('click', () => this.toggleMenu());
        this.overlay.addEventListener('click', () => this.closeMenu());
        this.navLinks.forEach(link => link.addEventListener('click', (e) => this.handleNavClick(e, link)));
        this.observeSections();
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeMenu(); });
    },
    toggleMenu() {
        this.sidebar.classList.toggle('active');
        this.hamburger.classList.toggle('active');
        this.overlay.classList.toggle('active');
        document.body.style.overflow = this.sidebar.classList.contains('active') ? 'hidden' : '';
    },
    closeMenu() {
        this.sidebar.classList.remove('active');
        this.hamburger.classList.remove('active');
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    },
    handleNavClick(e, link) {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) { this.closeMenu(); target.scrollIntoView({ behavior: 'smooth' }); }
    },
    observeSections() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) this.setActiveNav(entry.target.getAttribute('id'));
            });
        }, { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 });
        this.sections.forEach(section => observer.observe(section));
    },
    setActiveNav(id) {
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-section') === id);
        });
    }
};

/* ========================================
   TYPING EFFECT
   ======================================== */
const TypingEffect = {
    texts: ['Software Engineer', 'Java Developer', 'Spring Boot Specialist', 'Backend Engineer', 'Problem Solver'],
    currentTextIndex: 0,
    currentCharIndex: 0,
    isDeleting: false,
    typingSpeed: 90,
    deletingSpeed: 45,
    pauseTime: 1800,
    init() {
        this.element = document.getElementById('typingText');
        if (!this.element) return;
        this.type();
    },
    type() {
        const text = this.texts[this.currentTextIndex];
        if (this.isDeleting) {
            this.element.textContent = text.substring(0, this.currentCharIndex - 1);
            this.currentCharIndex--;
        } else {
            this.element.textContent = text.substring(0, this.currentCharIndex + 1);
            this.currentCharIndex++;
        }
        let delay = this.isDeleting ? this.deletingSpeed : this.typingSpeed;
        if (!this.isDeleting && this.currentCharIndex === text.length) {
            delay = this.pauseTime; this.isDeleting = true;
        } else if (this.isDeleting && this.currentCharIndex === 0) {
            this.isDeleting = false;
            this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
            delay = 450;
        }
        setTimeout(() => this.type(), delay);
    }
};

/* ========================================
   SCROLL PROGRESS
   ======================================== */
const ScrollProgress = {
    init() {
        this.bar = document.getElementById('scrollProgress');
        if (!this.bar) return;
        window.addEventListener('scroll', () => this.update(), { passive: true });
    },
    update() {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        this.bar.style.width = `${(window.scrollY / h) * 100}%`;
    }
};

/* ========================================
   SCROLL ANIMATIONS
   ======================================== */
const ScrollAnimations = {
    init() {
        this.els = document.querySelectorAll('.animate-on-scroll');
        if (!this.els.length) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { root: null, rootMargin: '0px 0px -80px 0px', threshold: 0.1 });
        this.els.forEach(el => observer.observe(el));
    }
};

/* ========================================
   BACK TO TOP
   ======================================== */
const BackToTop = {
    init() {
        this.button = document.getElementById('backToTop');
        if (!this.button) return;
        window.addEventListener('scroll', () => this.toggle(), { passive: true });
        this.button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    },
    toggle() { this.button.classList.toggle('visible', window.scrollY > 300); }
};

/* ========================================
   RIPPLE / PIXEL BLIP
   ======================================== */
const RippleEffect = {
    init() {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.blip(e, btn));
        });
    },
    blip(event, button) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 400);
    }
};

/* ========================================
   HERO SKY (drifting pixel stars + clouds)
   ======================================== */
const HeroSky = {
    init() {
        this.sky = document.getElementById('heroSky');
        if (!this.sky || prefersReducedMotion()) return;

        const frag = document.createDocumentFragment();
        for (let i = 0; i < 34; i++) {
            const s = document.createElement('span');
            s.className = 'px-star';
            s.style.top = `${Math.random() * 100}%`;
            s.style.left = `${Math.random() * 100}%`;
            const size = Math.random() < 0.25 ? 4 : (Math.random() < 0.5 ? 3 : 2);
            s.style.width = s.style.height = `${size}px`;
            s.style.animationDuration = `${2 + Math.random() * 3}s, ${16 + Math.random() * 24}s`;
            s.style.animationDelay = `${Math.random() * 4}s, ${Math.random() * -30}s`;
            frag.appendChild(s);
        }
        for (let i = 0; i < 3; i++) {
            const c = document.createElement('span');
            c.className = 'px-cloud';
            c.style.top = `${10 + Math.random() * 55}%`;
            c.style.animationDuration = `${45 + Math.random() * 40}s`;
            c.style.animationDelay = `${Math.random() * -60}s`;
            c.style.transform = `scale(${0.8 + Math.random() * 0.8})`;
            frag.appendChild(c);
        }
        this.sky.appendChild(frag);
    }
};

/* ========================================
   COMMAND PALETTE (Ctrl/Cmd + K)
   ======================================== */
const CommandPalette = {
    init() {
        this.root = document.getElementById('cmdk');
        this.input = document.getElementById('cmdkInput');
        this.list = document.getElementById('cmdkList');
        this.trigger = document.getElementById('cmdkTrigger');
        if (!this.root || !this.input || !this.list) return;

        this.items = Array.from(document.querySelectorAll('.nav-link')).map(link => ({
            label: link.textContent.trim(),
            href: link.getAttribute('href')
        }));
        this.activeIndex = 0;

        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.open(); }
            else if (e.key === 'Escape' && this.isOpen()) { this.close(); }
        });
        if (this.trigger) this.trigger.addEventListener('click', () => this.open());
        this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); });
        this.input.addEventListener('input', () => this.render());
        this.input.addEventListener('keydown', (e) => this.onKey(e));
    },
    isOpen() { return this.root.classList.contains('open'); },
    open() {
        this.root.classList.add('open');
        this.root.setAttribute('aria-hidden', 'false');
        this.input.value = '';
        this.activeIndex = 0;
        this.render();
        setTimeout(() => this.input.focus(), 20);
    },
    close() {
        this.root.classList.remove('open');
        this.root.setAttribute('aria-hidden', 'true');
    },
    filtered() {
        const q = this.input.value.toLowerCase().trim();
        return q ? this.items.filter(i => i.label.toLowerCase().includes(q)) : this.items;
    },
    render() {
        const items = this.filtered();
        if (this.activeIndex >= items.length) this.activeIndex = 0;
        this.list.innerHTML = items.map((it, idx) => `
            <li class="cmdk-item ${idx === this.activeIndex ? 'active' : ''}" data-href="${it.href}">
                <span class="n">${String(idx + 1).padStart(2, '0')}</span> ${it.label}
            </li>`).join('');
        Array.from(this.list.children).forEach((li, idx) => {
            li.addEventListener('click', () => this.go(items[idx].href));
            li.addEventListener('mousemove', () => {
                this.activeIndex = idx;
                Array.from(this.list.children).forEach((n, i) => n.classList.toggle('active', i === idx));
            });
        });
    },
    onKey(e) {
        const items = this.filtered();
        if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIndex = (this.activeIndex + 1) % items.length; this.render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex = (this.activeIndex - 1 + items.length) % items.length; this.render(); }
        else if (e.key === 'Enter') { e.preventDefault(); if (items[this.activeIndex]) this.go(items[this.activeIndex].href); }
    },
    go(href) {
        this.close();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
};

/* ========================================
   UTILITIES
   ======================================== */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

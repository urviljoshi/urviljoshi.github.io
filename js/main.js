/* ========================================
   PORTFOLIO WEBSITE - JAVASCRIPT
   Urvil Joshi - Software Engineer
   ======================================== */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    Preloader.init();
    ThemeToggle.init();
    Navigation.init();
    TypingEffect.init();
    ScrollProgress.init();
    ScrollAnimations.init();
    BackToTop.init();
    RippleEffect.init();
});

/* ========================================
   PRELOADER MODULE
   ======================================== */
const Preloader = {
    init() {
        const preloader = document.getElementById('preloader');
        if (!preloader) return;

        // Hide preloader after page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                preloader.classList.add('hidden');
                // Remove from DOM after animation
                setTimeout(() => {
                    preloader.style.display = 'none';
                }, 500);
            }, 1500);
        });
    }
};

/* ========================================
   THEME TOGGLE MODULE
   ======================================== */
const ThemeToggle = {
    init() {
        this.toggle = document.getElementById('themeToggle');
        this.html = document.documentElement;
        
        if (!this.toggle) return;

        // Load saved theme or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);

        // Toggle event listener
        this.toggle.addEventListener('click', () => this.toggleTheme());
    },

    setTheme(theme) {
        this.html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    },

    toggleTheme() {
        const currentTheme = this.html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
};

/* ========================================
   NAVIGATION MODULE
   ======================================== */
const Navigation = {
    init() {
        this.sidebar = document.getElementById('sidebar');
        this.hamburger = document.getElementById('hamburger');
        this.overlay = document.getElementById('mobileOverlay');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.section');

        if (!this.sidebar || !this.hamburger) return;

        // Hamburger menu toggle
        this.hamburger.addEventListener('click', () => this.toggleMenu());
        this.overlay.addEventListener('click', () => this.closeMenu());

        // Nav link smooth scroll
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavClick(e, link));
        });

        // Active section highlighting on scroll
        this.observeSections();

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMenu();
        });
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
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            // Close mobile menu
            this.closeMenu();
            
            // Smooth scroll to section
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }
    },

    observeSections() {
        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('id');
                    this.setActiveNav(sectionId);
                }
            });
        }, observerOptions);

        this.sections.forEach(section => observer.observe(section));
    },

    setActiveNav(sectionId) {
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
    }
};

/* ========================================
   TYPING EFFECT MODULE
   ======================================== */
const TypingEffect = {
    texts: [
        'Software Engineer',
        'Java Developer',
        'Spring Boot Specialist',
        'Backend Engineer',
        'Problem Solver'
    ],
    currentTextIndex: 0,
    currentCharIndex: 0,
    isDeleting: false,
    typingSpeed: 100,
    deletingSpeed: 50,
    pauseTime: 2000,

    init() {
        this.element = document.getElementById('typingText');
        if (!this.element) return;
        
        this.type();
    },

    type() {
        const currentText = this.texts[this.currentTextIndex];
        
        if (this.isDeleting) {
            // Deleting
            this.element.textContent = currentText.substring(0, this.currentCharIndex - 1);
            this.currentCharIndex--;
        } else {
            // Typing
            this.element.textContent = currentText.substring(0, this.currentCharIndex + 1);
            this.currentCharIndex++;
        }

        // Determine next action
        let nextDelay = this.isDeleting ? this.deletingSpeed : this.typingSpeed;

        if (!this.isDeleting && this.currentCharIndex === currentText.length) {
            // Finished typing, pause then start deleting
            nextDelay = this.pauseTime;
            this.isDeleting = true;
        } else if (this.isDeleting && this.currentCharIndex === 0) {
            // Finished deleting, move to next text
            this.isDeleting = false;
            this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
            nextDelay = 500;
        }

        setTimeout(() => this.type(), nextDelay);
    }
};

/* ========================================
   SCROLL PROGRESS MODULE
   ======================================== */
const ScrollProgress = {
    init() {
        this.progressBar = document.getElementById('scrollProgress');
        if (!this.progressBar) return;

        window.addEventListener('scroll', () => this.updateProgress(), { passive: true });
    },

    updateProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        this.progressBar.style.width = `${progress}%`;
    }
};

/* ========================================
   SCROLL ANIMATIONS MODULE
   ======================================== */
const ScrollAnimations = {
    init() {
        this.animatedElements = document.querySelectorAll('.animate-on-scroll');
        
        if (this.animatedElements.length === 0) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, observerOptions);

        this.animatedElements.forEach(el => observer.observe(el));
    }
};

/* ========================================
   BACK TO TOP MODULE
   ======================================== */
const BackToTop = {
    init() {
        this.button = document.getElementById('backToTop');
        if (!this.button) return;

        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => this.toggleVisibility(), { passive: true });

        // Scroll to top on click
        this.button.addEventListener('click', () => this.scrollToTop());
    },

    toggleVisibility() {
        if (window.scrollY > 300) {
            this.button.classList.add('visible');
        } else {
            this.button.classList.remove('visible');
        }
    },

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
};

/* ========================================
   RIPPLE EFFECT MODULE
   ======================================== */
const RippleEffect = {
    init() {
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => this.createRipple(e, btn));
        });
    },

    createRipple(event, button) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
        
        button.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => ripple.remove(), 600);
    }
};

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

// Debounce function for performance
function debounce(func, wait = 20) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Check if device supports hover (desktop)
function supportsHover() {
    return window.matchMedia('(hover: hover)').matches;
}

// Check if reduced motion is preferred
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ========================================================================
   Site content. Everything the page says lives here, so a redesign never
   means re-typing a resume. Dates are ISO months; durations are computed
   at build time so they never go stale.
   ======================================================================== */

import feeds from '../../data/feeds.json';

export const person = {
    name: 'Urvil Joshi',
    role: 'Software Engineer II',
    company: 'HARMAN International',
    email: 'urvvil08@gmail.com',
    phone: '+91 7568965601',
    resume: '/assets/resume.pdf',
    portrait: '/images/profile.jpg',
    careerStart: '2018-02'
};

export const socials = [
    { label: 'GitHub', handle: 'urviljoshi', href: 'https://github.com/urviljoshi' },
    { label: 'LinkedIn', handle: 'in/urviljoshi', href: 'https://www.linkedin.com/in/urviljoshi/' },
    { label: 'YouTube', handle: '@fluxstack', href: 'https://www.youtube.com/@fluxstack' },
    { label: 'Medium', handle: '@urvvil08', href: 'https://medium.com/@urvvil08' }
];

export type Role = {
    title: string;
    org: string;
    start: string;       // YYYY-MM
    end: string | null;  // null = present
    place?: string;
    project?: string;
    summary: string;
};

export const roles: Role[] = [
    {
        title: 'Software Engineer II',
        org: 'HARMAN International',
        start: '2022-10',
        end: null,
        project: 'Harman Ignite',
        summary: 'Backend engineering on Harman Ignite, HARMAN’s connected-car platform for automotive apps and services.'
    },
    {
        title: 'Technical Specialist',
        org: 'Mindtree',
        start: '2022-01',
        end: '2022-10',
        project: 'MOSIP',
        summary: 'Java services across MOSIP’s core: identity repository, packet manager, key manager and digital card service.'
    },
    {
        title: 'Senior Software Developer',
        org: 'Mindtree',
        start: '2020-01',
        end: '2021-12',
        place: 'Bengaluru',
        project: 'MOSIP',
        summary: 'Identity services on MOSIP, the open-source platform countries use to run national ID programs.'
    },
    {
        title: 'Software Developer',
        org: 'Mindtree',
        start: '2018-02',
        end: '2019-12',
        place: 'Bengaluru',
        project: 'MOSIP',
        summary: 'Joined MOSIP early. Spring Boot services, starting with pre-registration.'
    },
    {
        title: 'Intern',
        org: 'Hewlett Packard Enterprise',
        start: '2016-05',
        end: '2016-08',
        place: 'Jaipur',
        summary: 'Summer internship.'
    }
];

export const skills = [
    { group: 'Languages', items: ['Java', 'SQL', 'Python'] },
    { group: 'Frameworks', items: ['Spring Boot', 'Spring Data', 'Spring Security', 'Spring MVC', 'Hibernate', 'Project Reactor'] },
    { group: 'Data', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Apache Kafka'] },
    { group: 'Platform', items: ['Microservices', 'REST APIs', 'Docker', 'Keycloak', 'Swagger'] },
    { group: 'Tooling', items: ['Maven', 'Git', 'Claude Code', 'AI agents'] }
];

export const work = [
    {
        name: 'Harman Ignite',
        org: 'HARMAN International',
        start: '2022-10',
        end: null,
        logo: '/images/projects/harman-ignite.png',
        href: 'https://car.harman.com/solutions/automotive-engineering-services',
        blurb: 'A connected-car platform providing automotive solutions and services to carmakers.',
        tags: ['Java', 'Spring Boot', 'Microservices']
    },
    {
        name: 'MOSIP',
        org: 'Mindtree',
        start: '2018-02',
        end: '2022-10',
        logo: '/images/projects/mosip.png',
        href: 'https://www.mosip.io/',
        blurb: 'Modular Open Source Identity Platform. Countries use it to build foundational digital ID systems without vendor lock-in. Nearly five years on its core services.',
        tags: ['Java', 'Spring Boot', 'Kafka', 'Keycloak']
    }
];

export const sideProjects = [
    {
        name: 'medium2x',
        lang: 'Python',
        href: 'https://github.com/urviljoshi/medium2x',
        blurb: 'Turns a Medium article into a paste-ready X Article, keeping the headings, lists, links and images the composer would strip.'
    },
    {
        name: 'orbit-api',
        lang: 'Python',
        href: 'https://github.com/urviljoshi/orbit-api',
        blurb: 'A FastAPI service shaped like a real SaaS backend: auth, billing, webhooks and notifications. Built as a teaching codebase for videos.'
    },
    {
        name: 'Bluex',
        lang: 'Kotlin',
        href: 'https://github.com/urviljoshi/Bluex',
        blurb: 'A native Android player for music you already own. Local-first, no accounts, no subscription.'
    }
];

export const awards = [
    {
        title: 'Outstanding Contribution',
        issuer: 'MOSIP',
        note: 'Presented by Dame Wendy Hall for contribution to MOSIP.',
        image: '/images/awards/mosip-contribution.jpg'
    },
    {
        title: 'Outstanding Performance Award',
        issuer: 'Mindtree',
        image: '/images/awards/outstanding.jpg'
    },
    {
        title: 'Star Award',
        issuer: 'Mindtree',
        image: '/images/awards/star.jpg'
    }
];

export const certifications = [
    { title: 'Mastering Java Reactive Programming', issuer: 'Udemy', date: '2025-01', href: '/assets/certifications/java-reactive.pdf' },
    { title: 'Parallel Programming in Java', issuer: 'Rice University', date: '2021-10', href: '/assets/certifications/parallel-programming.pdf' },
    { title: 'Programming for Everybody (Python)', issuer: 'University of Michigan', date: '2019-11', href: '/assets/certifications/python-programming.pdf' }
];

export const education = {
    degree: 'B.E. Computer Science',
    school: 'GIT Jaipur',
    years: '2013 – 2017'
};

/* ---------------- feeds ---------------- */

type Post = { title: string; url: string; date: string; tags: string[] };
type Video = { id: string; title: string; url: string; thumbnail: string; date: string; views: number; short: boolean };

export const posts = (feeds.posts ?? []) as Post[];
export const videos = (feeds.videos ?? []) as Video[];
export const channel = feeds.channel;

/* ---------------- helpers ---------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BUILD = new Date();

const toDate = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1);
};

export const monthYear = (ym: string | null) => {
    if (!ym) return 'Present';
    const d = toDate(ym);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** "3 yrs 11 mos", inclusive of both end months like LinkedIn counts. */
export const duration = (start: string, end: string | null) => {
    const a = toDate(start);
    const b = end ? toDate(end) : new Date(BUILD.getFullYear(), BUILD.getMonth(), 1);
    const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' ');
};

export const yearsExperience = Math.floor(
    (BUILD.getTime() - toDate(person.careerStart).getTime()) / (365.25 * 24 * 3600 * 1000)
);

/** Fractional year for placing a month on the career axis. */
export const yearPos = (ym: string | null) => {
    const d = ym ? toDate(ym) : BUILD;
    return d.getFullYear() + d.getMonth() / 12;
};

export const buildYear = BUILD.getFullYear();

export const compactViews = (n: number) =>
    n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`
    : String(n);

/** YouTube titles end in hashtag clouds; drop them for display. */
export const cleanTitle = (t: string) => t.replace(/(\s+#[\wÀ-￿-]+)+\s*$/g, '').trim() || t;

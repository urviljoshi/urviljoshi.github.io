/* ========================================================================
   Desk scene: live typing on the monitor, cursor parallax, and the
   small human beats (thinking pauses, leaning back when a file is done).
   Everything stops when the scene is off screen or the tab is hidden.
   ======================================================================== */

import { gsap } from 'gsap';

type Snippet = { tab: string; status: string; lang: 'java' | 'shell'; lines: string[] };

const SNIPPETS: Snippet[] = [
    {
        tab: 'TelemetryController.java',
        status: 'Java · UTF-8',
        lang: 'java',
        lines: [
            '@RestController',
            'class TelemetryController {',
            '',
            '  private final VehicleService vehicles;',
            '',
            '  @GetMapping("/vehicles/{id}/events")',
            '  Flux<Event> stream(@PathVariable String id) {',
            '    return vehicles.events(id)',
            '        .filter(Event::isCritical)',
            '        .onBackpressureBuffer(256)',
            '        .retryWhen(Retry.backoff(3, ofMillis(200)));',
            '  }',
            '}'
        ]
    },
    {
        tab: 'EventConsumer.java',
        status: 'Java · UTF-8',
        lang: 'java',
        lines: [
            '@Component',
            'class EventConsumer {',
            '',
            '  @KafkaListener(topics = "vehicle.events")',
            '  void onEvent(Event event, Acknowledgment ack) {',
            '    if (event.isDuplicate()) {',
            '      ack.acknowledge();',
            '      return;',
            '    }',
            '    store.save(event);',
            '    ack.acknowledge();',
            '  }',
            '}'
        ]
    },
    {
        tab: 'zsh — telemetry',
        status: 'zsh',
        lang: 'shell',
        lines: [
            '$ claude "add retry with backoff to the event stream"',
            '',
            '● Reading TelemetryController.java',
            '● Editing stream() to use Retry.backoff',
            '● Running ./mvnw test',
            '  Tests run: 42, Failures: 0, Errors: 0',
            '',
            '✓ Done in 38s',
            '',
            '$ git commit -am "retry event stream with backoff"',
            '[main 4f2c1a9] retry event stream with backoff',
            '$ '
        ]
    }
];

const C = {
    plain: '#d6deeb',
    keyword: '#c792ea',
    annotation: '#ffcb6b',
    string: '#c3e88d',
    type: '#ff8a8a',
    number: '#f78c6c',
    punct: '#89ddff',
    prompt: '#5be3b0',
    muted: '#637089',
    ok: '#5be3b0'
};

const KEYWORDS = new Set(['return', 'private', 'final', 'class', 'public', 'new', 'static', 'void', 'if', 'else']);

type Tok = { t: string; c: string };

function tokenizeJava(line: string): Tok[] {
    const out: Tok[] = [];
    const re = /("(?:[^"\\]|\\.)*")|(@\w+)|(\d+)|([A-Za-z_]\w*)|(\s+)|([^\w\s])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
        const [t, str, ann, num, word, ws] = m;
        if (str) out.push({ t, c: C.string });
        else if (ann) out.push({ t, c: C.annotation });
        else if (num) out.push({ t, c: C.number });
        else if (word) out.push({ t, c: KEYWORDS.has(word) ? C.keyword : /^[A-Z]/.test(word) ? C.type : C.plain });
        else if (ws) out.push({ t, c: C.plain });
        else out.push({ t, c: C.punct });
    }
    return out;
}

function tokenizeShell(line: string): Tok[] {
    if (line.startsWith('$ ')) {
        const rest = line.slice(2);
        const q = rest.indexOf('"');
        if (q < 0) return [{ t: '$ ', c: C.prompt }, { t: rest, c: C.plain }];
        return [
            { t: '$ ', c: C.prompt },
            { t: rest.slice(0, q), c: C.plain },
            { t: rest.slice(q), c: C.string }
        ];
    }
    if (line.startsWith('●')) return [{ t: '● ', c: C.type }, { t: line.slice(2), c: C.plain }];
    if (line.startsWith('✓')) return [{ t: line, c: C.ok }];
    return [{ t: line, c: C.muted }];
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const X0 = 192;          // code column
const Y0 = 209;          // first baseline
const LH = 12.4;         // line height
const CW = 8.5 * 0.6;    // monospace advance at 8.5px

export function initScene(root: HTMLElement, opts: { reduced: boolean; finePointer: boolean }) {
    const code = root.querySelector<SVGGElement>('[data-code]');
    const gutter = root.querySelector<SVGGElement>('[data-gutter]');
    const caret = root.querySelector<SVGRectElement>('[data-caret]');
    const tab = root.querySelector<SVGTextElement>('[data-tab]');
    const status = root.querySelector<SVGTextElement>('[data-status]');
    const person = root.querySelector<SVGGElement>('[data-person]');
    if (!code || !gutter || !caret || !tab || !status) return;

    let alive = true;
    let visible = true;
    let wake: (() => void) | null = null;

    // Typing waits (not skips) while hidden, so it resumes mid-line
    const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
            const start = () => setTimeout(resolve, ms);
            if (visible && !document.hidden) start();
            else wake = () => { wake = null; start(); };
        });

    const setVisible = (v: boolean) => {
        visible = v;
        root.classList.toggle('is-paused', !v || document.hidden);
        if (v && !document.hidden && wake) wake();
    };

    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    document.addEventListener('visibilitychange', () => setVisible(visible));

    const moveCaret = (line: number, col: number) => {
        caret.setAttribute('x', String(X0 + col * CW));
        caret.setAttribute('y', String(Y0 + line * LH - 8.5));
    };

    const makeLine = (i: number) => {
        const num = document.createElementNS(SVG_NS, 'text');
        num.setAttribute('x', String(X0 - 8));
        num.setAttribute('y', String(Y0 + i * LH));
        num.setAttribute('text-anchor', 'end');
        num.textContent = String(i + 1);
        gutter.appendChild(num);

        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', String(X0));
        text.setAttribute('y', String(Y0 + i * LH));
        text.setAttribute('xml:space', 'preserve');
        code.appendChild(text);
        return text;
    };

    const clear = () => {
        code.replaceChildren();
        gutter.replaceChildren();
        moveCaret(0, 0);
    };

    const tokens = (s: Snippet, line: string) => (s.lang === 'java' ? tokenizeJava(line) : tokenizeShell(line));

    /** Render a snippet instantly (reduced motion). */
    const renderAll = (s: Snippet) => {
        clear();
        tab.textContent = s.tab;
        status.textContent = s.status;
        s.lines.forEach((line, i) => {
            const text = makeLine(i);
            for (const tok of tokens(s, line)) {
                const span = document.createElementNS(SVG_NS, 'tspan');
                span.setAttribute('fill', tok.c);
                span.textContent = tok.t;
                text.appendChild(span);
            }
        });
        moveCaret(s.lines.length - 1, s.lines[s.lines.length - 1].length);
    };

    const beat = (cls: string, ms: number) => {
        root.classList.add(cls);
        setTimeout(() => root.classList.remove(cls), ms);
    };

    const leanBack = () => {
        if (!person) return;
        gsap.timeline()
            .to(person, { y: 7, scale: 1.025, rotation: -1.5, transformOrigin: '50% 100%', duration: 0.9, ease: 'power2.inOut' })
            .to(person, { y: 0, scale: 1, rotation: 0, duration: 1.1, ease: 'power2.inOut' }, '+=1');
    };

    async function typeSnippet(s: Snippet) {
        clear();
        tab.textContent = s.tab;
        status.textContent = s.status;

        for (let i = 0; i < s.lines.length && alive; i++) {
            const text = makeLine(i);
            moveCaret(i, 0);
            const line = s.lines[i];
            if (!line) {
                await sleep(90);
                continue;
            }

            // Leading indent appears at once, like an editor auto-indent
            const indent = line.match(/^\s*/)![0].length;
            let col = 0;
            root.classList.add('is-typing');

            for (const tok of tokens(s, line)) {
                const span = document.createElementNS(SVG_NS, 'tspan');
                span.setAttribute('fill', tok.c);
                text.appendChild(span);
                for (let k = 1; k <= tok.t.length && alive; k++) {
                    span.textContent = tok.t.slice(0, k);
                    col++;
                    moveCaret(i, col);
                    if (col <= indent) continue;
                    await sleep(22 + Math.random() * 46);
                }
            }

            root.classList.remove('is-typing');
            // Every few lines, stop and think
            if (Math.random() < 0.22) {
                beat('is-thinking', 1600);
                await sleep(1500);
            } else {
                await sleep(140 + Math.random() * 220);
            }
        }

        await sleep(500);
        leanBack();
        await sleep(3000);
    }

    if (opts.reduced) {
        renderAll(SNIPPETS[0]);
        return;
    }

    (async () => {
        for (let n = 0; alive; n = (n + 1) % SNIPPETS.length) {
            await typeSnippet(SNIPPETS[n]);
        }
    })();

    // Cursor parallax: far layers move less than near ones
    if (opts.finePointer) {
        const layers = Array.from(root.querySelectorAll<SVGGElement>('[data-layer]')).map((el) => ({
            depth: Number(el.dataset.depth ?? 10),
            x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
            y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' })
        }));
        window.addEventListener(
            'pointermove',
            (e) => {
                if (!visible) return;
                const px = e.clientX / innerWidth - 0.5;
                const py = e.clientY / innerHeight - 0.5;
                layers.forEach((l) => {
                    l.x(-px * l.depth);
                    l.y(-py * l.depth * 0.5);
                });
            },
            { passive: true }
        );
    }

    return () => {
        alive = false;
        io.disconnect();
    };
}

/* ========================================================================
   Desk scene: the monitor tells a small story of pairing with Claude Code.

     1. Urvil types a controller by hand           (editor, human speed)
     2. asks Claude Code to add retry with backoff (terminal: prompt, thinking,
                                                    tool calls, a diff, tests)
     3. reviews the change in the editor           (changed line highlighted)
     4. asks for a Kafka consumer                  (terminal)
     5. opens the new file                         (editor)

   His keystrokes are slow and uneven; Claude's output streams in fast, so
   it is always clear who is doing what. Everything waits while the scene is
   off screen or the tab is hidden.
   ======================================================================== */

import { gsap } from 'gsap';

/* ---------------- script ---------------- */

type Tok = { t: string; c: string; w?: number };

type EditorStep = { kind: 'type' | 'open'; tab: string; lines: string[]; highlight?: number[]; hold?: number };
type ClaudeLine =
    | { k: 'prompt'; t: string }
    | { k: 'think'; ms: number }
    | { k: 'tool'; name: string; arg: string }
    | { k: 'out'; t: string }
    | { k: 'add'; t: string }
    | { k: 'del'; t: string }
    | { k: 'say'; t: string }
    | { k: 'blank' };
type ClaudeStep = { kind: 'claude'; tab: string; lines: ClaudeLine[] };
type Step = EditorStep | ClaudeStep;

const CONTROLLER = [
    '@RestController',
    'class TelemetryController {',
    '',
    '  private final VehicleService vehicles;',
    '',
    '  @GetMapping("/vehicles/{id}/events")',
    '  Flux<Event> stream(@PathVariable String id) {',
    '    return vehicles.events(id)',
    '        .filter(Event::isCritical)',
    '        .retry(3);',
    '  }',
    '}'
];
const CONTROLLER_AFTER = CONTROLLER.map((l) =>
    l === '        .retry(3);' ? '        .retryWhen(Retry.backoff(3, ofMillis(200)));' : l
);

const CONSUMER = [
    '@Component',
    'class EventConsumer {',
    '',
    '  @KafkaListener(topics = "vehicle.events")',
    '  void onEvent(Event event, Acknowledgment ack) {',
    '    if (!seen.add(event.id())) {',
    '      ack.acknowledge();',
    '      return;',
    '    }',
    '    store.save(event);',
    '    ack.acknowledge();',
    '  }',
    '}'
];

const STORY: Step[] = [
    { kind: 'type', tab: 'TelemetryController.java', lines: CONTROLLER },
    {
        kind: 'claude',
        tab: 'claude — telemetry',
        lines: [
            { k: 'prompt', t: 'add retry with backoff to the event stream' },
            { k: 'blank' },
            { k: 'think', ms: 1800 },
            { k: 'tool', name: 'Read', arg: 'TelemetryController.java' },
            { k: 'out', t: '⎿  Read 12 lines' },
            { k: 'tool', name: 'Update', arg: 'TelemetryController.java' },
            { k: 'del', t: '-        .retry(3);' },
            { k: 'add', t: '+        .retryWhen(Retry.backoff(3, ofMillis(200)));' },
            { k: 'tool', name: 'Bash', arg: './mvnw test' },
            { k: 'out', t: '⎿  Tests run: 42, Failures: 0' },
            { k: 'blank' },
            { k: 'say', t: 'Done. The stream now retries with backoff.' }
        ]
    },
    { kind: 'open', tab: 'TelemetryController.java', lines: CONTROLLER_AFTER, highlight: [9], hold: 3600 },
    {
        kind: 'claude',
        tab: 'claude — telemetry',
        lines: [
            { k: 'prompt', t: 'write a Kafka consumer that skips duplicates' },
            { k: 'blank' },
            { k: 'think', ms: 2200 },
            { k: 'tool', name: 'Write', arg: 'EventConsumer.java' },
            { k: 'out', t: '⎿  Wrote 13 lines to EventConsumer.java' },
            { k: 'tool', name: 'Bash', arg: './mvnw test' },
            { k: 'out', t: '⎿  Tests run: 44, Failures: 0' },
            { k: 'blank' },
            { k: 'say', t: 'Added EventConsumer. Duplicates are acked, not saved.' }
        ]
    },
    { kind: 'open', tab: 'EventConsumer.java', lines: CONSUMER, highlight: [5, 6, 7, 8], hold: 3600 }
];

/* ---------------- colours ---------------- */

const C = {
    plain: '#d6deeb',
    keyword: '#c792ea',
    annotation: '#ffcb6b',
    string: '#c3e88d',
    type: '#ff8a8a',
    number: '#f78c6c',
    punct: '#89ddff',
    // Claude Code terminal
    claude: '#d97757',
    promptMark: '#8a93a3',
    user: '#eef1f5',
    ok: '#5be3b0',
    toolName: '#eef1f5',
    toolArg: '#9aa6b6',
    muted: '#7f8a9a',
    addText: '#7ee2b8',
    delText: '#ff9a9a',
    addBg: 'rgba(46, 160, 67, 0.2)',
    delBg: 'rgba(248, 81, 73, 0.2)',
    editBg: 'rgba(91, 227, 176, 0.1)'
};

const KEYWORDS = new Set(['return', 'private', 'final', 'class', 'public', 'new', 'static', 'void', 'if', 'else']);

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

/* ---------------- layout ---------------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
const Y0 = 209;          // first baseline
const LH = 12.4;         // line height
const CW = 8.5 * 0.6;    // monospace advance at 8.5px
const X_EDITOR = 192;
const X_TERM = 170;
const SPINNER = ['·', '✢', '✳', '∗', '✻', '✽', '✻', '∗', '✳', '✢'];

export function initScene(root: HTMLElement, opts: { reduced: boolean; finePointer: boolean }) {
    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);
    const code = $<SVGGElement>('[data-code]');
    const bg = $<SVGGElement>('[data-codebg]');
    const gutter = $<SVGGElement>('[data-gutter]');
    const caret = $<SVGRectElement>('[data-caret]');
    const tab = $<SVGTextElement>('[data-tab]');
    const tabDot = $<SVGCircleElement>('[data-tabdot]');
    const status = $<SVGTextElement>('[data-status]');
    const person = $<SVGGElement>('[data-person]');
    if (!code || !bg || !gutter || !caret || !tab || !status) return;

    let alive = true;
    let visible = true;
    let wake: (() => void) | null = null;
    let x0 = X_EDITOR;

    // Waits pause (never skip) while hidden, so the story resumes mid-line
    const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
            const start = () => setTimeout(resolve, ms);
            if (visible && !document.hidden) start();
            else
                wake = () => {
                    wake = null;
                    start();
                };
        });

    const setVisible = (v: boolean) => {
        visible = v;
        root.classList.toggle('is-paused', !v || document.hidden);
        if (v && !document.hidden && wake) wake();
    };
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(root);
    document.addEventListener('visibilitychange', () => setVisible(visible));

    /* ----- drawing helpers ----- */

    const baseline = (row: number) => Y0 + row * LH;

    const moveCaret = (row: number, col: number) => {
        caret.setAttribute('x', String(x0 + col * CW));
        caret.setAttribute('y', String(baseline(row) - 8.5));
    };
    const showCaret = (on: boolean) => caret.setAttribute('visibility', on ? 'visible' : 'hidden');

    const clear = () => {
        code.replaceChildren();
        bg.replaceChildren();
        gutter.replaceChildren();
    };

    const setMode = (mode: 'editor' | 'claude', title: string) => {
        x0 = mode === 'editor' ? X_EDITOR : X_TERM;
        tab.textContent = title;
        tabDot?.setAttribute('fill', mode === 'editor' ? '#ffb454' : C.claude);
        status.textContent = mode === 'editor' ? 'Java · UTF-8' : 'Claude Code';
        gutter.setAttribute('visibility', mode === 'editor' ? 'visible' : 'hidden');
    };

    const lineNumber = (row: number) => {
        const n = document.createElementNS(SVG_NS, 'text');
        n.setAttribute('x', String(X_EDITOR - 8));
        n.setAttribute('y', String(baseline(row)));
        n.setAttribute('text-anchor', 'end');
        n.textContent = String(row + 1);
        gutter.appendChild(n);
    };

    const textRow = (row: number) => {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', String(x0));
        t.setAttribute('y', String(baseline(row)));
        code.appendChild(t);
        return t;
    };

    const span = (parent: SVGTextElement, tok: Tok, text = tok.t) => {
        const s = document.createElementNS(SVG_NS, 'tspan');
        s.setAttribute('fill', tok.c);
        if (tok.w) s.setAttribute('font-weight', String(tok.w));
        s.textContent = text;
        parent.appendChild(s);
        return s;
    };

    const fillRow = (row: number, color: string, bar?: string) => {
        const r = document.createElementNS(SVG_NS, 'rect');
        r.setAttribute('x', '162');
        r.setAttribute('y', String(baseline(row) - 9.2));
        r.setAttribute('width', '316');
        r.setAttribute('height', String(LH));
        r.setAttribute('fill', color);
        bg.appendChild(r);
        if (bar) {
            const b = document.createElementNS(SVG_NS, 'rect');
            b.setAttribute('x', '162');
            b.setAttribute('y', String(baseline(row) - 9.2));
            b.setAttribute('width', '2');
            b.setAttribute('height', String(LH));
            b.setAttribute('fill', bar);
            bg.appendChild(b);
        }
    };

    const promptBox = (row: number) => {
        const r = document.createElementNS(SVG_NS, 'rect');
        r.setAttribute('x', '166');
        r.setAttribute('y', String(baseline(row) - 10));
        r.setAttribute('width', '306');
        r.setAttribute('height', '14');
        r.setAttribute('rx', '3');
        r.setAttribute('fill', 'none');
        r.setAttribute('stroke', '#5a6070');
        r.setAttribute('stroke-width', '0.8');
        bg.appendChild(r);
        return r;
    };

    /** Human typing: uneven, with arms tapping. */
    async function typeTokens(row: number, text: SVGTextElement, toks: Tok[], startCol = 0, skipIndent = true) {
        const indent = skipIndent ? (toks[0]?.t.match(/^\s*/)?.[0].length ?? 0) : 0;
        let col = startCol;
        root.classList.add('is-typing');
        for (const tok of toks) {
            const s = span(text, tok, '');
            for (let k = 1; k <= tok.t.length && alive; k++) {
                s.textContent = tok.t.slice(0, k);
                col++;
                moveCaret(row, col);
                if (col - startCol <= indent) continue;
                await sleep(24 + Math.random() * 50);
            }
        }
        root.classList.remove('is-typing');
    }

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

    const renderFile = (lines: string[], highlight: number[] = []) => {
        lines.forEach((line, row) => {
            lineNumber(row);
            if (highlight.includes(row)) fillRow(row, C.editBg, C.ok);
            const t = textRow(row);
            tokenizeJava(line).forEach((tok) => span(t, tok));
        });
    };

    /* ----- editor ----- */

    async function runEditor(step: EditorStep) {
        clear();
        setMode('editor', step.tab);
        showCaret(true);

        if (step.kind === 'open') {
            // Claude wrote this: it appears at once, with the changes marked
            renderFile(step.lines, step.highlight);
            const last = step.highlight?.[step.highlight.length - 1] ?? 0;
            moveCaret(last, step.lines[last].length);
            beat('is-thinking', 1600); // reading it over
            await sleep(step.hold ?? 3000);
            leanBack();
            await sleep(2200);
            return;
        }

        for (let row = 0; row < step.lines.length && alive; row++) {
            lineNumber(row);
            const t = textRow(row);
            moveCaret(row, 0);
            const line = step.lines[row];
            if (!line) {
                await sleep(90);
                continue;
            }
            await typeTokens(row, t, tokenizeJava(line));
            if (Math.random() < 0.2) {
                beat('is-thinking', 1600);
                await sleep(1400);
            } else {
                await sleep(140 + Math.random() * 220);
            }
        }
        await sleep(1400);
    }

    /* ----- Claude Code ----- */

    async function runClaude(step: ClaudeStep) {
        clear();
        setMode('claude', step.tab);
        let row = 0;

        for (const line of step.lines) {
            if (!alive) return;
            switch (line.k) {
                case 'prompt': {
                    // He types the request into the input box
                    const box = promptBox(row);
                    const t = textRow(row);
                    span(t, { t: '> ', c: C.promptMark });
                    showCaret(true);
                    moveCaret(row, 2);
                    await sleep(500);
                    await typeTokens(row, t, [{ t: line.t, c: C.user }], 2, false);
                    await sleep(450);
                    // Enter: the box becomes a sent message
                    box.remove();
                    fillRow(row, 'rgba(255,255,255,0.05)');
                    showCaret(false);
                    row++;
                    break;
                }
                case 'think': {
                    const t = textRow(row);
                    const glyph = span(t, { t: SPINNER[0], c: C.claude });
                    span(t, { t: ' Thinking… ', c: C.claude });
                    span(t, { t: '(esc to interrupt)', c: C.muted });
                    beat('is-thinking', line.ms);
                    const frames = Math.round(line.ms / 110);
                    for (let i = 0; i < frames && alive; i++) {
                        glyph.textContent = SPINNER[i % SPINNER.length];
                        await sleep(110);
                    }
                    t.remove(); // output takes the spinner's place
                    break;
                }
                case 'tool': {
                    const t = textRow(row);
                    span(t, { t: '● ', c: C.ok });
                    span(t, { t: line.name, c: C.toolName, w: 600 });
                    span(t, { t: `(${line.arg})`, c: C.toolArg });
                    row++;
                    await sleep(420 + Math.random() * 260);
                    break;
                }
                case 'out': {
                    const t = textRow(row);
                    span(t, { t: '  ' + line.t, c: C.muted });
                    row++;
                    await sleep(260);
                    break;
                }
                case 'add':
                case 'del': {
                    fillRow(row, line.k === 'add' ? C.addBg : C.delBg);
                    const t = textRow(row);
                    span(t, { t: '  ' + line.t, c: line.k === 'add' ? C.addText : C.delText });
                    row++;
                    await sleep(220);
                    break;
                }
                case 'say': {
                    // Claude's reply streams in word by word, much faster than typing
                    const t = textRow(row);
                    span(t, { t: '● ', c: C.user });
                    const s = span(t, { t: '', c: C.user });
                    const words = line.t.split(' ');
                    for (let i = 0; i < words.length && alive; i++) {
                        s.textContent = words.slice(0, i + 1).join(' ');
                        await sleep(55);
                    }
                    row++;
                    break;
                }
                case 'blank':
                    row++;
                    break;
            }
        }

        // Ready for the next request
        row++;
        promptBox(row);
        const t = textRow(row);
        span(t, { t: '> ', c: C.promptMark });
        showCaret(true);
        moveCaret(row, 2);
        await sleep(2400);
    }

    /* ----- run ----- */

    if (opts.reduced) {
        // One still frame that tells the whole story: the reviewed change
        const s = STORY[2] as EditorStep;
        setMode('editor', s.tab);
        renderFile(s.lines, s.highlight);
        showCaret(false);
        return;
    }

    (async () => {
        for (let i = 0; alive; i = (i + 1) % STORY.length) {
            const step = STORY[i];
            if (step.kind === 'claude') await runClaude(step);
            else await runEditor(step);
        }
    })();

    /* ----- cursor parallax: far layers move less than near ones ----- */
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

/* ========================================================================
   Flux field — the hero background.
   A domain-warped noise field drawn as flowing contour lines, a quiet
   nod to streams and FluxStack. The cursor parts the lines like a finger
   through water. Raw WebGL2 (~2 KB) instead of Three.js (~150 KB): it is
   one full-screen triangle and one fragment shader.
   ======================================================================== */

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_calm;    // < 1 on narrow screens, where type spans the full width
uniform float u_ink;     // line strength: stronger on light backgrounds
uniform vec3  u_bg;
uniform vec3  u_line;
uniform vec3  u_accent;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = frag / u_res.y;
    vec2 m  = u_mouse / u_res.y;
    float t = u_time * 0.045;

    vec2 q = vec2(fbm(uv * 1.3 + vec2(0.0, t)), fbm(uv * 1.3 + vec2(5.2, -t)));

    vec2 dm = uv - m;
    float d2 = dot(dm, dm);
    vec2 push = dm * exp(-d2 * 14.0) * 0.9;

    float f = fbm(uv * 1.15 + q * 1.7 + push + vec2(t * 1.6, 0.0));

    float bands = f * 20.0;
    float edge  = 0.5 - abs(fract(bands) - 0.5);
    float w     = max(fwidth(bands), 0.0001) * 1.15;
    float line  = 1.0 - smoothstep(0.0, w, edge);

    float band = floor(bands);
    float hot  = smoothstep(0.62, 0.9, noise(vec2(band * 0.73, t * 5.0)));
    float near = exp(-d2 * 10.0);

    // Keep the left and bottom calm where the type sits
    float xN = frag.x / u_res.x, yN = frag.y / u_res.y;
    float mask = smoothstep(0.0, 0.45, yN) * mix(0.12, 1.0, smoothstep(0.12, 0.8, xN)) * u_calm;

    float lineI = line * mask * (0.42 + near * 0.5);
    float accI  = line * mask * max(hot, near * 0.6);

    vec3 col = u_bg;
    col = mix(col, u_line, clamp(lineI, 0.0, 1.0) * u_ink);
    col = mix(col, u_accent, clamp(accI, 0.0, 1.0) * 0.85);
    o = vec4(col, 1.0);
}`;

type RGB = [number, number, number];

const readColor = (name: string): RGB => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const probe = document.createElement('span');
    probe.style.color = v;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    probe.remove();
    return [c[0] / 255, c[1] / 255, c[2] / 255];
};

const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export type Flux = {
    /** Re-read theme colours. `instant` skips the ease so a view-transition snapshot is correct. */
    retheme(instant?: boolean): void;
    destroy(): void;
};

export function initFlux(canvas: HTMLCanvasElement, opts: { reduced: boolean }): Flux | null {
    const gl = canvas.getContext('webgl2', {
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: true
    });
    if (!gl) {
        canvas.remove();
        return null;
    }

    const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
        return s;
    };

    let prog: WebGLProgram;
    try {
        prog = gl.createProgram()!;
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (err) {
        console.warn('flux: falling back to CSS', err);
        canvas.remove();
        return null;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
        res: U('u_res'),
        time: U('u_time'),
        mouse: U('u_mouse'),
        calm: U('u_calm'),
        ink: U('u_ink'),
        bg: U('u_bg'),
        line: U('u_line'),
        accent: U('u_accent')
    };

    const read = () => ({ bg: readColor('--bg'), line: readColor('--muted'), accent: readColor('--accent') });
    const cur = read();
    let target = read();

    let dpr = 1;
    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = Math.round(canvas.clientWidth * dpr);
        const h = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
    };

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) * dpr;
        mouse.ty = (r.height - (e.clientY - r.top)) * dpr;
        if (mouse.x < -999) {
            mouse.x = mouse.tx;
            mouse.y = mouse.ty;
        }
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) loop();
    });
    io.observe(canvas);

    let raf = 0;
    const t0 = performance.now();
    let running = false;

    const lerp3 = (a: RGB, b: RGB, k: number) => {
        for (let i = 0; i < 3; i++) a[i] += (b[i] - a[i]) * k;
    };

    const draw = (now: number) => {
        resize();
        lerp3(cur.bg, target.bg, 0.12);
        lerp3(cur.line, target.line, 0.12);
        lerp3(cur.accent, target.accent, 0.12);
        mouse.x += (mouse.tx - mouse.x) * 0.08;
        mouse.y += (mouse.ty - mouse.y) * 0.08;

        const light = luminance(cur.bg) > 0.5;
        gl.uniform2f(u.res, canvas.width, canvas.height);
        gl.uniform1f(u.time, opts.reduced ? 12 : (now - t0) / 1000);
        gl.uniform2f(u.mouse, mouse.x, mouse.y);
        gl.uniform1f(u.calm, canvas.clientWidth < 700 ? 0.5 : 1);
        gl.uniform1f(u.ink, light ? 0.42 : 0.32);
        gl.uniform3fv(u.bg, cur.bg);
        gl.uniform3fv(u.line, cur.line);
        gl.uniform3fv(u.accent, cur.accent);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const settled = () => Math.abs(cur.bg[0] - target.bg[0]) < 0.002;

    const loop = () => {
        if (running) return;
        running = true;
        const tick = (now: number) => {
            if (!visible || document.hidden) {
                running = false;
                return;
            }
            draw(now);
            // Reduced motion: finish any colour change, then hold a still frame
            if (opts.reduced && settled()) {
                running = false;
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
    };

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) loop();
    });
    window.addEventListener('resize', () => {
        if (!running) draw(performance.now());
    });

    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 1.6s cubic-bezier(0.16,1,0.3,1)';
    requestAnimationFrame(() => {
        canvas.style.opacity = '1';
    });
    loop();

    return {
        retheme(instant = false) {
            target = read();
            if (instant) {
                cur.bg = [...target.bg] as RGB;
                cur.line = [...target.line] as RGB;
                cur.accent = [...target.accent] as RGB;
                draw(performance.now());
            }
            loop();
        },
        destroy() {
            cancelAnimationFrame(raf);
            io.disconnect();
            window.removeEventListener('pointermove', onMove);
        }
    };
}

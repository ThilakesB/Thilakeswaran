/**
 * =========================================================================
 * WELCOME INTRO SCREEN - TYPE GARDEN GENERATIVE BOTANICAL ANIMATION
 * Displays on initial page load for 6 seconds before smoothly revealing
 * the main portfolio website.
 * Based on Type Garden by Akshat Agarwal
 * =========================================================================
 */

(function () {
  'use strict';

  // 1. CONFIGURATION
  const INTRO_DURATION_MS = 5000; // 5 seconds total intro time

  const CONFIG = {
    // Phrase to auto-type
    PHRASES: [
      "Thilakeswaran B"
    ],

    // Black & White Monochrome Palette matching portfolio theme
    COLORS: {
      TEXT: "#FFFFFF",    // Crisp white typography
      FLOWER: "#F4F4F6",  // Luminous porcelain/silver rose petals
      STEM: "#7B7B85",    // Sleek graphite/monochrome stems & leaves
      LINE: "#111113",    // Deep black spiral line engravings on petals
      VEIN: "transparent" // Transparent cutouts for leaf veins
    },

    // Growth & visual tuning
    DENSITY: 1.0,         // Garden density multiplier (0.6 - 1.4)
    BOIL: true,           // 120ms organic jitter
    RECOIL: 20,           // Tendril cut recoil

    // Auto-typing timings (in milliseconds)
    // Finishes typing in ~2.2s, then holds in full bloom until the 6s transition
    TIMING: {
      CHAR_MIN_DELAY: 90,     // Fastest human keystroke
      CHAR_MAX_DELAY: 170,    // Slowest human keystroke
      SPACE_EXTRA_DELAY: 120, // Natural pause after a space
      HOLD_DURATION: 10000,   // Hold full bloom throughout intro
      WITHER_STEP_DELAY: 85,
      WITHER_FADE_MS: 260,
      BETWEEN_PHRASES_MS: 400
    },

    // Typography
    FONT_FAMILY: '"Playfair Display", Georgia, serif',
    FONT_WEIGHT: 700
  };

  // 2. DOM ELEMENTS
  const welcomeScreen = document.getElementById('welcome-screen');
  const canvas = document.getElementById('tg-canvas');
  const skipBtn = document.getElementById('skip-welcome-btn');
  const timerBadge = document.getElementById('welcome-timer-badge');

  if (!welcomeScreen || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 3. INTERNAL ENGINE STATE
  let letters = [];
  let uid = 1;
  const fontCache = {};
  let Sd = 0;       // Smooth font size
  let St = 0;       // Target font size
  let cx = 0, cy = 0;
  let ctx_ = 0, cty = 0;
  let wrapped = false;
  let W = 0, H = 0, dpr = 1;
  let lastKeyTime = 0;
  let t0 = performance.now();
  let rafId = null;
  let typeTimerId = null;
  let isVisible = true;
  let isRunning = false;
  let currentPhraseIdx = 0;
  let currentCharIdx = 0;
  let autoState = 'TYPING';
  let mouseX = null, mouseY = null;
  const fa = {};
  const rand = Math.random;
  let isDismissed = false;
  let countdownTimerId = null;
  let autoDismissTimerId = null;

  // Math utilities matching original Type Garden
  const h = n => {
    const x = Math.sin(n) * 43758.5453;
    return x - Math.floor(x);
  };

  const spr = (t, k = 7, w = 16) => {
    if (t <= 0) return 0;
    return 1 - Math.exp(-t * k) * Math.cos(t * w);
  };

  const eo = t => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.pow(1 - t, 3);
  };

  const rng = seed => {
    let s = seed | 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const bez = (a, b, c, d, n) => {
    const P = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      P.push([
        u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t*t*t*d[0],
        u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t*t*t*d[1]
      ]);
    }
    return P;
  };

  const at = (P, u) => {
    const n = P.length;
    const i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
    return [P[i], Math.atan2(P[i+1][1] - P[i-1][1], P[i+1][0] - P[i-1][0])];
  };

  const jit = (id, f, amp) => {
    if (!amp) return [0, 0, 0];
    return [
      (h(id * 1.37 + f * 7.13) * 2 - 1) * amp,
      (h(id * 2.71 + f * 3.11) * 2 - 1) * amp,
      (h(id * 5.3 + f * 1.7) * 2 - 1) * 0.035
    ];
  };

  const path = (c, p, closed) => {
    const n = p.length;
    if (n < 2) return;
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) {
      const s = m(p[n - 1], p[0]);
      c.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) {
        const q = m(p[i], p[(i + 1) % n]);
        c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]);
      }
      c.closePath();
    } else {
      c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const q = m(p[i], p[i + 1]);
        c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]);
      }
      c.lineTo(p[n - 1][0], p[n - 1][1]);
    }
  };

  const backend = g => ({
    fill: (p, col) => {
      g.beginPath();
      path(g, p, true);
      g.fillStyle = col;
      g.fill();
    },
    stroke: (p, col, w) => {
      g.beginPath();
      path(g, p, false);
      g.strokeStyle = col;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.stroke();
    },
    rect: (x, y, w, h, col) => {
      g.fillStyle = col;
      g.fillRect(x, y, w, h);
    },
    text: (ch, x, y, S, col) => {
      g.font = `${CONFIG.FONT_WEIGHT} ${S}px ${CONFIG.FONT_FAMILY}`;
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillStyle = col;
      g.fillText(ch, x, y);
    }
  });

  const vine = (base, dir, len, amp, waves, ph, bend, n = 40) => {
    const P = [[base[0], base[1]]];
    const step = len / n;
    let x = base[0], y = base[1];
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const a = dir + bend * u + amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      P.push([x, y]);
    }
    return P;
  };

  const curl = (P, sign, rad) => {
    const n = P.length, e = P[n - 1];
    const a = Math.atan2(e[1] - P[n - 2][1], e[0] - P[n - 2][0]);
    const c = [e[0] - Math.sin(a) * sign * rad, e[1] + Math.cos(a) * sign * rad];
    const a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
    for (let i = 1; i <= 14; i++) {
      const u = i / 14, t = a0 + sign * u * Math.PI * 1.6, rr = rad * (1 - 0.5 * u);
      P.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]);
    }
    return P;
  };

  const weave = (r, startLayer) => {
    const cuts = [];
    const nc = 1 + Math.floor(r() * 3);
    for (let i = 0; i < nc; i++) cuts.push(0.15 + r() * 0.7);
    cuts.sort((a, b) => a - b);
    const segs = [];
    let u0 = 0, layer = startLayer;
    for (const c of cuts) {
      if (c <= u0) continue;
      segs.push({ u0, u1: c, layer });
      if (r() < 0.3) {
        const gap = 0.02 + r() * 0.03;
        u0 = Math.min(0.98, c + gap);
      } else {
        u0 = c;
      }
      layer = 1 - layer;
    }
    segs.push({ u0, u1: 1, layer });
    return segs;
  };

  const layerAt = (segs, u) => {
    for (const s of segs) {
      if (u >= s.u0 && u <= s.u1) return s.layer;
    }
    return segs[segs.length - 1].layer;
  };

  // Pointer leaning
  const near = (x, y) => {
    if (mouseX == null || mouseY == null) return null;
    return [mouseX, mouseY];
  };

  const faceTurn = (e, x, y) => {
    let wx = 0, wy = 0;
    const A = near(x, y);
    if (A) {
      const dx = A[0] - x, dy = A[1] - y, d = Math.hypot(dx, dy), reach = 300;
      if (d < reach && d > 0.001) {
        const w = 1 - d / reach, s = w * w * (3 - 2 * w) * Math.min(1, d / 40);
        wx = dx / d * s;
        wy = dy / d * s;
      }
    }
    const c = fa[e.id] || [0, 0];
    c[0] += (wx - c[0]) * 0.09;
    c[1] += (wy - c[1]) * 0.09;
    fa[e.id] = c;
    return c;
  };

  // Layout & text measurement
  const mw = ch => {
    if (fontCache[ch] != null) return fontCache[ch];
    ctx.font = `${CONFIG.FONT_WEIGHT} 100px ${CONFIG.FONT_FAMILY}`;
    let w = ctx.measureText(ch).width / 100;
    if (ch === ' ') w *= 1.4;
    return (fontCache[ch] = w);
  };

  const layoutCore = (A, width, height, prevWrapped) => {
    const maxW = width * 0.82;
    const S0 = height * 0.28;
    const LH = 2.1;
    const ws = A.map(l => mw(l.ch));
    const words = [];
    let cur = null;
    A.forEach((l, i) => {
      if (l.ch === ' ') {
        if (cur) { words.push(cur); cur = null; }
        words.push({ sp: true, idx: [i] });
      } else {
        if (!cur) cur = { idx: [] };
        cur.idx.push(i);
      }
    });
    if (cur) words.push(cur);

    const lineW = (li, S) => {
      let e = li.length;
      while (e > 0 && A[li[e - 1]].ch === ' ') e--;
      let w = 0;
      for (let k = 0; k < e; k++) w += ws[li[k]];
      return w * S;
    };

    const wrap = S => {
      const lines = [[]];
      let lw = 0;
      for (const w of words) {
        const ww = w.idx.reduce((s, i) => s + ws[i], 0) * S;
        if (!w.sp && lw > 0 && lw + ww > maxW) {
          lines.push([]);
          lw = 0;
        }
        lines[lines.length - 1].push(...w.idx);
        lw += ww;
      }
      return lines;
    };

    let lines = [A.map((_, i) => i)];
    const unit = lineW(lines[0], 1);
    let S = unit > 0 ? Math.min(S0, maxW / unit) : S0;
    const multi = words.filter(w => !w.sp).length > 1;
    let isWrapped = multi && (S < height * 0.1 || (prevWrapped && S < height * 0.14));

    if (isWrapped) {
      let lo = height * 0.03, hi = height * 0.15;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        const ls = wrap(mid);
        const ok = ls.every(li => lineW(li, mid) <= maxW) && ls.length * LH * mid <= height * 0.82;
        if (ok) lo = mid; else hi = mid;
      }
      S = lo;
      lines = wrap(S);
      if (lines.length < 2) isWrapped = false;
    }

    const n = lines.length;
    const lh = LH * S;
    lines.forEach((li, k) => {
      let x = width / 2 - lineW(li, S) / 2;
      const y = height / 2 + (k - (n - 1) / 2) * lh + 0.33 * S;
      li.forEach(i => {
        const l = A[i];
        const w = ws[i] * S;
        l.tx = x + w / 2;
        l.ty = y;
        l.tw = w;
        l.line = k;
        x += w;
      });
    });

    return { S, wrapped: isWrapped, n };
  };

  const layout = snap => {
    if (!W || !H) return;
    const A = letters.filter(l => !l.dead);
    const res = layoutCore(A, W, H, wrapped);
    wrapped = res.wrapped;
    A.forEach(l => {
      if (l.x == null) { l.x = l.tx; l.y = l.ty; }
    });
    const S = res.S;
    const last = A[A.length - 1];
    St = S;
    ctx_ = last ? last.tx + last.tw / 2 + 0.07 * S : W / 2;
    cty = last ? last.ty - 0.33 * S : H / 2;
    if (snap || !Sd) {
      Sd = S;
      cx = ctx_;
      cy = cty;
      A.forEach(l => { l.x = l.tx; l.y = l.ty; });
    }
  };

  const resize = () => {
    const r = welcomeScreen.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    layout(true);
  };

  // Garden Generative Growth
  const wordParams = ws => {
    const r = rng(ws * 7 + 13);
    const dens = CONFIG.DENSITY;
    return {
      roseP: 0.3 + r() * 0.3,
      leafy: (0.6 + r() * 0.8) * dens,
      dens,
      lean: (r() - 0.5) * 0.6,
      big: 0.85 + r() * 0.45,
      curvy: 0.8 + r() * 0.6,
      bridgeP: Math.min(0.95, (0.45 + r() * 0.35) * dens),
      w: 0.5
    };
  };

  const grow = (r, E, nid, p, o) => {
    const tip = o.tip || (r() < p.roseP ? 'rose' : r() < 0.45 ? 'fan' : r() < 0.6 ? 'leaf' : 'curl');
    let P = o.pts || vine(o.base, o.dir, o.len, (0.35 + r() * 0.45) * p.curvy, 1 + r() * 1.6, r() * 6.28, (r() - 0.5) * 1.2, 40);
    if (tip === 'curl') P = curl(P, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);
    const segs = weave(r, o.layer0 != null ? o.layer0 : (r() < 0.5 ? 0 : 1));
    const dur = Math.max(320, (o.len || 0.8) * 620);
    const thorns = [];
    const nt = Math.floor(r() * 2.5);
    for (let i = 0; i < nt; i++) thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });
    E.push({ t: 'stem', id: nid(), pts: P, segs, d0: o.d0, dur, w: o.depth ? 0.82 : 1, thorns });

    const nl = Math.floor(r() * 2.8 * p.leafy);
    let sd = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < nl; i++) {
      const u = 0.25 + r() * 0.6, [q, a] = at(P, u);
      sd = -sd;
      E.push({
        t: 'leaf',
        id: nid(),
        x: q[0],
        y: q[1],
        a: a + sd * (0.55 + r() * 0.5),
        L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1),
        bend: (r() - 0.5) * 1.2,
        layer: layerAt(segs, u),
        d0: o.d0 + dur * u
      });
    }

    const [tp, ta] = at(P, 1);
    const td = o.d0 + dur * 0.8;
    const tl = layerAt(segs, 1);

    if (tip === 'rose') {
      const R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
      const over = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
      const layer = over ? (r() < 0.22 ? 1 : 0) : (r() < 0.6 ? 1 : tl);
      E.push({
        t: 'rose',
        id: nid(),
        x: tp[0],
        y: tp[1],
        R,
        rot: (r() - 0.5) * 1.0,
        ph1: r() * 6.28,
        ph2: r() * 6.28,
        turns: 1.8 + r() * 1,
        layer,
        d0: td
      });
      if (r() < 0.2) {
        const oo = ta + (r() < 0.5 ? 1 : -1) * 1.3;
        E.push({
          t: 'rose',
          id: nid(),
          x: tp[0] + Math.cos(oo) * R * 1.4,
          y: tp[1] + Math.sin(oo) * R * 1.4,
          R: R * (0.6 + r() * 0.3),
          rot: (r() - 0.5) * 1.2,
          ph1: r() * 6.28,
          ph2: r() * 6.28,
          turns: 1.8 + r(),
          layer,
          d0: td + 120
        });
      }
    } else if (tip === 'fan') {
      const spread = 0.6 + r() * 0.3;
      for (let j = 0; j < 2; j++) {
        E.push({
          t: 'leaf',
          id: nid(),
          x: tp[0],
          y: tp[1],
          a: ta + (j - 0.5) * spread,
          L: 0.2 + r() * 0.2,
          bend: (j - 0.5) * 0.8,
          layer: tl,
          d0: td + j * 60
        });
      }
    } else if (tip === 'leaf') {
      E.push({
        t: 'leaf',
        id: nid(),
        x: tp[0],
        y: tp[1],
        a: ta + (r() - 0.5) * 0.3,
        L: 0.16 + r() * 0.16,
        bend: (r() - 0.5),
        layer: tl,
        d0: td
      });
    }

    if (!o.depth && r() < 0.3) {
      const u = 0.35 + r() * 0.35, [q, a] = at(P, u);
      grow(r, E, nid, p, {
        base: q,
        dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4),
        len: (o.len || 0.8) * (0.35 + r() * 0.2),
        d0: o.d0 + dur * u,
        depth: 1,
        layer0: layerAt(segs, u)
      });
    }
    return P;
  };

  const gen = l => {
    const r = rng((l.ws ^ Math.imul(l.wi + 1, 2654435761)) + Math.floor(rand() * 1e6));
    const p = wordParams(l.ws);
    const E = [];
    let k0 = 0;
    const nid = () => l.id * 100 + (k0++);
    const w = mw(l.ch);
    const inX = () => (r() - 0.5) * w * 0.7;
    p.w = w;

    const nUp = 1 + (r() < 0.45 * p.dens ? 1 : 0);
    for (let i = 0; i < nUp; i++) {
      grow(r, E, nid, p, {
        base: [inX(), -r() * 0.3],
        dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7,
        len: 0.6 + r() * 0.5,
        d0: 40 + i * 130,
        tip: l.wi === 0 && i === 0 ? 'rose' : null
      });
    }

    if (r() < 0.4 * p.dens) {
      grow(r, E, nid, p, {
        base: [inX(), -0.1 - r() * 0.35],
        dir: Math.PI / 2 + (r() - 0.5) * 0.8,
        len: 0.35 + r() * 0.35,
        d0: 160
      });
    }

    if (l.prev && r() < p.bridgeP) {
      const px = -(mw(l.prev.ch) + w) / 2;
      const a = [inX(), -0.05 - r() * 0.55];
      const b = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
      const bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4);
      const dx = b[0] - a[0];
      let P = bez(a, [a[0] + dx * 0.15, a[1] + bulge], [b[0] - dx * 0.15, b[1] + bulge * 0.9], b, 40);
      if (r() < 0.45) P = P.slice(0, Math.floor(P.length * (0.7 + r() * 0.2)));
      grow(r, E, nid, p, {
        pts: P,
        len: Math.abs(dx) + Math.abs(bulge),
        d0: 90,
        tip: r() < 0.5 ? 'curl' : r() < 0.5 ? 'leaf' : 'rose'
      });
    }

    if (l.wi === 0) {
      grow(r, E, nid, p, {
        base: [-w * 0.3, -0.15 - r() * 0.4],
        dir: Math.PI + (r() - 0.5) * 1.2,
        len: 0.45 + r() * 0.3,
        d0: 120,
        tip: 'curl'
      });
    }

    l.els = E;
    l.endEls = null;

    const T = [];
    const tr = rng(l.id * 977 + Math.floor(rand() * 1e6));
    grow(tr, T, () => l.id * 100 + 90 + T.length, p, {
      base: [w * 0.25, -0.1 - tr() * 0.45],
      dir: (tr() - 0.5) * 1.4,
      len: 0.45 + tr() * 0.25,
      d0: 0,
      tip: 'curl',
      depth: 1
    });
    l.tend = T.filter(e => e.t === 'stem').slice(0, 1);
  };

  const genEnd = (l, rel) => {
    const r = rng(l.ws + l.wi * 31 + Math.floor(rand() * 1e6));
    const p = wordParams(l.ws);
    const E = [];
    let k0 = 50;
    const nid = () => l.id * 100 + (k0++);
    const w = mw(l.ch);
    const n = 1 + Math.floor(r() * 2.5);
    p.w = w;
    for (let i = 0; i < n; i++) {
      const dir = -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.4;
      grow(r, E, nid, p, {
        base: [(r() - 0.2) * w * 0.6, -r() * 0.5],
        dir,
        len: 0.4 + r() * 0.45,
        d0: rel + 40 + i * 90,
        depth: 1,
        tip: i === 0 || r() < 0.5 ? 'rose' : 'fan'
      });
    }
    l.endEls = E;
  };

  // Botanical rendering functions
  const strokeRange = (B, P, a, b, col, w) => {
    const n = P.length - 1, ia = a * n, ib = b * n;
    const lerp = t => {
      const i = Math.min(n - 1, Math.floor(t)), f = t - i;
      return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
    };
    const pts = [lerp(ia)];
    for (let i = Math.floor(ia) + 1; i < ib; i++) pts.push(P[i]);
    pts.push(lerp(ib));
    if (pts.length >= 2) B.stroke(pts, col, w);
  };

  const thorn = (B, P, u, s, S, blue) => {
    const [p, a] = at(P, u);
    const d = a + s * 2.3, L = S * 0.045;
    B.stroke([p, [p[0] + Math.cos(d) * L, p[1] + Math.sin(d) * L]], blue, S * 0.022);
  };

  const leaf = (B, bx, by, a, L, bend, colStem, colVein) => {
    if (L < 0.5) return;
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
    const ax = u => {
      const b = Math.sin(Math.PI * u) * bend * 0.15 * L;
      return [bx + ca * u * L + px * b, by + sa * u * L + py * b];
    };
    const hw = u => L * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8));
    const N = 12, s1 = [], s2 = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, c = ax(u), w = hw(u);
      s1.push([c[0] + px * w, c[1] + py * w]);
      s2.push([c[0] - px * w, c[1] - py * w]);
    }
    const tip = ax(1), base = ax(0);
    B.fill([base, ...s1.slice(1, N), tip, tip, ...s2.slice(1, N).reverse(), base], colStem);

    if (L > 6 && colVein) {
      const v = [];
      for (let i = 0; i <= 8; i++) v.push(ax(0.08 + 0.72 * i / 8));
      if (colVein === 'transparent') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        B.stroke(v, '#000000', Math.max(0.8, L * 0.03));
        ctx.restore();
      } else {
        B.stroke(v, colVein, Math.max(0.8, L * 0.03));
      }
    }
  };

  const rose = (B, cx, cy, R, rot, e, a, tl, colFlower, colLine) => {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const tm = tl ? Math.hypot(tl[0], tl[1]) : 0;
    const ux = tm ? tl[0] / tm : 0, uy = tm ? tl[1] / tm : 0;
    const sq = -0.28 * tm;
    const T = (x, y, z = 0) => {
      let dx = x * cr - y * sr, dy = x * sr + y * cr;
      if (tm) {
        const k = (dx * ux + dy * uy) * sq;
        dx += k * ux + tl[0] * R * z;
        dy += k * uy + tl[1] * R * z;
      }
      return [cx + dx, cy + dy];
    };

    const P = [
      [0, -0.36, 0.56, 0.54, 0, 0, 0],
      [-0.5, -0.06, 0.6, 0.6, -0.35, 0, 0],
      [0.52, -0.06, 0.6, 0.6, 0.35, 0, 0],
      [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
      [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
      [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0]
    ];
    const ax0 = 0, ay0 = 0.5;
    const lw = Math.max(0.8, R * 0.045);
    const st = 85;

    P.forEach((q, i) => {
      const s = spr((a - i * st) / 1000, 8, 14);
      if (s <= 0.001) return;
      const open = (1 - Math.min(1, s)) * (q[0] < 0 ? 0.5 : -0.5);
      const ang = q[4] + open, ca = Math.cos(ang), sa = Math.sin(ang);
      const pt = th => {
        const rr = 1 + 0.08 * Math.sin(3 * th + e.ph1 + i) + 0.04 * Math.sin(5 * th + e.ph2);
        const lx = Math.cos(th) * q[2] * rr, ly = Math.sin(th) * q[3] * rr;
        const px = q[0] + lx * ca - ly * sa, py = q[1] + lx * sa + ly * ca;
        return T((ax0 + (px - ax0) * s) * R, (ay0 + (py - ay0) * s) * R, q[5]);
      };
      const pts = [];
      for (let k = 0; k < 26; k++) pts.push(pt(k / 26 * Math.PI * 2));
      B.fill(pts, colFlower);
      if (q[6] && R >= 12 && s > 0.4) {
        const arc = [];
        for (let k = 0; k <= 14; k++) arc.push(pt(Math.PI * (1.18 + 0.64 * k / 14)));
        strokeRange(B, arc, 0, Math.min(1, (s - 0.4) / 0.5), colLine, lw * 0.8);
      }
    });

    const fr = eo((a - P.length * st - 80) / 520);
    if (fr > 0 && R > 3) {
      const sp = [], scl = [];
      const turns = R < 20 ? Math.min(e.turns, 1.3) : R < 32 ? e.turns * 0.8 : e.turns;
      for (let i = 0; i <= 70; i++) {
        const u = i / 70, th = e.ph1 + u * turns * Math.PI * 2;
        const rr = R * (0.08 + 0.57 * u);
        sp.push(T(Math.cos(th) * rr * 1.05, Math.sin(th) * rr * 0.72 - 0.12 * R, 0.34 - 0.24 * u));
      }
      strokeRange(B, sp, 0, fr, colLine, lw);
      if (R >= 14) {
        for (let i = 0; i <= 36; i++) {
          const u = i / 36;
          scl.push(T((-0.72 + 1.5 * u) * R, 0.36 * R + 0.16 * R * Math.abs(Math.sin(u * Math.PI * 3)), 0.18));
        }
        strokeRange(B, scl, 0, fr, colLine, lw);
      }
    }
  };

  const wpt = (l, x, y, now) => {
    if (l.birth != null && now != null) {
      const t = (now - l.birth) / 1000;
      if (t > 0 && t < 2.5) {
        const hh = Math.max(0, (l.y - y) / Sd);
        const dmp = Math.exp(-t * 3.2);
        const dir = (l.id % 2 ? 1 : -1);
        x += Sd * 0.07 * hh * dmp * Math.sin(t * 11) * dir;
        y += Sd * 0.035 * hh * dmp * Math.sin(t * 11 + 1.2);
      }
    }
    if (l.lean) {
      const hh = Math.min(2.5, Math.max(0, (l.y - y) / Sd));
      const f = hh * hh * 0.5 + hh * 0.5;
      x += l.lean[0] * Sd * 0.1 * f;
      y += l.lean[1] * Sd * 0.05 * f;
    }
    return [x, y];
  };

  const drawStem = (B, e, l, age, kk, f, amp, layer, frO, colStem, now) => {
    const fr = frO != null ? frO : eo((age - e.d0) / e.dur) * kk;
    if (fr <= 0) return;
    const j = jit(e.id, f, amp);
    const P = e.pts.map(p => wpt(l, l.x + p[0] * Sd + j[0], l.y + p[1] * Sd + j[1], now));
    for (const sg of e.segs) {
      if (sg.layer !== layer) continue;
      const b = Math.min(sg.u1, fr);
      if (b <= sg.u0) continue;
      strokeRange(B, P, sg.u0, b, colStem, Sd * 0.022 * (e.w || 1));
    }
    for (const th of e.thorns) {
      if (fr > th.u && layerAt(e.segs, th.u) === layer) {
        thorn(B, P, th.u, th.s, Sd, colStem);
      }
    }
  };

  const drawEl = (B, e, l, age, kk, f, amp, colStem, colVein, colFlower, colLine, now) => {
    const j = jit(e.id, f, amp);
    const wx = (x, y) => wpt(l, l.x + x * Sd + j[0], l.y + y * Sd + j[1], now);
    if (e.t === 'leaf') {
      const sc = spr((age - e.d0) / 1000, 7, 15) * kk;
      if (sc <= 0) return;
      const p = wx(e.x, e.y);
      leaf(B, p[0], p[1], e.a + j[2], e.L * Sd * sc, e.bend, colStem, colVein);
    } else if (e.t === 'rose') {
      const a = age - e.d0;
      if (a < 0 || kk <= 0.001) return;
      const p = wx(e.x, e.y);
      const tl = faceTurn(e, p[0], p[1]);
      rose(B, p[0], p[1], e.R * Sd * kk, e.rot + j[2] + (tl ? tl[0] * 0.22 : 0), e, a, tl, colFlower, colLine);
    }
  };

  const render = (B, now) => {
    const L = letters;
    const act = L.filter(l => !l.dead);
    const cols = CONFIG.COLORS;

    for (const l of L) {
      let tx = 0, ty = 0;
      const A = !l.dead && l.ch !== ' ' ? near(l.x, l.y - Sd * 0.6) : null;
      if (A) {
        const dx = A[0] - l.x, dy = A[1] - (l.y - Sd * 0.6);
        const d = Math.hypot(dx, dy), reach = Math.max(260, Sd * 3.2);
        if (d < reach && d > 1) {
          const w = 1 - d / reach, s = w * w * (3 - 2 * w);
          tx = dx / d * s;
          ty = dy / d * s;
        }
      }
      const c = l.lean || (l.lean = [0, 0]);
      c[0] += (tx - c[0]) * 0.07;
      c[1] += (ty - c[1]) * 0.07;
    }

    const f = CONFIG.BOIL ? Math.floor(now / 120) : 0;
    const amp = CONFIG.BOIL ? Math.max(0.8, Sd * 0.01) : 0;
    const kd = l => l.dead ? 1 - eo((now - l.dead) / CONFIG.TIMING.WITHER_FADE_MS) : 1;

    const draw = layer => {
      for (const l of L) {
        if (l.ch === ' ' || !l.els) continue;
        const age = now - l.birth;
        const kk = kd(l);
        const each = e => {
          if (e.t === 'stem') {
            drawStem(B, e, l, age, kk, f, amp, layer, null, cols.STEM, now);
          } else if (e.layer === layer) {
            drawEl(B, e, l, age, kk, f, amp, cols.STEM, cols.VEIN, cols.FLOWER, cols.LINE, now);
          }
        };
        l.els.forEach(each);
        if (l.endEls) l.endEls.forEach(each);

        const i = act.indexOf(l);
        const nx = i >= 0 ? act[i + 1] : null;
        if (l.tend && (l.dead || !nx || nx.ch === ' ')) {
          let fr = eo(((now - l.tb) - 150) / 450);
          if (l.cut != null) {
            fr *= 1 - eo((now - l.cut) / 150) * Math.min(0.85, CONFIG.RECOIL / (0.6 * Sd));
          }
          for (const e of l.tend) {
            drawStem(B, e, l, age, kk, f, amp, layer, fr * kk, cols.STEM, now);
          }
        }
      }
    };

    draw(0);

    for (const l of L) {
      if (l.ch !== ' ' && !l.dead) {
        B.text(l.ch, l.x, l.y, Sd, cols.TEXT);
      }
    }

    draw(1);
  };

  const paint = now => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const B = backend(ctx);
    render(B, now);

    const caretOn = now - lastKeyTime < 500 || Math.floor(now / 530) % 2 === 0;
    const hf = eo((now - t0) / 600);
    if (caretOn && hf > 0 && autoState !== 'WITHERING') {
      const h = 0.8 * Sd * hf;
      const w = Math.max(2, Sd * 0.03);
      B.rect(cx - w / 2, cy - h / 2, w, h, CONFIG.COLORS.TEXT);
    }
  };

  let lastFrameTime = performance.now();
  const frame = now => {
    if (!isRunning) return;
    rafId = requestAnimationFrame(frame);

    const dt = Math.min(64, now - lastFrameTime);
    lastFrameTime = now;

    const k = 1 - Math.exp(-dt / 80);
    Sd += (St - Sd) * k;
    cx += (ctx_ - cx) * k;
    cy += (cty - cy) * k;

    for (const l of letters) {
      if (!l.dead && l.tx != null) {
        l.x += (l.tx - l.x) * k;
        l.y += (l.ty - l.y) * k;
      }
    }

    letters = letters.filter(l => !(l.dead && now - l.dead > CONFIG.TIMING.WITHER_FADE_MS + 40));

    paint(now);
  };

  const addChar = (ch, now) => {
    lastKeyTime = now;
    const A = letters.filter(l => !l.dead);
    const last = A[A.length - 1];

    if (ch === ' ') {
      if (last && last.ch !== ' ') {
        last.cut = now;
        genEnd(last, now - last.birth);
      }
      letters.push({ ch: ' ', id: uid++, birth: now, els: [] });
      layout();
      return;
    }

    const sameWord = last && last.ch !== ' ';
    const l = {
      ch,
      id: uid++,
      birth: now,
      tb: now,
      ws: sameWord ? last.ws : Math.floor(rand() * 1e9),
      wi: sameWord ? last.wi + 1 : 0,
      prev: sameWord ? last : null
    };
    gen(l);
    letters.push(l);
    layout();
  };

  const scheduleNextAction = (delayMs, action) => {
    clearTimeout(typeTimerId);
    typeTimerId = setTimeout(() => {
      if (isRunning && isVisible) action();
    }, delayMs);
  };

  const runAutoTypingStep = () => {
    const currentPhrase = CONFIG.PHRASES[currentPhraseIdx];

    if (autoState === 'TYPING') {
      if (currentCharIdx < currentPhrase.length) {
        const char = currentPhrase[currentCharIdx];
        addChar(char, performance.now());
        currentCharIdx++;

        const baseDelay = CONFIG.TIMING.CHAR_MIN_DELAY + Math.random() * (CONFIG.TIMING.CHAR_MAX_DELAY - CONFIG.TIMING.CHAR_MIN_DELAY);
        const extraDelay = (char === ' ') ? CONFIG.TIMING.SPACE_EXTRA_DELAY : 0;
        scheduleNextAction(baseDelay + extraDelay, runAutoTypingStep);
      } else {
        autoState = 'HOLD';
        scheduleNextAction(CONFIG.TIMING.HOLD_DURATION, runAutoTypingStep);
      }
    }
  };

  const renderStaticAccessible = () => {
    const phrase = CONFIG.PHRASES[0];
    const tStatic = performance.now() - 4000;
    for (let i = 0; i < phrase.length; i++) {
      const ch = phrase[i];
      addChar(ch, tStatic);
    }
    layout(true);
    paint(performance.now());
  };

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(frame);
    scheduleNextAction(250, runAutoTypingStep);
  };

  const stop = () => {
    isRunning = false;
    cancelAnimationFrame(rafId);
    clearTimeout(typeTimerId);
  };

  const onPointerMove = e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  };

  const onPointerLeave = () => {
    mouseX = null;
    mouseY = null;
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      isVisible = false;
      stop();
    } else {
      isVisible = true;
      if (!isDismissed) start();
    }
  };

  let resizeDebounce = null;
  const onResize = () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(resize, 100);
  };

  // 4. DISMISS & TRANSITION CONTROLLER (6-SECOND LIFECYCLE)
  const dismissWelcome = () => {
    if (isDismissed) return;
    isDismissed = true;

    // Clear timers
    clearInterval(countdownTimerId);
    clearTimeout(autoDismissTimerId);

    // Smoothly slide down the welcome overlay like a curtain
    welcomeScreen.classList.add('slide-down');
    welcomeScreen.classList.add('fade-out');

    // Unlock body scrolling immediately for snappy responsiveness
    document.body.classList.remove('welcome-active');

    // After slide-down animation completes (1.1s), tear down canvas & hide element
    setTimeout(() => {
      stop();
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('keydown', onKeyDown);
      welcomeScreen.style.display = 'none';
    }, 1150);
  };

  const onKeyDown = e => {
    // Pressing Escape immediately skips the welcome screen
    if (e.key === 'Escape') {
      dismissWelcome();
    }
  };

  // 5. INITIALIZATION
  const init = () => {
    // Ensure body scroll is locked initially
    document.body.classList.add('welcome-active');

    resize();
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('keydown', onKeyDown);

    // Skip button interaction
    if (skipBtn) {
      skipBtn.addEventListener('click', e => {
        e.stopPropagation();
        dismissWelcome();
      });
    }

    // Clicking anywhere on the welcome overlay also dismisses it after minimum view
    let welcomeStartTime = performance.now();
    welcomeScreen.addEventListener('click', e => {
      // Allow user to click anywhere to dismiss after 1.5 seconds if they wish
      if (performance.now() - welcomeStartTime > 1500) {
        dismissWelcome();
      }
    });

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      renderStaticAccessible();
    } else {
      start();
    }

    // 6. 6-SECOND COUNTDOWN & AUTO-DISMISS
    let secondsRemaining = Math.round(INTRO_DURATION_MS / 1000);
    if (timerBadge) {
      timerBadge.textContent = `${secondsRemaining}s`;
    }

    countdownTimerId = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining >= 0 && timerBadge) {
        timerBadge.textContent = `${secondsRemaining}s`;
      }
      if (secondsRemaining <= 0) {
        clearInterval(countdownTimerId);
      }
    }, 1000);

    // Automatically transition into the portfolio site after 6 seconds
    autoDismissTimerId = setTimeout(() => {
      dismissWelcome();
    }, INTRO_DURATION_MS);
  };

  // Ensure custom web font is loaded before measuring letter glyphs
  if (document.fonts && document.fonts.load) {
    document.fonts.load(`700 100px ${CONFIG.FONT_FAMILY}`).then(init).catch(init);
  } else {
    init();
  }
})();

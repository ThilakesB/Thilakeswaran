/**
 * Contribution Skyline - Vanilla JS Implementation
 * GitHub Heatmap to 3D Isometric Skyline
 * Adapted cleanly for Thilakeswaran B Portfolio
 */

(function () {
    const DAY_MS = 86400000;
    const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOutCubic = (x) => {
        const t = clamp01(x);
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
    const smoothstep = (a, b, x) => {
        const t = clamp01((x - a) / (b - a));
        return t * t * (3 - 2 * t);
    };

    const toKey = (ms) => new Date(ms).toISOString().slice(0, 10);
    const dayMs = (v) => {
        if (typeof v === "number") return Math.floor(v / DAY_MS) * DAY_MS;
        if (typeof v === "string") {
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
            if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
            v = new Date(v);
        }
        return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
    };

    const rng = (seed) => {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    const generateContributions = (endMs, seed = 7, days = 371) => {
        const r = rng(seed);
        const bursts = Array.from({ length: 4 }, () => ({ at: r(), width: 0.035 + r() * 0.07, gain: 0.6 + r() * 1.1 }));
        const out = [];
        let mood = 0.5;
        for (let i = 0; i < days; i++) {
            const ms = endMs - (days - 1 - i) * DAY_MS;
            const x = i / Math.max(1, days - 1);
            const dow = new Date(ms).getUTCDay();
            const weekend = dow === 0 || dow === 6;
            let heat = 0.2;
            for (const b of bursts) heat += b.gain * Math.exp(-((x - b.at) ** 2) / (2 * b.width ** 2));
            mood = mood * 0.85 + r() * 0.15;
            heat *= 0.55 + mood * 0.9;
            const pActive = Math.min(0.94, (weekend ? 0.22 : 0.5) + heat * 0.4);
            let count = 0;
            if (r() < pActive) count = 1 + Math.floor(-Math.log(1 - r()) * (1.2 + heat * 7) * (weekend ? 0.5 : 1));
            if (r() < 0.01) count += 18 + Math.floor(r() * 24);
            out.push({ date: toKey(ms), count });
        }
        return out;
    };

    const levelOf = (count, busy) => count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));

    const buildGrid = (data, endMs, weekStart = 0) => {
        const counts = new Map();
        for (const d of data) {
            if (!d || typeof d.date !== "string") continue;
            const ms = dayMs(d.date);
            const c = Number(d.count);
            if (!Number.isFinite(ms) || !(c > 0) || !Number.isFinite(c)) continue;
            const k = toKey(ms);
            counts.set(k, (counts.get(k) ?? 0) + c);
        }
        let start = endMs - 364 * DAY_MS;
        start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY_MS;
        const cells = [];
        for (let ms = start, i = 0; ms <= endMs; ms += DAY_MS, i++) {
            const date = toKey(ms);
            cells.push({ date, count: counts.get(date) ?? 0, level: 0, week: Math.floor(i / 7), day: i % 7 });
        }
        const nz = cells.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
        const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
        for (const c of cells) c.level = levelOf(c.count, busy);
        return { cells, weeks: cells.length ? cells[cells.length - 1].week + 1 : 0, max: nz.length ? nz[nz.length - 1] : 0 };
    };

    const computeStats = (cells) => {
        let total = 0, best = 0, bestDate = null, run = 0, runStart = null;
        let longest = { days: 0, start: null, end: null };
        for (const c of cells) {
            total += c.count;
            if (c.count > best) { best = c.count; bestDate = c.date; }
            if (c.count > 0) {
                if (run === 0) runStart = c.date;
                run++;
                if (run > longest.days) longest = { days: run, start: runStart, end: c.date };
            } else run = 0;
        }
        let j = cells.length - 1;
        if (j >= 0 && cells[j].count === 0) j--;
        const endAt = j;
        while (j >= 0 && cells[j].count > 0) j--;
        const days = endAt - j;
        const current = days > 0 ? { days, start: cells[j + 1].date, end: cells[endAt].date } : { days: 0, start: null, end: null };
        return {
            total,
            first: cells.length ? cells[0].date : null,
            last: cells.length ? cells[cells.length - 1].date : null,
            busiest: { count: best, date: bestDate },
            longest,
            current,
        };
    };

    const monthLabels = (cells, weeks, locale = "en-US") => {
        const fmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
        const out = [];
        let prev = -1;
        for (let w = 0; w < weeks; w++) {
            const c = cells[w * 7];
            if (!c) break;
            const m = +c.date.slice(5, 7);
            if (m !== prev) out.push({ week: w, label: fmt.format(dayMs(c.date)) });
            prev = m;
        }
        if (out.length > 1 && out[1].week - out[0].week < 3) out.shift();
        return out;
    };

    const barHeight = (count, max, scale = 1) => count > 0 && max > 0 ? 0.4 + Math.pow(count / max, 0.85) * 7.2 * scale : 0.2;
    const WAVE = 0.42;
    const riseAt = (t, week, weeks, day) => {
        const d = (weeks > 1 ? week / (weeks - 1) : 0) * 0.36 + (day / 6) * 0.06;
        return easeOutCubic((t - d) / (1 - WAVE));
    };

    const YAW_3D = Math.PI / 4;
    const ELEV_3D = (34 * Math.PI) / 180;
    const YAW_RANGE = [(8 * Math.PI) / 180, (82 * Math.PI) / 180];
    const ELEV_RANGE = [(18 * Math.PI) / 180, (62 * Math.PI) / 180];

    const camera = (e, dYaw = 0, dElev = 0) => {
        const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)));
        const elev = lerp(Math.PI / 2, Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)), e);
        return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) };
    };

    const project = (c, x, y, z) => [
        x * c.cs - y * c.sn,
        (x * c.sn + y * c.cs) * c.se - z * c.ce,
    ];

    const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const luminance = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

    const PALETTES = {
        github: {
            light: ["#c6e48b", "#7bc96f", "#239a3b", "#196127"],
            dark: ["#0e4429", "#006d32", "#26a641", "#39d353"],
        },
    };

    const FG_FALLBACK = [23, 23, 23];
    const BG_FALLBACK = [255, 255, 255];

    let probe = null;
    const toRGB = (color, fallback) => {
        if (!probe) {
            const c = document.createElement("canvas");
            c.width = c.height = 1;
            probe = c.getContext("2d", { willReadFrequently: true });
        }
        if (!probe) return fallback;
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "rgba(0,0,0,0)";
        probe.fillStyle = color;
        probe.fillRect(0, 0, 1, 1);
        const d = probe.getImageData(0, 0, 1, 1).data;
        if (d[3] < 8) return fallback;
        return [d[0], d[1], d[2]];
    };

    const rgbString = (r, g, b) => "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";

    const pointInQuad = (p, o, x, y) => {
        let sign = 0;
        for (let k = 0; k < 4; k++) {
            const ax = p[o + k * 2];
            const ay = p[o + k * 2 + 1];
            const bx = p[o + ((k + 1) % 4) * 2];
            const by = p[o + ((k + 1) % 4) * 2 + 1];
            const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
            if (Math.abs(cross) < 1e-9) continue;
            const s = cross > 0 ? 1 : -1;
            if (sign === 0) sign = s;
            else if (s !== sign) return false;
        }
        return sign !== 0;
    };

    const quadPath = (ctx, p, o, r) => {
        if (r < 0.3) {
            ctx.moveTo(p[o], p[o + 1]);
            ctx.lineTo(p[o + 2], p[o + 3]);
            ctx.lineTo(p[o + 4], p[o + 5]);
            ctx.lineTo(p[o + 6], p[o + 7]);
            ctx.closePath();
            return;
        }
        ctx.moveTo((p[o + 6] + p[o]) / 2, (p[o + 7] + p[o + 1]) / 2);
        for (let k = 0; k < 4; k++) {
            const b = (k + 1) % 4;
            ctx.arcTo(p[o + k * 2], p[o + k * 2 + 1], p[o + b * 2], p[o + b * 2 + 1], r);
        }
        ctx.closePath();
    };

    function initContributionSkyline(rootEl) {
        if (!rootEl) return;

        const end = dayMs(new Date());
        const days = generateContributions(end, 7, 371);
        const grid = buildGrid(days, end, 0);
        const stats = computeStats(grid.cells);
        const months = monthLabels(grid.cells, grid.weeks, "en-US");
        const model = { ...grid, stats, months };

        const nf = new Intl.NumberFormat("en-US");
        const df = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        const dfy = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
        const dfl = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

        const range = (a, b, withYear = false) => {
            if (!a || !b) return "—";
            const f = withYear ? dfy : df;
            return f.format(dayMs(a)) + " — " + f.format(dayMs(b));
        };

        const swatches = ["#ebedf0", ...PALETTES.github.light];
        const accent = PALETTES.github.light[3];
        const levelNames = ["No contributions", "Light", "Moderate", "Heavy", "Heaviest"];

        // Build DOM structure
        rootEl.innerHTML = `
            <section class="skyline-card" aria-label="Contribution Activity Heatmap and 3D Skyline">
                <header class="skyline-header">
                    <div class="skyline-title-group">
                        <span class="skyline-badge">GitHub Pulse</span>
                        <h3 class="skyline-title">
                            <strong>${nf.format(stats.total)}</strong> contributions in the last year
                        </h3>
                    </div>
                    <div class="skyline-toggle-group" role="group" aria-label="Skyline view toggle">
                        <div class="skyline-toggle-indicator" id="skyline-toggle-indicator" style="transform: translateX(100%);"></div>
                        <button type="button" class="skyline-toggle-btn" id="btn-view-3d" aria-label="3D skyline view" title="3D Skyline">
                            <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
                                <path d="M8 1.2 14.2 4.6v6.8L8 14.8 1.8 11.4V4.6Z"/>
                                <path d="M1.8 4.6 8 8l6.2-3.4M8 8v6.8"/>
                            </svg>
                            <span>3D</span>
                        </button>
                        <button type="button" class="skyline-toggle-btn active" id="btn-view-2d" aria-label="Flat heat map view" title="Flat Heatmap">
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                                <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/>
                                <rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/>
                                <rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/>
                                <rect x="9" y="9" width="5.5" height="5.5" rx="1"/>
                            </svg>
                            <span>2D</span>
                        </button>
                    </div>
                </header>

                <div class="skyline-stage-outer">
                    <div class="skyline-stage" id="skyline-stage">
                        <canvas id="skyline-canvas" class="skyline-canvas" tabindex="0" role="img" aria-label="${nf.format(stats.total)} contributions in the last year"></canvas>

                        <!-- Floating Corner Stats for 3D View on Desktop -->
                        <div class="skyline-corner-stats skyline-corner-tr" id="corner-stats-tr">
                            <div class="skyline-stat-cell">
                                <div class="skyline-stat-label">1 year total</div>
                                <div class="skyline-stat-val" style="color: ${accent}">${nf.format(stats.total)} <span class="skyline-stat-unit">contributions</span></div>
                                <div class="skyline-stat-sub">${range(stats.first, stats.last, true)}</div>
                            </div>
                            <div class="skyline-stat-cell">
                                <div class="skyline-stat-label">Busiest day</div>
                                <div class="skyline-stat-val" style="color: ${accent}">${nf.format(stats.busiest.count)} <span class="skyline-stat-unit">contributions</span></div>
                                <div class="skyline-stat-sub">${stats.busiest.date ? df.format(dayMs(stats.busiest.date)) : "—"}</div>
                            </div>
                        </div>

                        <div class="skyline-corner-stats skyline-corner-bl" id="corner-stats-bl">
                            <div class="skyline-stat-cell">
                                <div class="skyline-stat-label">Longest streak</div>
                                <div class="skyline-stat-val" style="color: ${accent}">${nf.format(stats.longest.days)} <span class="skyline-stat-unit">days</span></div>
                                <div class="skyline-stat-sub">${range(stats.longest.start, stats.longest.end)}</div>
                            </div>
                            <div class="skyline-stat-cell">
                                <div class="skyline-stat-label">Current streak</div>
                                <div class="skyline-stat-val" style="color: ${accent}">${nf.format(stats.current.days)} <span class="skyline-stat-unit">days</span></div>
                                <div class="skyline-stat-sub">${range(stats.current.start, stats.current.end)}</div>
                            </div>
                        </div>

                        <!-- Tooltip -->
                        <div class="skyline-tooltip" id="skyline-tooltip" role="tooltip" aria-hidden="true">
                            <span id="tooltip-text"></span>
                            <span class="skyline-tooltip-arrow"></span>
                        </div>
                    </div>
                </div>

                <!-- Bottom stats row for 2D or mobile view -->
                <div class="skyline-stats-bottom" id="skyline-stats-bottom">
                    <div class="skyline-stat-card">
                        <span class="skyline-stat-lbl">1 Year Total</span>
                        <div class="skyline-stat-num" style="color: ${accent}">${nf.format(stats.total)}</div>
                        <span class="skyline-stat-note">${range(stats.first, stats.last, true)}</span>
                    </div>
                    <div class="skyline-stat-card">
                        <span class="skyline-stat-lbl">Busiest Day</span>
                        <div class="skyline-stat-num" style="color: ${accent}">${nf.format(stats.busiest.count)}</div>
                        <span class="skyline-stat-note">${stats.busiest.date ? df.format(dayMs(stats.busiest.date)) : "—"}</span>
                    </div>
                    <div class="skyline-stat-card">
                        <span class="skyline-stat-lbl">Longest Streak</span>
                        <div class="skyline-stat-num" style="color: ${accent}">${nf.format(stats.longest.days)}</div>
                        <span class="skyline-stat-note">${stats.longest.days === 1 ? 'day' : 'days in a row'}</span>
                    </div>
                    <div class="skyline-stat-card">
                        <span class="skyline-stat-lbl">Current Streak</span>
                        <div class="skyline-stat-num" style="color: ${accent}">${nf.format(stats.current.days)}</div>
                        <span class="skyline-stat-note">${stats.current.days === 1 ? 'day active' : 'days active'}</span>
                    </div>
                </div>

                <!-- Footer with hint and interactive legend -->
                <footer class="skyline-footer">
                    <span class="skyline-hint" id="skyline-hint">Drag to orbit · double-click to reset</span>
                    <div class="skyline-legend">
                        <span class="skyline-legend-text">Less</span>
                        ${swatches.map((color, idx) => `
                            <button type="button" class="skyline-swatch" data-level="${idx}" title="${levelNames[idx]}" style="background-color: ${color};" aria-label="${levelNames[idx]}"></button>
                        `).join('')}
                        <span class="skyline-legend-text">More</span>
                    </div>
                </footer>
            </section>
        `;

        const stage = rootEl.querySelector("#skyline-stage");
        const canvas = rootEl.querySelector("#skyline-canvas");
        const tip = rootEl.querySelector("#skyline-tooltip");
        const tipText = rootEl.querySelector("#tooltip-text");
        const btn3d = rootEl.querySelector("#btn-view-3d");
        const btn2d = rootEl.querySelector("#btn-view-2d");
        const indicator = rootEl.querySelector("#skyline-toggle-indicator");
        const hintEl = rootEl.querySelector("#skyline-hint");
        const bottomStats = rootEl.querySelector("#skyline-stats-bottom");
        const cornerTr = rootEl.querySelector("#corner-stats-tr");
        const cornerBl = rootEl.querySelector("#corner-stats-bl");
        const swatchesBtns = rootEl.querySelectorAll(".skyline-swatch");

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let currentView = "2d";
        let target = 0.0;
        let t = 0.0;
        let entered = false;
        let hasAutoMorphed = false;
        const MORPH_DURATION = 3000; // 3 seconds morph duration
        let legendLevel = -1;

        let yaw = 0, elev = 0, yawGoal = 0, elevGoal = 0;
        let W = 0, H2 = 0, H3 = 0, Hmax = 0, lastH = -1, dpr = 1, gutter = 30, labelW = 30;
        let font = "11px Inter, -apple-system, sans-serif";

        const col = new Float32Array(15);
        const colGoal = new Float32Array(15);
        let fg = FG_FALLBACK;
        let bg = BG_FALLBACK;
        let isDark = false;

        const n = model.cells.length;
        const weeks = model.weeks;
        const wk = new Float32Array(n);
        const dy = new Float32Array(n);
        const lv = new Uint8Array(n);
        const hgt = new Float32Array(n);
        const zs = new Float32Array(n);
        const hover = new Float32Array(n);
        const dim = new Float32Array(n);
        const polys = new Float32Array(n * 24);
        const faces = new Uint8Array(n);
        const order = Array.from({ length: n }, (_, i) => i);

        for (let i = 0; i < n; i++) {
            const c = model.cells[i];
            wk[i] = c.week;
            dy[i] = c.day;
            lv[i] = c.level;
            hgt[i] = barHeight(c.count, model.max, 1);
        }

        const weekdayRows = [];
        const wf = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
        for (let d = 0; d < 7 && d < n; d++) {
            const dow = new Date(dayMs(model.cells[d].date)).getUTCDay();
            if (dow === 1 || dow === 3 || dow === 5) weekdayRows.push({ day: d, label: wf.format(dayMs(model.cells[d].date)) });
        }

        let hovered = -1, pinned = -1, activeIdx = -1, tipW = 0, raf = 0, last = 0;

        const updateColors = () => {
            fg = [23, 23, 23];
            bg = [255, 255, 255];
            isDark = false;
            font = "500 10px Inter, -apple-system, sans-serif";
            const empty = [235, 237, 240];
            const pal = PALETTES.github.light.map(c => toRGB(c, FG_FALLBACK));
            const all = [empty, ...pal];
            for (let k = 0; k < 5; k++) {
                for (let ch = 0; ch < 3; ch++) {
                    colGoal[k * 3 + ch] = all[k][ch];
                    col[k * 3 + ch] = all[k][ch];
                }
            }
            ctx.font = font;
            labelW = Math.ceil(Math.max(20, ...weekdayRows.map((r) => ctx.measureText(r.label).width))) + 8;
        };

        const extent = (cam, e, full) => {
            const w = lerp(0.78, 0.9, e);
            const off = (1 - w) / 2;
            let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
            const add = (x, y, z) => {
                const p = project(cam, x, y, z);
                if (p[0] < minx) minx = p[0];
                if (p[0] > maxx) maxx = p[0];
                if (p[1] < miny) miny = p[1];
                if (p[1] > maxy) maxy = p[1];
            };
            for (let i = 0; i < n; i++) {
                const x0 = wk[i] + off;
                const y0 = dy[i] + off;
                const z = full ? hgt[i] * e : zs[i];
                add(x0, y0, z);
                add(x0 + w, y0, z);
                add(x0, y0 + w, z);
                add(x0 + w, y0 + w, 0);
                add(x0, y0 + w, 0);
                add(x0 + w, y0, 0);
            }
            add(0, 7 + 1.5 * e, 0);
            add(weeks, 7 + 1.5 * e, 0);
            return { minx, maxx, miny, maxy };
        };

        const relayout = () => {
            const w = Math.round(stage.clientWidth);
            if (!w || !n) return;
            W = w;
            gutter = W < 540 ? 0 : labelW;
            dpr = Math.min(2, window.devicePixelRatio || 1);
            const b2 = extent(camera(0), 0, true);
            H2 = 20 + 4 + ((b2.maxy - b2.miny) / (b2.maxx - b2.minx)) * (W - gutter - 4);
            const b3 = extent(camera(1), 1, true);
            const natural = ((b3.maxy - b3.miny) / (b3.maxx - b3.minx)) * (W - 40) + 40;
            H3 = Math.max(Math.min(natural, W * 0.72, 580), Math.min(natural, 260));
            Hmax = Math.ceil(Math.max(H2, H3));
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(Hmax * dpr);
            canvas.style.width = W + "px";
            canvas.style.height = Hmax + "px";
            lastH = -1;
            draw();
            updateStatsVisibility();
        };

        const updateStatsVisibility = () => {
            const isWide = W >= 680;
            if (currentView === "3d" && isWide) {
                cornerTr.style.opacity = "1";
                cornerTr.style.pointerEvents = "auto";
                cornerBl.style.opacity = "1";
                cornerBl.style.pointerEvents = "auto";
                bottomStats.style.display = "none";
            } else {
                cornerTr.style.opacity = "0";
                cornerTr.style.pointerEvents = "none";
                cornerBl.style.opacity = "0";
                cornerBl.style.pointerEvents = "none";
                bottomStats.style.display = "grid";
            }
        };

        const draw = () => {
            if (!W || !n) return;
            const e = easeInOutCubic(t);
            const cam = camera(e, yaw, elev);
            const Hc = lerp(H2, H3, e);
            if (Math.abs(Hc - lastH) > 0.2) {
                stage.style.height = Hc.toFixed(1) + "px";
                lastH = Hc;
            }
            for (let i = 0; i < n; i++) zs[i] = riseAt(t, wk[i], weeks, dy[i]) * hgt[i];
            const b = extent(cam, e, false);
            const pad = lerp(4, 20, e);
            const left = pad + gutter * (1 - e);
            const top = pad + 20 * (1 - e);
            const aw = W - left - pad;
            const ah = Hc - top - pad;
            const bw = Math.max(1e-6, b.maxx - b.minx);
            const bh = Math.max(1e-6, b.maxy - b.miny);
            const s = Math.min(aw / bw, ah / bh);
            const ox = left + (aw - bw * s) / 2 - b.minx * s;
            const oy = top + (ah - bh * s) / 2 - b.miny * s;
            const { cs, sn, se, ce } = cam;
            const px = (x, y) => ox + (x * cs - y * sn) * s;
            const py = (x, y, z) => oy + ((x * sn + y * cs) * se - z * ce) * s;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, Hmax);

            order.sort((a, c) => (wk[a] + 0.5) * sn + (dy[a] + 0.5) * cs - ((wk[c] + 0.5) * sn + (dy[c] + 0.5) * cs));

            const w = lerp(0.78, 0.9, e);
            const off = (1 - w) / 2;
            const radius = lerp(0.17, 0.03, e) * s;
            const outline = (1 - e) * 0.08;
            const lift = 0.7 * e;
            const ex = col[0], ey = col[1], ez = col[2];

            for (let k = 0; k < n; k++) {
                const i = order[k];
                const x0 = wk[i] + off;
                const y0 = dy[i] + off;
                const x1 = x0 + w;
                const y1 = y0 + w;
                const z = zs[i] + hover[i] * lift;
                const o = i * 24;

                // top
                polys[o] = px(x0, y0); polys[o + 1] = py(x0, y0, z);
                polys[o + 2] = px(x1, y0); polys[o + 3] = py(x1, y0, z);
                polys[o + 4] = px(x1, y1); polys[o + 5] = py(x1, y1, z);
                polys[o + 6] = px(x0, y1); polys[o + 7] = py(x0, y1, z);
                // +y face
                polys[o + 8] = px(x0, y1); polys[o + 9] = py(x0, y1, 0);
                polys[o + 10] = px(x1, y1); polys[o + 11] = py(x1, y1, 0);
                polys[o + 12] = polys[o + 4]; polys[o + 13] = polys[o + 5];
                polys[o + 14] = polys[o + 6]; polys[o + 15] = polys[o + 7];
                // +x face
                polys[o + 16] = px(x1, y0); polys[o + 17] = py(x1, y0, 0);
                polys[o + 18] = polys[o + 10]; polys[o + 19] = polys[o + 11];
                polys[o + 20] = polys[o + 4]; polys[o + 21] = polys[o + 5];
                polys[o + 22] = polys[o + 2]; polys[o + 23] = polys[o + 3];

                const tall = z * ce * s;
                let f = 0;
                if (tall > 0.35 && w * cs * s > 0.35) f |= 1;
                if (tall > 0.35 && w * sn * s > 0.35) f |= 2;
                faces[i] = f;

                const L = lv[i] * 3;
                let r = col[L], g = col[L + 1], bl = col[L + 2];
                const d = dim[i];
                if (d > 0.002) {
                    r += (ex - r) * 0.72 * d;
                    g += (ey - g) * 0.72 * d;
                    bl += (ez - bl) * 0.72 * d;
                }
                const hv = hover[i];
                if (hv > 0.002) {
                    const m = 0.16 * hv;
                    r += (fg[0] - r) * m;
                    g += (fg[1] - g) * m;
                    bl += (fg[2] - bl) * m;
                }
                if (f & 1) {
                    ctx.beginPath();
                    quadPath(ctx, polys, o + 8, 0);
                    ctx.fillStyle = rgbString(r * 0.84, g * 0.84, bl * 0.84);
                    ctx.fill();
                }
                if (f & 2) {
                    ctx.beginPath();
                    quadPath(ctx, polys, o + 16, 0);
                    ctx.fillStyle = rgbString(r * 0.68, g * 0.68, bl * 0.68);
                    ctx.fill();
                }
                ctx.beginPath();
                quadPath(ctx, polys, o, radius);
                ctx.fillStyle = rgbString(r, g, bl);
                ctx.fill();

                if (outline > 0.004) {
                    ctx.strokeStyle = "rgba(" + fg[0] + "," + fg[1] + "," + fg[2] + "," + outline.toFixed(3) + ")";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                if (hv > 0.02) {
                    ctx.strokeStyle = "rgba(" + fg[0] + "," + fg[1] + "," + fg[2] + "," + (0.85 * hv).toFixed(3) + ")";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            // Labels
            const muted = mixRGB(bg, fg, 0.55);
            ctx.font = font;
            const a2 = 1 - smoothstep(0, 0.4, e);
            const a3 = smoothstep(0.62, 1, e);

            if (a2 > 0.004) {
                ctx.fillStyle = "rgba(" + Math.round(muted[0]) + "," + Math.round(muted[1]) + "," + Math.round(muted[2]) + "," + a2.toFixed(3) + ")";
                ctx.textAlign = "left";
                ctx.textBaseline = "bottom";
                let edge = -Infinity;
                for (const m of model.months) {
                    const x = px(m.week + off, -0.3);
                    const tw = ctx.measureText(m.label).width;
                    if (x < edge || x + tw > W) continue;
                    ctx.fillText(m.label, x, py(m.week + off, -0.3, 0) - 3);
                    edge = x + tw + 6;
                }
                ctx.textAlign = "right";
                ctx.textBaseline = "middle";
                if (gutter > 0) {
                    for (const row of weekdayRows) {
                        ctx.fillText(row.label, px(0, row.day + 0.5) - 6, py(0, row.day + 0.5, 0));
                    }
                }
            }
            if (a3 > 0.004) {
                ctx.fillStyle = "rgba(" + Math.round(muted[0]) + "," + Math.round(muted[1]) + "," + Math.round(muted[2]) + "," + a3.toFixed(3) + ")";
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                let edge = -Infinity;
                for (const m of model.months) {
                    const x = px(m.week + 0.5, 7.3);
                    if (x < edge || x + ctx.measureText(m.label).width > W) continue;
                    ctx.fillText(m.label, x, py(m.week + 0.5, 7.3, 0) + 2);
                    edge = x + ctx.measureText(m.label).width + 10;
                }
            }

            // Position Tooltip
            if (activeIdx >= 0 && activeIdx < n) {
                const i = activeIdx;
                const z = zs[i] + hover[i] * lift;
                const tx = px(wk[i] + 0.5, dy[i] + 0.5);
                const ty = Math.min(
                    py(wk[i] + off, dy[i] + off, z),
                    py(wk[i] + off + w, dy[i] + off, z),
                    py(wk[i] + off, dy[i] + off + w, z)
                );
                tipW = tip.offsetWidth || 140;
                const half = tipW / 2;
                const cx = Math.min(W - half - 4, Math.max(half + 4, tx));
                tip.style.transform = "translate(" + (cx - half).toFixed(1) + "px," + (ty - 8).toFixed(1) + "px) translateY(-100%)";
                tip.style.setProperty("--arrow-pos", (tx - cx + half).toFixed(1) + "px");
            }
        };

        const tick = (now) => {
            raf = 0;
            const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            let moving = false;

            if (t !== target) {
                const step = (dt * 1000) / MORPH_DURATION;
                t = target > t ? Math.min(target, t + step) : Math.max(target, t - step);
                moving = true;
            }

            const ko = 1 - Math.exp(-dt * 12);
            yaw += (yawGoal - yaw) * ko;
            elev += (elevGoal - elev) * ko;
            if (Math.abs(yawGoal - yaw) > 1e-4 || Math.abs(elevGoal - elev) > 1e-4) moving = true;
            else { yaw = yawGoal; elev = elevGoal; }

            const kh = 1 - Math.exp(-dt * 16);
            const kd = 1 - Math.exp(-dt * 10);
            for (let i = 0; i < n; i++) {
                const hg = i === activeIdx ? 1 : 0;
                const dg = legendLevel >= 0 && lv[i] !== legendLevel ? 1 : 0;
                const h = hover[i];
                const d = dim[i];
                if (h !== hg) {
                    hover[i] = Math.abs(hg - h) < 0.003 ? hg : h + (hg - h) * kh;
                    moving = true;
                }
                if (d !== dg) {
                    dim[i] = Math.abs(dg - d) < 0.003 ? dg : d + (dg - d) * kd;
                    moving = true;
                }
            }

            draw();
            if (moving) raf = requestAnimationFrame(tick);
        };

        const kick = () => {
            if (raf) return;
            last = performance.now();
            raf = requestAnimationFrame(tick);
        };

        const hit = (x, y) => {
            for (let k = n - 1; k >= 0; k--) {
                const i = order[k];
                const o = i * 24;
                if (pointInQuad(polys, o, x, y)) return i;
                if (faces[i] & 1 && pointInQuad(polys, o + 8, x, y)) return i;
                if (faces[i] & 2 && pointInQuad(polys, o + 16, x, y)) return i;
            }
            return -1;
        };

        const local = (ev) => {
            const r = canvas.getBoundingClientRect();
            return [ev.clientX - r.left, ev.clientY - r.top];
        };

        const refreshActive = () => {
            const next = hovered >= 0 ? hovered : pinned;
            if (next === activeIdx) return;
            activeIdx = next;
            if (activeIdx >= 0 && model.cells[activeIdx]) {
                const c = model.cells[activeIdx];
                const cCount = c.count ? `${nf.format(c.count)} contribution${c.count === 1 ? '' : 's'}` : "No contributions";
                tipText.innerHTML = `<strong>${cCount}</strong> on ${dfy.format(dayMs(c.date))}`;
                tip.classList.add("active");
                tip.setAttribute("aria-hidden", "false");
            } else {
                tip.classList.remove("active");
                tip.setAttribute("aria-hidden", "true");
            }
            kick();
        };

        let drag = null;
        canvas.addEventListener("pointerdown", (ev) => {
            if (ev.button !== 0) return;
            const can = target === 1;
            drag = {
                id: ev.pointerId,
                x: ev.clientX,
                y: ev.clientY,
                yaw: yawGoal,
                elev: elevGoal,
                moved: false,
                orbit: can,
                mouse: ev.pointerType === "mouse"
            };
            if (can) {
                try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
            }
        });

        canvas.addEventListener("pointermove", (ev) => {
            if (drag && drag.orbit && ev.pointerId === drag.id) {
                const dx = ev.clientX - drag.x;
                const dyy = ev.clientY - drag.y;
                if (drag.moved || Math.hypot(dx, dyy) > 4) {
                    drag.moved = true;
                    yawGoal = Math.min(YAW_RANGE[1] - YAW_3D, Math.max(YAW_RANGE[0] - YAW_3D, drag.yaw + dx * 0.006));
                    if (drag.mouse) elevGoal = Math.min(ELEV_RANGE[1] - ELEV_3D, Math.max(ELEV_RANGE[0] - ELEV_3D, drag.elev + dyy * 0.004));
                    canvas.style.cursor = "grabbing";
                    hovered = -1;
                    refreshActive();
                    kick();
                    return;
                }
            }
            if (ev.pointerType !== "mouse") return;
            const [x, y] = local(ev);
            const i = hit(x, y);
            if (i !== hovered) {
                hovered = i;
                refreshActive();
            }
            canvas.style.cursor = target === 1 ? "grab" : (i >= 0 ? "pointer" : "default");
        });

        canvas.addEventListener("pointerup", (ev) => {
            if (!drag || ev.pointerId !== drag.id) return;
            const wasMoved = drag.moved;
            drag = null;
            if (canvas.hasPointerCapture && canvas.hasPointerCapture(ev.pointerId)) {
                canvas.releasePointerCapture(ev.pointerId);
            }
            canvas.style.cursor = target === 1 ? "grab" : "default";
            if (wasMoved) return;
            const [x, y] = local(ev);
            const i = hit(x, y);
            pinned = i === pinned ? -1 : i;
            if (ev.pointerType !== "mouse") hovered = -1;
            refreshActive();
        });

        canvas.addEventListener("pointerleave", () => {
            if (drag) return;
            hovered = -1;
            refreshActive();
        });

        canvas.addEventListener("dblclick", () => {
            yawGoal = 0;
            elevGoal = 0;
            kick();
        });

        // View Toggle Handlers
        const switchView = (v) => {
            currentView = v;
            if (v === "3d") {
                target = 1.0;
                btn3d.classList.add("active");
                btn2d.classList.remove("active");
                indicator.style.transform = "translateX(0)";
                hintEl.textContent = "Drag to orbit · double-click to reset";
            } else {
                target = 0;
                yawGoal = 0;
                elevGoal = 0;
                btn2d.classList.add("active");
                btn3d.classList.remove("active");
                indicator.style.transform = "translateX(100%)";
                hintEl.textContent = "Hover a day for details · arrow keys to explore";
            }
            updateStatsVisibility();
            kick();
        };

        btn3d.addEventListener("click", () => switchView("3d"));
        btn2d.addEventListener("click", () => switchView("2d"));

        // Legend Highlight
        swatchesBtns.forEach((btn) => {
            const lvl = parseInt(btn.getAttribute("data-level"), 10);
            btn.addEventListener("mouseenter", () => {
                legendLevel = lvl;
                kick();
            });
            btn.addEventListener("mouseleave", () => {
                legendLevel = -1;
                kick();
            });
            btn.addEventListener("click", () => {
                legendLevel = legendLevel === lvl ? -1 : lvl;
                kick();
            });
        });

        updateColors();
        relayout();
        kick();

        window.addEventListener("resize", () => {
            relayout();
            kick();
        });

        const triggerAutoMorph = () => {
            if (hasAutoMorphed) return;
            hasAutoMorphed = true;
            entered = true;
            setTimeout(() => {
                switchView("3d");
            }, 150);
        };

        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver((entries) => {
                if (entries.some((en) => en.isIntersecting)) {
                    triggerAutoMorph();
                    io.disconnect();
                }
            }, { threshold: 0.25 });
            io.observe(stage);
        }

        const onScrollCheck = () => {
            if (hasAutoMorphed) {
                window.removeEventListener("scroll", onScrollCheck);
                return;
            }
            const rect = stage.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
                triggerAutoMorph();
                window.removeEventListener("scroll", onScrollCheck);
            }
        };
        window.addEventListener("scroll", onScrollCheck, { passive: true });
    }

    // Auto-mount when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initContributionSkyline(document.getElementById("contribution-skyline-root"));
        });
    } else {
        initContributionSkyline(document.getElementById("contribution-skyline-root"));
    }
})();

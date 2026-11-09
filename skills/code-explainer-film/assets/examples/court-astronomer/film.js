// film.js: the whole film laid out on the narration. Every moment hangs on a cue from the voice take of that language.
'use strict';
let SLATE = null, SPACE = null;
const TL = TIMING[LANG];
const BEAT = Object.fromEntries(TL.beats.map((b) => [b.id, b]));
const CUE = {};
for (const b of TL.beats) Object.assign(CUE, b.cues);
CUE.pole0 = BEAT.b04.start + .8;

function drawSlate(g) {
  g.fillStyle = '#15181a'; g.fillRect(0, 0, W, H);
  const a = '#2f3a3c', b = '#232c2e';
  for (const [x0, y0, x1, y1] of [[110, 300, 1810, 300], [110, 780, 1810, 780]]) line(g, [[x0, y0], [x1, y1]], b, 5, [46, 22]);
  for (let i = 0; i < 8; i++) {
    const x = 220 + i * 210, ph = i / 7;
    g.lineWidth = 3; g.strokeStyle = a; g.stroke(circle(x, 170, 42));
    g.fillStyle = a; const p = new Path2D();
    p.arc(x, 170, 42, -Math.PI / 2, Math.PI / 2);
    p.ellipse(x, 170, Math.abs(1 - 2 * ph) * 42 + 0.01, 42, 0, Math.PI / 2, -Math.PI / 2, ph < 0.5);
    g.fill(p);
  }
  const cons = [[[240, 450], [370, 520], [470, 470], [590, 590], [520, 690]], [[1320, 420], [1430, 500], [1390, 610], [1520, 690], [1660, 620]], [[820, 430], [930, 520], [1060, 470], [1120, 620]]];
  for (const c of cons) { line(g, c, a, 3.4, [12, 11]); c.forEach((q) => ink(g, star(q[0], q[1], 17, 6), a, 0)); }
  const fx = 1540, fy = 950;
  g.strokeStyle = a; g.lineWidth = 3.4; g.stroke(circle(fx, fy, 44));
  for (let i = 0; i < 7; i++) { const t = rad(-170 + i * 26); line(g, [[fx + Math.cos(t) * 62, fy + Math.sin(t) * 62], [fx + Math.cos(t) * 170, fy + Math.sin(t) * 170]], a, 3.6, i % 2 ? [12, 10] : null); }
  for (const [x, y] of [[280, 900], [370, 900], [460, 900], [550, 900]]) for (const [dx, dy] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) ink(g, diamond(x + dx, y + dy, 11, 11), b, 0);
  line(g, [[820, 880], [1180, 880]], b, 5, [30, 14]);
}

// the band of parchment that sweeps from right to left, roll at its foot
function wipeGeom(p) {
  const footX = lerp(W + 280, -340, p);
  const lean = rad(lerp(25, 6, p));
  const w = 380;
  const footY = H - 62 + Math.sin(p * Math.PI) * 4;
  const dirx = Math.sin(lean), diry = -Math.cos(lean), nx = Math.cos(lean), ny = Math.sin(lean);
  const far = 1600;
  const P = (s, along) => [footX + nx * s + dirx * along, footY + ny * s + diry * along];
  const leading = [], trailing = [];
  for (let i = 0; i <= 26; i++) {
    const along = far * i / 26;
    leading.push(P(-w / 2 + Math.sin(i * 1.3 + p * 9) * 1.2, along));
    trailing.push(P(w / 2 + Math.sin(i * 0.9 + p * 14) * 5 * (0.4 + p), along));
  }
  return { footX, footY, lean, w, P, band: poly(leading.concat(trailing.slice().reverse())), trailing, far };
}
function paintWipe(g, W0) {
  const { footX, footY, lean, w, P, band } = W0;
  ink(g, band, C.parch3);
  g.save(); g.clip(band);
  g.fillStyle = C.parch; g.fill(poly([P(-w / 2 - 8, 0), P(-w / 2 + 40, 0), P(-w / 2 + 40, 1700), P(-w / 2 - 8, 1700)]));
  const zig = [];
  for (let i = 0; i < 26; i++) zig.push(P(w / 2 - 66 + (i % 2 ? 26 : 0), 40 + i * 62));
  line(g, zig, C.parch2, 4, [13, 10]);
  for (let i = 0; i < 12; i++) { const q = P(-w * .12, 120 + i * 134); ink(g, star(q[0], q[1], 13, 5, 4, lean), C.parch2, 0); }
  const h = (s, a, l, wd) => { const A = P(s, a), B = P(s + l, a + 8); line(g, [A, B], '#fbf8f2', wd); };
  h(-40, 880, 76, 11); h(-54, 840, 112, 11);
  dots(g, [P(70, 200), P(82, 164), P(92, 128)], 8, '#fbf8f2');
  g.restore();
  const foot = new Path2D(); foot.ellipse(footX, footY, w / 2 + 9, 34, lean, 0, Math.PI * 2); ink(g, foot, C.parch3);
  const inner = new Path2D(); inner.ellipse(footX + Math.cos(lean) * 2, footY + Math.sin(lean) * 2, w / 2 - 12, 22, lean, 0, Math.PI * 2); ink(g, inner, C.khaki, 2.4);
  const inner2 = new Path2D(); inner2.ellipse(footX + Math.cos(lean) * 8, footY + Math.sin(lean) * 8, w / 2 - 66, 13, lean, 0, Math.PI * 2); ink(g, inner2, C.khaki2, 2.2);
  line(g, [P(w * .26, 8), P(w * .26, 44)], INK, 3);
}

const ramp = (t, a, b) => clamp((t - a) / (b - a));
const dm = (s) => SPACE.dateMs(s);

// ---------- the shots ----------
const SHOT = {
  opening(g, t) {
    if (t >= CUE.cut) { scene2(g, t, CUE.cut); return; }
    const p = ramp(t, .2, 1.8);
    if (p <= 0) { g.drawImage(SLATE, 0, 0); return; }
    if (p >= 1) { scene1(g, t); return; }
    const WW = wipeGeom(EASE.io(p));
    g.drawImage(SLATE, 0, 0);
    g.save();
    g.clip(poly(WW.trailing.concat([[W + 2000, -2000], [W + 2000, H + 2000], [WW.footX, H + 2000]])));
    scene1(g, t);
    g.restore();
    paintWipe(g, WW);
  },
  drift(g, t) {
    const leave = EASE.io(ramp(t, CUE.old - .1, CUE.old + .9));
    const z = EASE.io(ramp(t, CUE.old + .15, CUE.old + 1.4));
    const fade = ramp(t, CUE.old + 1.0, CUE.old + 1.5);
    if (fade < 1) {
      g.save();
      g.translate(W / 2, H / 2); g.scale(lerp(1, 3.4, z), lerp(1, 3.4, z)); g.translate(lerp(-W / 2, -360, z), lerp(-H / 2, -560, z));
      scene2(g, t, CUE.cut, leave);
      g.restore();
    }
    if (fade > 0) {
      g.save(); g.globalAlpha = fade;
      const run = EASE.io(ramp(t, CUE.drift - .5, BEAT.b02.end + .1));
      driftChart(g, t, ramp(t, CUE.drift - .7, CUE.drift - .2), lerp(-129, 1054, run), ramp(t, CUE.old + 1.6, CUE.old + 2));
      g.restore();
    }
  },
  wobble(g, t) { SPACE.draw(g, 'axis', t, { mode: 'wobble', b: BEAT.b03, end: BEAT.b04.start }); },
  pole(g, t) {
    const year = track([[BEAT.b04.start + .6, 2026], [CUE.thuban - 1.3, 2026], [CUE.thuban + .1, -2800], [CUE.vega - 1.5, -2800], [CUE.vega + .35, 14000]], t);
    SPACE.draw(g, 'axis', t, { mode: 'pole', b: BEAT.b04, year });
  },
  zodiac(g, t) {
    const b = BEAT.b05;
    const year = track([[CUE.vp + 3.3, -4400], [CUE.era - .1, 2026, 'l']], t);
    SPACE.draw(g, 'zodiac', t, { b, year, tEra: CUE.era });
  },
  ages(g, t) { shotAges(g, t, {}); },
  pins(g, t) { shotPins(g, t, {}); },
  orrery(g, t) {
    const s = BEAT.b08.start, y = 2000 + .05 * (t - s) + 1.5 * Math.pow(Math.max(0, t - CUE.fast + .4), 1.25);
    SPACE.draw(g, 'orrery', t, { b: BEAT.b08, end: BEAT.b09.start, year: y });
  },
  clock(g, t) {
    const s = BEAT.b16.start;
    const u = Math.max(0, t - s), tick = Math.floor(u) + EASE.b(clamp((u % 1) * 5));
    SPACE.draw(g, 'orrery', t, { b: { start: s - 40 }, end: s - 1, year: 2026.85 + tick * .3, clock: true, t0: s });
  },
  conj(g, t) {
    const date = track([[BEAT.b09.start - .3, dm('2020-12-01')], [CUE.gc + 2.4, dm('2020-12-21')], [CUE.gc + 40, dm('2020-12-21')]], t);
    SPACE.draw(g, 'conj', t, { b: BEAT.b09, date, gc: CUE.gc, bloom: .3 });
  },
  signs(g, t) {
    const year = track([[CUE.sign + .9, -120], [CUE.sign + 5.4, 2026]], t);
    SPACE.draw(g, 'signs', t, { t0: CUE.sign - .3, year });
  },
  wheel(g, t) {
    const b = BEAT.b10;
    const date = track([[b.start - .3, dm('2023-01-20')], [CUE.pl, dm('2024-11-19')], [CUE.ne, dm('2025-03-30')], [CUE.ur, dm('2025-07-07')], [CUE.sn, dm('2026-02-20')], [CUE.hex, dm('2026-07-21')], [CUE.hex + 40, dm('2026-07-21')]], t);
    const tp = ramp(t, CUE.pl - .2, CUE.pl + .2), tn = ramp(t, CUE.ne - .2, CUE.ne + .2), tu = ramp(t, CUE.ur - .2, CUE.ur + .2), ts = ramp(t, CUE.sn - .1, CUE.sn + .3), th = ramp(t, CUE.hex - .1, CUE.hex + .3);
    const fadeOff = (a) => a * (1 - ramp(t, CUE.sn - .4, CUE.sn));
    const WIDE = [.35, .35, 15.4, 18.4, .87];
    const cm = track([[b.start, WIDE], [CUE.pl - .7, WIDE], [CUE.pl + .2, [1.5, 2.0, 11.2, 13.4, .72]], [CUE.ne - .4, [1.5, 2.0, 11.2, 13.4, .72]], [CUE.ne + .3, [2.5, .2, 11.2, 13.4, .92]], [CUE.ur - .4, [2.5, .2, 11.2, 13.4, .92]], [CUE.ur + .3, [1.4, -1.7, 11.6, 13.8, 1.1]], [CUE.sn - .6, [1.4, -1.7, 11.6, 13.8, 1.1]], [CUE.sn + .3, [3.3, .2, 9.4, 11.4, 1.05]], [CUE.hex - .5, [3.3, .2, 9.4, 11.4, 1.05]], [CUE.hex + .5, WIDE], [CUE.hex + 40, WIDE]], t);
    const X = { t0: t - .001, date, showDay: true, lx: cm[0], lz: cm[1], rr: cm[2], hh: cm[3], az: cm[4], dateA: ramp(t, b.start - .2, b.start + .3) };
    X.tags = [
      { k: 'P', text: T_('Плутон · Водолей', 'Pluto · Aquarius'), a: fadeOff(tp) * (1 - ramp(t, CUE.hex - .3, CUE.hex)), dy: -66 },
      { k: 'N', text: T_('Нептун · Овен', 'Neptune · Aries'), a: fadeOff(tn), dy: -70, dx: 20 },
      { k: 'U', text: T_('Уран · Близнецы', 'Uranus · Gemini'), a: fadeOff(tu), dy: -64, dx: 20 },
    ];
    if (t >= CUE.sn - .1 && t < CUE.hex - .1) X.tags.push({ k: 'S', text: T_('Сатурн и Нептун · 0°45′ Овна', 'Saturn and Neptune · 0°45′ Aries'), a: ts, dy: -74, dx: 40, fill: C.gold2 });
    if (t >= CUE.hex - .1) {
      const u = ramp(t, CUE.hex + .1, CUE.hex + 1.8);
      X.figure = { kind: 'chain', keys: ['P', 'N', 'U', 'J'], a: EASE.io(u), fill: true, ghost: false };
      const tl = (q) => ramp(t, CUE.hex + .1 + q, CUE.hex + .4 + q);
      X.tags.push({ k: 'P', text: T_('4°25′ Водолея', '4°25′ Aquarius'), a: tl(0), dy: -56, size: 24 });
      X.tags.push({ k: 'N', text: T_('4°22′ Овна', '4°22′ Aries'), a: tl(.5), dy: -56, size: 24 });
      X.tags.push({ k: 'U', text: T_('4°36′ Близнецов', '4°36′ Gemini'), a: tl(1), dy: -56, size: 24 });
      X.tags.push({ k: 'J', text: T_('4°31′ Льва', '4°31′ Leo'), a: tl(1.5), dy: -10, dx: 170, size: 24 });
    }
    if (t < CUE.sn) {
      if (t >= CUE.ur - .2) { X.sector = 2; X.sectorA = 1 - ramp(t, CUE.ur + 1.6, CUE.sn - .3); X.focus = { k: 'U', a: tu * (1 - ramp(t, CUE.ur + .8, CUE.ur + 1.6)) }; }
      else if (t >= CUE.ne - .2) { X.sector = 0; X.sectorA = tn; X.focus = { k: 'N', a: tn }; }
      else if (t >= CUE.pl - .2) { X.sector = 10; X.sectorA = tp; X.focus = { k: 'P', a: tp }; }
    } else if (t < CUE.hex - .1) { X.sector = 0; X.sectorA = ts * .8; X.focus = { k: 'S', a: ts }; }
    SPACE.draw(g, 'wheel', t, X);
  },
  wheelNow(g, t) {
    const b = BEAT.b11;
    const date = track([[b.start - .3, dm('2026-10-20')], [b.start + 2.2, dm('2026-11-08')], [CUE.st - .1, dm('2026-11-24')], [CUE.st + 3, dm('2026-12-13')], [CUE.st + 40, dm('2026-12-13')]], t);
    const WIDE = [.35, .2, 15.4, 18.4, 1.05];
    const cm = track([[b.start, WIDE], [CUE.st - .3, WIDE], [CUE.st + .6, [3.1, 0, 10.6, 12.8, 1.1]], [CUE.st + 1.7, [3.1, 0, 10.6, 12.8, 1.1]], [CUE.st + 2.6, WIDE], [CUE.st + 40, WIDE]], t);
    const X = { t0: t - .001, date, lx: cm[0], lz: cm[1], rr: cm[2], hh: cm[3], az: cm[4], showDay: t > CUE.st - .1 };
    if (t < CUE.st - .1) X.showDay = false;
    const q = (k, a) => ramp(t, CUE.st + k, CUE.st + k + .3);
    X.tags = [
      { k: 'S', text: T_('Сатурн · 10 декабря', 'Saturn · 10 December'), a: q(.5), dy: -70, fill: C.gold2 },
      { k: 'N', text: T_('Нептун · 12 декабря', 'Neptune · 12 December'), a: q(1.3), dy: 74, dx: -40, fill: C.gold2 },
      { k: 'J', text: T_('Юпитер · 13 декабря', 'Jupiter · 13 December'), a: q(2.1), dy: -70, dx: 20, fill: C.gold2 },
    ];
    SPACE.draw(g, 'wheel', t, X);
  },
  lanes(g, t) {
    const t0 = CUE.loop - .3, y0 = 2026.5;
    const year = y0 + Math.max(0, t - t0) * .105;
    SPACE.draw(g, 'lanes', t, { t0, y0, year, az: .55, rr: 11.5, hh: 15, lx: 0, lz: 1, tagAt: CUE.y1896 });
  },
  book(g, t) { shotBook(g, t, {}); },
  eclipse(g, t) {
    const b = BEAT.b13;
    const f = track([[CUE.ecl - .4, .1], [CUE.sp, .19], [CUE.af, .42], [CUE.lux, .663], [b.end + 1.2, .76, 'l']], t);
    SPACE.draw(g, 'eclipse', t, { b, f, bloom: .42 });
  },
  knot(g, t) {
    const b = BEAT.b14;
    const date = track([[b.start - .3, dm('2027-11-20')], [CUE.s2, dm('2028-04-13')], [CUE.sq, dm('2028-06-24')], [CUE.tri, dm('2028-10-01')], [CUE.tri + 40, dm('2028-10-08')]], t);
    const WIDE = [.4, .1, 15.4, 18.4, 1.36];
    const cm = track([[b.start, WIDE], [CUE.s2 - .6, WIDE], [CUE.s2 + .2, [3, -2, 10.8, 13, 1.26]], [CUE.sq - .4, [3, -2, 10.8, 13, 1.26]], [CUE.sq + .6, [2.2, .4, 12.4, 14.8, 1.3]], [CUE.tri - .6, [2.2, .4, 12.4, 14.8, 1.3]], [CUE.tri + .4, WIDE], [CUE.tri + 40, WIDE]], t);
    const X = { t0: t - .001, date, lx: cm[0], lz: cm[1], rr: cm[2], hh: cm[3], az: cm[4], tags: [] };
    const s2 = ramp(t, CUE.s2 - .1, CUE.s2 + .3), sq = ramp(t, CUE.sq - .1, CUE.sq + .3), tri = ramp(t, CUE.tri - .1, CUE.tri + .3);
    if (t < CUE.tri - .1) {
      X.tags.push({ k: 'S', text: t < CUE.sq ? T_('Сатурн · Телец', 'Saturn · Taurus') : T_('Сатурн · 8°23′ Тельца', 'Saturn · 8°23′ Taurus'), a: s2, dy: -66 });
      if (t >= CUE.sq - .1) { X.figure = { kind: 'square', keys: ['S', 'P'], a: EASE.io(ramp(t, CUE.sq, CUE.sq + .8)) }; X.tags.push({ k: 'P', text: T_('Плутон · 8°23′ Водолея', 'Pluto · 8°23′ Aquarius'), a: sq, dy: -60 }); }
      if (t < CUE.sq) { X.sector = 1; X.sectorA = s2; }
    } else {
      X.figure = { kind: 'tri', keys: ['J', 'U', 'P'], a: EASE.io(ramp(t, CUE.tri + .05, CUE.tri + 1.4)), fill: true };
      X.tags.push({ k: 'J', text: T_('Юпитер · Весы', 'Jupiter · Libra'), a: ramp(t, CUE.tri + .2, CUE.tri + .5), dy: -10, dx: 190, size: 25 });
      X.tags.push({ k: 'U', text: T_('Уран · Близнецы', 'Uranus · Gemini'), a: ramp(t, CUE.tri + .6, CUE.tri + .9), dy: -60, size: 25 });
      X.tags.push({ k: 'P', text: T_('Плутон · Водолей', 'Pluto · Aquarius'), a: ramp(t, CUE.tri + 1, CUE.tri + 1.3), dy: -60, size: 25 });
    }
    SPACE.draw(g, 'wheel', t, X);
  },
  helix(g, t) {
    const b = BEAT.b15;
    const camYear = track([[b.start - .3, 2026.9], [CUE.h32, 2032.5], [CUE.h40 - .05, 2040.8], [CUE.h40 + 1.15, 2060.6], [CUE.h40 + 2.3, 2080.3], [CUE.h2597, 2093], [CUE.h2597 + 40, 2093]], t);
    const label = LANG === 'ru' ? `${Math.floor(camYear)} год` : `${Math.floor(camYear)}`;
    SPACE.draw(g, 'helix', t, { b, camYear, camLabel: label, labelA: ramp(t, b.start - .2, b.start + .3) * (1 - ramp(t, CUE.h2597 - .4, CUE.h2597)) });
  },
  border(g, t) {
    const year = track([[CUE.h2597 + .1, 2026], [BEAT.b15.end - .2, 2597]], t);
    SPACE.draw(g, 'zodiac', t, { b: { start: CUE.h2597 - 4.6 }, year, tEra: 1e9, border: BEAT.b15.end - .2 });
  },
  starChart(g, t) { shotStarChart(g, t, { t0: CUE.star - .3, t1: CUE.crab + .25 }); },
  crab(g, t) { SPACE.draw(g, 'crab', t, { t0: CUE.crab - .45, dur: CUE.end - CUE.crab + 1, bloom: .6 }); },
  deed2(g, t) { shotDeed2(g, t, { t0: CUE.end + .1, dur: CUE.last - CUE.end + .1 }); },
  ending(g, t) {
    scene1(g, Math.max(t, 200));
    const k = ramp(t, TL.total - 1.7, TL.total - .15);
    if (k > 0) { g.fillStyle = `rgba(4,3,2,${EASE.io(k)})`; g.fillRect(0, 0, W, H); }
  },
};

// ---------- the order, and how each shot arrives ----------
const SEQ = [
  { s: 'opening', at: () => 0 },
  { s: 'drift', at: () => CUE.old - .12, tr: 'cut' },
  { s: 'wobble', at: () => BEAT.b03.start - .3, tr: 'wipe' },
  { s: 'pole', at: () => BEAT.b04.start - .25, tr: 'cut' },
  { s: 'zodiac', at: () => BEAT.b05.start - .35, tr: 'fade' },
  { s: 'ages', at: () => BEAT.b06.start - .15, tr: 'wipe' },
  { s: 'pins', at: () => BEAT.b07.start - .15, tr: 'wipe' },
  { s: 'orrery', at: () => BEAT.b08.start - .2, tr: 'wipe' },
  { s: 'conj', at: () => BEAT.b09.start - .3, tr: 'fade' },
  { s: 'signs', at: () => CUE.sign - .3, tr: 'fade' },
  { s: 'wheel', at: () => BEAT.b10.start - .3, tr: 'fade' },
  { s: 'wheelNow', at: () => BEAT.b11.start - .3, tr: 'fade' },
  { s: 'lanes', at: () => CUE.loop - .3, tr: 'fade' },
  { s: 'book', at: () => BEAT.b12.start - .15, tr: 'wipe' },
  { s: 'eclipse', at: () => BEAT.b13.start - .15, tr: 'wipe' },
  { s: 'knot', at: () => BEAT.b14.start - .3, tr: 'fade' },
  { s: 'helix', at: () => BEAT.b15.start - .3, tr: 'fade' },
  { s: 'border', at: () => CUE.h2597 - .25, tr: 'fade' },
  { s: 'clock', at: () => BEAT.b16.start - .3, tr: 'fade' },
  { s: 'starChart', at: () => CUE.star - .3, tr: 'fade' },
  { s: 'crab', at: () => CUE.crab - .2, tr: 'fade' },
  { s: 'deed2', at: () => CUE.end - .25, tr: 'wipe' },
  { s: 'ending', at: () => CUE.last + .55, tr: 'fade' },
].map((q) => ({ ...q, t: q.at() }));
const FADE = .55, WIPE_D = 1.5;
let TMP = null, TMPG = null;

const FILM = {
  get DUR() { return TL.total; },
  SEQ,
  async init(space) {
    SPACE = space;
    SLATE = plate(drawSlate);
    TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H; TMPG = TMP.getContext('2d', { alpha: false, willReadFrequently: true });
    // the opening's acting is laid on the words: star flares on "blazed", she plants it on "pinned"
    const F = CUE.flare, P = CUE.plant, Rch = P - 3.62;
    const pl = (pts) => (x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 0; i < pts.length - 1; i++) { const [a, u] = pts[i], [b, v] = pts[i + 1]; if (x < b) return u + (v - u) * (x - a) / (b - a); } const [a, u] = pts[pts.length - 1]; return Math.min(8, u + (x - a)); };
    WARP.arm = pl([[0, 0], [1.8, 1.8], [Rch, 3.1], [P, 6.72]]);
    WARP.head = pl([[0, 0], [1.8, 1.8], [F, 3.1], [F + .7, 3.8], [Rch + .7, 3.81], [P, 6.72]]);
    WARP.flare = F;
  },
  frame(g, t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    let i = 0;
    for (let k = 0; k < SEQ.length; k++) if (t >= SEQ[k].t) i = k;
    const cur = SEQ[i];
    // a wipe also shows the shot before it while the band is still on its way
    const nextI = i + 1 < SEQ.length ? i + 1 : -1;
    const nextWipe = nextI >= 0 && SEQ[nextI].tr === 'wipe' && t >= SEQ[nextI].t - WIPE_D / 2;
    const curWipe = cur.tr === 'wipe' && t < cur.t + WIPE_D / 2;
    if (nextWipe || curWipe) {
      const to = nextWipe ? SEQ[nextI] : cur, from = nextWipe ? cur : SEQ[i - 1];
      const p = ramp(t, to.t - WIPE_D / 2, to.t + WIPE_D / 2);
      const WW = wipeGeom(EASE.io(p));
      SHOT[from.s](g, t);
      g.save();
      g.clip(poly(WW.trailing.concat([[W + 2000, -2000], [W + 2000, H + 2000], [WW.footX, H + 2000]])));
      SHOT[to.s](g, t);
      g.restore();
      paintWipe(g, WW);
    } else if (cur.tr === 'fade' && t < cur.t + FADE) {
      SHOT[SEQ[i - 1].s](g, t);
      TMPG.setTransform(1, 0, 0, 1, 0, 0);
      SHOT[cur.s](TMPG, t);
      g.save(); g.globalAlpha = EASE.io(ramp(t, cur.t, cur.t + FADE)); g.drawImage(TMP, 0, 0); g.restore();
    } else {
      SHOT[cur.s](g, t);
    }
    applyGrain(g);
    if (t < 0.22) { g.fillStyle = `rgba(0,0,0,${1 - t / 0.22})`; g.fillRect(0, 0, W, H); }
  },
};

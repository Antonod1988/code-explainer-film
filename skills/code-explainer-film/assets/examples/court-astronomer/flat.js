// flat.js: language, parchment tags, and the flat manuscript shots between the 3D inserts.
'use strict';
const LANG = new URLSearchParams(location.search).get('lang') || 'ru';
const T_ = (ru, en) => (LANG === 'ru' ? ru : en);
const FONT = '"Segoe Print", "Palatino Linotype", serif';
const ramp2 = (t, a, b) => clamp((t - a) / (b - a));
const io = EASE.io;

// a parchment label with notched ends, on a thin stem from its anchor
function tag(g, x, y, text, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0.003) return;
  const size = o.size || 30;
  const dx = o.dx == null ? 0 : o.dx, dy = o.dy == null ? -70 : o.dy;
  const cx = x + dx, cy = y + dy;
  g.save();
  g.globalAlpha = a;
  const k = 0.82 + 0.18 * EASE.b(a);
  g.font = `700 ${size}px ${FONT}`;
  const w = g.measureText(text).width, hw = w / 2 + size * .62, hh = size * .78, n = size * .34;
  if (!o.stemless) { line(g, [[x, y], [cx, cy + (dy < 0 ? hh : -hh) * .9]], C.parch3, 3); g.fillStyle = C.parch3; g.fill(circle(x, y, 4)); }
  g.translate(cx, cy); g.scale(k, k); g.rotate(rad(o.rot || 0));
  ink(g, poly([[-hw - n, -hh], [hw + n, -hh], [hw, 0], [hw + n, hh], [-hw - n, hh], [-hw, 0]]), o.fill || C.parch, 2.6);
  g.fillStyle = o.color || INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 0, size * .05);
  g.restore();
}
// the larger plaque used for dates: a strip with a star at each end
function plaque(g, text, x, y, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0.003) return;
  const size = o.size || 42;
  g.save();
  g.globalAlpha = a;
  g.font = `700 ${size}px ${FONT}`;
  const w = g.measureText(text).width, hw = w / 2 + size * 1.2, hh = size * .86;
  g.translate(x, y);
  ink(g, poly([[-hw - 26, -hh + 8], [-hw, -hh], [hw, -hh], [hw + 26, -hh + 8], [hw + 10, 0], [hw + 26, hh - 8], [hw, hh], [-hw, hh], [-hw - 26, hh - 8], [-hw - 10, 0]]), C.parch, 3);
  line(g, [[-hw + 8, -hh + 9], [hw - 8, -hh + 9]], C.khaki, 2.6, [10, 8]);
  line(g, [[-hw + 8, hh - 9], [hw - 8, hh - 9]], C.khaki, 2.6, [10, 8]);
  for (const m of [-1, 1]) ink(g, star(m * (hw - size * .42), 0, size * .36, size * .14), C.brick2, 0);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 0, size * .05);
  g.restore();
}
// brass eyepiece around a 3D view
function eyepiece(g, a) {
  if (a <= 0) return;
  const cx = W / 2, cy = H / 2 + 8, R = 512;
  g.save(); g.globalAlpha = a;
  const m = new Path2D(); m.rect(0, 0, W, H); m.arc(cx, cy, R, 0, Math.PI * 2, true);
  g.fillStyle = '#10211f'; g.fill(m, 'evenodd');
  const R2 = rng(4);
  for (let i = 0; i < 40; i++) { const x = R2() * W, y = R2() * H; if (Math.hypot(x - cx, y - cy) > R + 60) { ink(g, star(x, y, 4 + R2() * 7, 2), C.chalk2, 0); } }
  g.lineWidth = 34; g.strokeStyle = C.gold3; g.stroke(circle(cx, cy, R + 14));
  g.lineWidth = 10; g.strokeStyle = C.gold; g.stroke(circle(cx, cy, R + 4));
  g.lineWidth = 3.2; g.strokeStyle = INK; g.stroke(circle(cx, cy, R)); g.stroke(circle(cx, cy, R + 31));
  for (let i = 0; i < 120; i++) { const q = i * Math.PI / 60, l = i % 5 ? 12 : 22; line(g, [[cx + Math.cos(q) * (R + 12), cy + Math.sin(q) * (R + 12)], [cx + Math.cos(q) * (R + 12 + l), cy + Math.sin(q) * (R + 12 + l)]], INK, i % 5 ? 2 : 3.2); }
  g.restore();
}

// ---------- drift: the stars crawl across a fixed grid ----------
function driftChart(g, t, a0, year, tagA) {
  g.fillStyle = C.night; g.fillRect(0, 0, W, H);
  // the coordinate grid does not move
  const lon0 = 40, lon1 = 112, X = (l) => 80 + (l - lon0) / (lon1 - lon0) * (W - 160), Y = (b) => H / 2 + 60 - b * 24;
  for (let l = 40; l <= 112; l += 10) line(g, [[X(l), 150], [X(l), H - 110]], C.chalk2, 2.2, [10, 11]);
  for (let b = -15; b <= 15; b += 5) line(g, [[60, Y(b)], [W - 60, Y(b)]], C.chalk2, b === 0 ? 3.2 : 1.8, b === 0 ? null : [4, 13]);
  // parchment rule above and below
  ink(g, poly([[-6, -6], [W + 6, -6], [W + 6, 140], [-6, 140]]), C.khaki);
  ink(g, poly([[-6, H - 100], [W + 6, H - 100], [W + 6, H + 6], [-6, H + 6]]), C.khaki);
  for (let l = 40; l <= 112; l += 2) { const big = l % 10 === 0; line(g, [[X(l), 140], [X(l), 140 - (big ? 26 : 12)]], INK, big ? 3.2 : 2); line(g, [[X(l), H - 100], [X(l), H - 100 + (big ? 26 : 12)]], INK, big ? 3.2 : 2); }
  g.font = `700 25px ${FONT}`; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let l = 40; l <= 110; l += 10) g.fillText(`${l}°`, X(l), 88);
  // real Taurus and its neighbours (ecliptic coordinates J2000); shift them back to the year shown
  const shift = (y) => (y - 2000) * 50.29 / 3600;
  const old = shift(-129), now = shift(year);
  for (const key of ['Tau', 'Ari', 'Gem']) {
    const con = DATA.constellations[key];
    // Hipparchus' positions stay behind in red chalk
    const P = (s, sh) => [X(s[0] + sh), Y(s[1])];
    for (const e of con.e) line(g, [P(con.s[e[0]], old), P(con.s[e[1]], old)], '#c2583a', 3, [8, 9]);
    for (const s of con.s) { const p = P(s, old); g.fillStyle = '#c2583a'; g.fill(circle(p[0], p[1], 5.2)); }
    if (a0 > 0) {
      g.save(); g.globalAlpha = a0;
      for (const e of con.e) line(g, [P(con.s[e[0]], now), P(con.s[e[1]], now)], C.parch3, 3.4);
      for (const s of con.s) { const p = P(s, now), q = P(s, old); if (s[2] < 3.2) line(g, [q, p], C.gold, 2.2, [3, 7]); ink(g, star(p[0], p[1], 19 - s[2] * 3, 3.2), C.gold2, 0); }
      g.restore();
    }
  }
  tag(g, X(50), H - 210, T_('Гиппарх, ок. 130 г. до н. э.', 'Hipparchus, c. 130 BC'), { a: tagA, dy: 0, stemless: true, size: 30, fill: '#e8c7a8' });
  if (a0 > 0) plaque(g, yearText2(year), W - 330, 240, { a: a0, size: 40 });
}
const yearText2 = (y) => { y = Math.round(y); return y <= 0 ? T_(`${1 - y} до н. э.`, `${1 - y} BC`) : T_(`${y} год`, y < 1000 ? `AD ${y}` : `${y}`); };

// ---------- banners ----------
function banner(g, x, y, w, h, o) {
  // rod and cords
  ink(g, poly([[x - w / 2 - 52, y - 44], [x + w / 2 + 52, y - 44], [x + w / 2 + 52, y - 28], [x - w / 2 - 52, y - 28]]), C.gold3);
  for (const m of [-1, 1]) { ink(g, circle(x + m * (w / 2 + 62), y - 36, 16), C.gold); ink(g, poly([[x + m * w * .36, y - 28], [x + m * w * .38, y + 4], [x + m * w * .34, y + 4]]), C.khaki2, 2); }
  // cloth with a scalloped foot
  const n = 5, p = new Path2D(); p.moveTo(x - w / 2, y); p.lineTo(x + w / 2, y); p.lineTo(x + w / 2, y + h);
  for (let i = 0; i < n; i++) { const x0 = x + w / 2 - w * i / n, x1 = x + w / 2 - w * (i + 1) / n; p.quadraticCurveTo((x0 + x1) / 2, y + h + 70, x1, y + h); }
  p.closePath();
  ink(g, p, o.col);
  g.save(); g.clip(p);
  g.fillStyle = o.shade; g.fillRect(x - w / 2, y, w * .1, h + 90);
  for (let r = 0; r < 8; r++) for (let i = 0; i < 9; i++) { ink(g, star(x - w / 2 + 40 + i * (w - 60) / 8 + (r % 2 ? 30 : 0), y + 170 + r * 92, 8, 2.6, 4), o.motif, 0); }
  g.restore();
  line(g, [[x - w / 2 + 22, y + 18], [x + w / 2 - 22, y + 18], [x + w / 2 - 22, y + h - 6]], o.line, 4, [14, 11]);
  line(g, [[x - w / 2 + 22, y + 18], [x - w / 2 + 22, y + h - 6]], o.line, 4, [14, 11]);
  for (let i = 0; i <= n; i++) { const tx = x + w / 2 - w * i / n; if (i > 0 && i < n) { ink(g, poly([[tx - 9, y + h + 2], [tx + 9, y + h + 2], [tx, y + h + 38]]), o.line, 2); ink(g, circle(tx, y + h + 4, 7), C.gold, 2); } }
  // title
  g.save(); g.fillStyle = o.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 76px ${FONT}`; g.fillText(o.title, x, y + 82);
  g.font = `700 29px ${FONT}`; g.fillText(o.range, x, y + 140);
  g.restore();
}
function drawBull(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const bob = Math.sin(step(t, 8) * 2.1) * 3;
  // far legs
  for (const [a, b] of [[78, 200], [-118, 200]]) ink(g, taperPath([[a + 6, 40], [a, 110], [a + 2, b]], (u) => lerp(46, 20, u)), '#1d120d');
  // tail
  const sw = Math.sin(step(t, 6) * 1.7) * 10;
  ink(g, taperPath([[-224, -52], [-262 - sw * .3, 10], [-250 - sw, 96]], (u) => lerp(14, 7, u)), '#2b1c15');
  ink(g, S([[-262 - sw, 88], [-244 - sw, 86], [-238 - sw, 130], [-256 - sw, 150], [-270 - sw, 126]]), C.saffron);
  // body
  const body = S([[-236, -40], [-200, -94], [-110, -112], [10, -128], [62, -150], [120, -130], [150, -96], [170, -40], [150, 30], [120, 72], [20, 92], [-110, 84], [-210, 66], [-244, 16]]);
  ink(g, body, '#2b1c15');
  g.save(); g.clip(body);
  // patterned blanket
  const blanket = poly([[-150, -130], [100, -160], [70, 40], [-120, 50]]);
  ink(g, blanket, C.brick3, 3, C.gold);
  g.save(); g.clip(blanket);
  for (let i = -8; i < 12; i++) { line(g, [[-200 + i * 44, -180], [-40 + i * 44, 70]], C.gold, 3, [10, 8]); line(g, [[-40 + i * 44, -180], [-200 + i * 44, 70]], C.gold, 3, [10, 8]); }
  g.restore();
  ink(g, star(-30, -44, 44, 18), C.gold2);
  ink(g, circle(-30, -44, 13), C.brick2, 2.4);
  g.fillStyle = '#3a291f'; g.fill(S([[-244, 60, 1], [-120, 76], [20, 84], [130, 60], [150, 110, 1], [-250, 110, 1]]));
  g.restore();
  ink(g, body, null);
  // near legs
  for (const [a, b] of [[126, 200], [-176, 200]]) { ink(g, taperPath([[a - 2, 30], [a + 4, 110], [a + 2, b]], (u) => lerp(58, 22, u)), '#2b1c15'); ink(g, poly([[a - 15, b - 2], [a + 19, b - 2], [a + 23, b + 18], [a - 19, b + 18]]), C.gold); }
  // head
  g.save(); g.translate(158, -66 + bob);
  ink(g, S([[-34, -46], [22, -56], [66, -40], [112, 12], [126, 50], [106, 72], [66, 64], [20, 40], [-30, 30]]), '#2b1c15');
  g.fillStyle = '#3a291f'; g.fill(S([[70, 40, 1], [112, 44], [108, 64], [70, 58]]));
  // lyre horns with the disc between them
  const hornL = taperPath([[-6, -50], [-40, -96], [-34, -150], [10, -176]], (u) => lerp(24, 4, u));
  const hornR = taperPath([[34, -52], [70, -92], [78, -140], [52, -178]], (u) => lerp(24, 4, u));
  ink(g, circle(28, -128, 44), C.brick2); ink(g, circle(28, -128, 26), C.gold2, 0);
  ink(g, star(28, -128, 22, 9), C.brick2, 0);
  ink(g, hornL, C.cream); ink(g, hornR, C.cream);
  // eye, ear, nostril
  ink(g, S([[-40, -20], [-74, -34], [-90, -10], [-52, 0]]), '#3a291f');
  const blink = (step(t, 12) * 12) % 53 < 2;
  if (blink) line(g, [[34, -14], [64, -8]], C.cream, 4);
  else { ink(g, S([[32, -16], [48, -28], [68, -10], [50, -2]]), C.cream, 2); g.fillStyle = INK; g.fill(circle(50, -14, 7)); }
  ink(g, ellipse(104, 46, 7, 4), C.khaki2, 0);
  for (const k of [-16, 0, 16]) ink(g, circle(k - 14, 30 + Math.abs(k) * .2, 7), C.gold, 2);
  g.restore();
  g.restore();
}
function drawRam(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const bob = Math.sin(step(t, 8) * 1.9) * 3;
  for (const a of [-120, 96]) ink(g, taperPath([[a + 12, 40], [a + 8, 130], [a + 10, 196]], (u) => lerp(36, 16, u)), '#3a291f');
  for (const a of [-158, 140]) { ink(g, taperPath([[a, 40], [a - 4, 130], [a, 196]], (u) => lerp(42, 18, u)), '#4a3528'); ink(g, poly([[a - 14, 192], [a + 14, 192], [a + 18, 210], [a - 18, 210]]), INK, 0); }
  // woolly body: rows of curls
  ink(g, ellipse(0, -10, 228, 118), C.gold);
  const Rq = rng(77);
  for (let i = 0; i < 46; i++) {
    const a = i / 46 * Math.PI * 2, bx = Math.cos(a) * 214, by = -10 + Math.sin(a) * 104;
    ink(g, circle(bx, by, 32), C.gold);
  }
  ink(g, ellipse(0, -10, 214, 104), C.gold, 0);
  for (let r = 0; r < 4; r++) for (let i = -5; i <= 5; i++) {
    const cx = i * 40 + (r % 2 ? 20 : 0), cy = -72 + r * 42, q = 1 - (cx * cx) / (210 * 210) - ((cy + 10) * (cy + 10)) / (104 * 104);
    if (q < .05) continue;
    line(g, [[cx - 16, cy + 6], [cx - 8, cy - 8], [cx + 6, cy - 10], [cx + 15, cy + 2], [cx + 6, cy + 10], [cx - 3, cy + 4]], C.saffron2, 4, null, true);
  }
  // head to the left
  g.save(); g.translate(-210, -66 + bob);
  ink(g, S([[52, -44], [-4, -62], [-58, -44], [-112, 6], [-126, 40], [-98, 60], [-56, 56], [-6, 38], [50, 40]]), '#4a3528');
  g.fillStyle = '#3a291f'; g.fill(S([[-70, 34, 1], [-116, 36], [-100, 58], [-60, 52]]));
  ink(g, circle(-14, -92, 40), C.brick2); ink(g, circle(-14, -92, 24), C.gold2, 0);
  // the horn: a thick spiral
  const sp = []; for (let i = 0; i <= 26; i++) { const a = -0.6 + i * 0.36, r = 84 - i * 2.75; sp.push([30 + Math.cos(a) * r, -12 + Math.sin(a) * r]); }
  ink(g, taperPath(sp, (u) => lerp(32, 7, u), 3), C.cream);
  for (let i = 3; i < 25; i += 3) { const q = sp[i], n = sp[i + 1]; const dx = n[1] - q[1], dy = q[0] - n[0], l = Math.hypot(dx, dy) || 1, w = lerp(14, 3, i / 26); line(g, [[q[0] + dx / l * w, q[1] + dy / l * w], [q[0] - dx / l * w, q[1] - dy / l * w]], C.khaki2, 2.4); }
  const blink = (step(t, 12) * 12) % 47 < 2;
  if (blink) line(g, [[-58, -16], [-30, -12]], C.cream, 4);
  else { ink(g, S([[-62, -14], [-46, -28], [-24, -12], [-44, -4]]), C.gold2, 2); g.fillStyle = INK; g.fill(circle(-44, -15, 6.4)); }
  ink(g, ellipse(-104, 40, 6, 4), INK, 0);
  g.restore();
  g.restore();
}
function drawFish(g, x, y, s, flip, t, col, col2) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  const wag = Math.sin(step(t, 8) * 4.2) * 12;
  g.rotate(Math.sin(step(t, 8) * 1.3) * .03);
  const f = S([[-188, 0, 1], [-90, -66], [40, -62], [132, -14], [202, -60 + wag, 1], [186, wag * .5], [202, 60 + wag, 1], [132, 14], [40, 62], [-90, 66]]);
  ink(g, f, col);
  g.save(); g.clip(f);
  g.fillStyle = col2; g.fill(S([[-188, 8, 1], [-80, 22], [60, 18], [230, 12, 1], [230, 90, 1], [-188, 90, 1]]));
  for (let c = 0; c < 8; c++) for (let r = -2; r <= 2; r++) {
    const cx = -70 + c * 28, cy = r * 26 + (c % 2 ? 13 : 0);
    line(g, [[cx + 8, cy - 13], [cx - 7, cy], [cx + 8, cy + 13]], 'rgba(23,16,12,.45)', 2.4, null, true);
  }
  g.restore();
  ink(g, f, null);
  line(g, [[-104, -48], [-96, 48]], INK, 3, null, false);
  ink(g, S([[-40, -62], [-6, -96], [40, -60]]), col2);
  ink(g, S([[-30, 62], [-2, 88], [30, 60]]), col2);
  ink(g, circle(-138, -12, 15), C.parch3, 2.4); g.fillStyle = INK; g.fill(circle(-141, -13, 7));
  g.restore();
}
function drawPisces(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const w = Math.sin(step(t, 8) * 2) * 8;
  line(g, [[208, -110], [130, -10 + w], [40, 30 - w], [-70, 12 + w], [-210, 116]], C.gold2, 5, null, true);
  ink(g, star(40, 30 - w, 26, 9), C.gold2);
  drawFish(g, -40, -112, .96, false, t, C.teal3, C.parch);
  drawFish(g, 50, 122, .96, true, t + .7, C.parch, C.teal3);
  g.restore();
}
function drawWaterBearer(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // falling water, three wavy dashed lines of stars
  g.save();
  const off = -step(t, 12) * 70;
  for (const [dx, col] of [[0, '#8fe0d8'], [24, C.parch3], [-24, '#5fb8b0']]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const yy = -46 + i * 24; pts.push([-120 + dx - i * 5 + Math.sin(i * .9 + t * 3) * 10, yy]); }
    g.setLineDash([20, 15]); g.lineDashOffset = off; g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = 7; g.stroke(S(pts, false));
  }
  g.restore();
  // robe
  ink(g, S([[-40, -70], [34, -96], [96, -40], [126, 90], [180, 210, 1], [-110, 210, 1], [-54, 80]]), C.parch);
  line(g, [[-30, 60], [10, 210]], C.khaki, 3); line(g, [[40, 40], [90, 210]], C.khaki, 3);
  ink(g, S([[-34, -66], [30, -92], [60, -60], [16, -18], [-30, -30]]), C.teal3);
  // head
  ink(g, S([[-2, -128], [36, -146], [62, -120], [58, -80], [24, -66], [-6, -86]]), C.skin);
  ink(g, S([[-8, -112], [20, -160], [70, -150], [82, -96], [58, -96], [56, -126], [20, -130]]), C.hair);
  g.fillStyle = INK; g.fill(ellipse(16, -106, 5, 3)); line(g, [[6, -118], [22, -120]], INK, 3);
  // arms and amphora
  ink(g, taperPath([[30, -50], [-30, -30], [-70, -56]], (u) => lerp(40, 24, u)), C.teal3);
  g.save(); g.translate(-112, -66); g.rotate(rad(-52));
  ink(g, S([[-16, -66], [16, -66], [44, -24], [38, 30], [14, 62], [-14, 62], [-38, 30], [-44, -24]]), C.gold);
  ink(g, poly([[-22, -82], [22, -82], [16, -62], [-16, -62]]), C.saffron);
  line(g, [[-40, 0], [40, 0]], C.brick, 5); line(g, [[-36, 18], [36, 18]], C.brick, 3, [7, 6]);
  g.restore();
  ink(g, taperPath([[-74, -58], [-92, -38], [-100, -20]], (u) => lerp(18, 13, u)), C.skin);
  g.restore();
}

function ageBanner(g, i, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const defs = [
    { col: C.brick, shade: C.brick3, motif: '#a84a2c', line: C.gold, ink: C.parch3, title: T_('Телец', 'Taurus'), range: T_('≈ 4500–1900 до н. э.', 'c. 4500–1900 BC'), art: () => drawBull(g, 0, 396, .9, t) },
    { col: C.saffron2, shade: '#8a5512', motif: '#b97f26', line: C.parch3, ink: '#2b1c15', title: T_('Овен', 'Aries'), range: T_('≈ 1900–70 до н. э.', 'c. 1900–70 BC'), art: () => drawRam(g, 30, 396, .9, t) },
    { col: C.teal2, shade: '#0d3633', motif: '#1f6a62', line: C.gold, ink: C.parch3, title: T_('Рыбы', 'Pisces'), range: T_('≈ 70 до н. э. – 2600', 'c. 70 BC – AD 2600'), art: () => drawPisces(g, 0, 372, .94, t) },
    { col: C.rose, shade: C.rose3, motif: '#a65a62', line: C.gold, ink: C.parch3, title: T_('Водолей', 'Aquarius'), range: T_('≈ 2600–4300', 'c. AD 2600–4300'), art: () => drawWaterBearer(g, 40, 372, .92, t) },
  ];
  const D = defs[i];
  banner(g, 0, 0, 640, 690, D);
  D.art();
  g.restore();
}
function wallGallery(g, camX) {
  g.fillStyle = C.wall; g.fillRect(0, 0, W, H);
  g.save(); g.translate(-camX * .35, 0);
  for (let x = -200; x < 6000; x += 92) line(g, [[x, 40], [x, H - 170]], C.wall2, 4, [22, 16]);
  g.restore();
  // floor and skirting
  ink(g, poly([[-6, H - 150], [W + 6, H - 150], [W + 6, H + 6], [-6, H + 6]]), C.wood2);
  g.fillStyle = C.saffron2; g.fillRect(0, H - 150, W, 14);
  g.save(); g.translate(-camX * 1.1 % 160, 0);
  for (let x = -160; x < W + 320; x += 160) line(g, [[x, H - 136], [x - 60, H]], C.wood, 4);
  g.restore();
}
function shotAges(g, t, X) {
  const xs = [0, 1100, 2200];
  const seg = (a, b) => io(ramp2(t, a, b));
  const camX = lerp(lerp(0, xs[1], seg(CUE.ari - .55, CUE.ari + .15)), xs[2], seg(CUE.psc - .55, CUE.psc + .15));
  const zo = io(ramp2(t, CUE.back - 1.0, CUE.back + .3));
  const scale = lerp(1.08, .56, zo), cam = lerp(camX, xs[1], zo);
  wallGallery(g, cam);
  g.save();
  g.translate(W / 2, 64 + zo * 150); g.scale(scale, scale);
  for (let i = 0; i < 3; i++) ageBanner(g, i, xs[i] - cam, 44, 1, t);
  g.restore();
  // the owl has its doubts
  const owlIn = EASE.b(ramp2(t, CUE.back - .15, CUE.back + .25));
  if (owlIn > 0) {
    const tt = t - CUE.back;
    const k = 1.75, ox = W - 300, oy = H + 150 - owlIn * 360;
    g.save(); g.translate(ox, oy); g.scale(k, k);
    drawOwl(g, 0, 0, { blink: (tt > .9 && tt < 1.1) ? .9 : 0, turn: tt > .35 ? -.9 : -.1, startle: 0, hop: 0, look: 0 });
    // one raised brow
    const brow = clamp(tt / .3), dxb = (tt > .35 ? -.9 : -.1) * 16 + (tt > .35 ? -.9 : -.1) * 7;
    line(g, [[dxb - 44, -216 - brow * 16], [dxb - 10, -200 - brow * 10]], INK, 4.4);
    g.restore();
    plaque(g, T_('задним числом', 'in hindsight'), 620, H - 92, { a: clamp(tt / .25), size: 44 });
  }
}

// ---------- pins: a long ruler of years ----------
function shotPins(g, t, X) {
  wallGallery(g, 0);
  const inT = io(ramp2(t, CUE.d1 - 1.0, CUE.d1 - .1));
  // Aquarius' banner, first alone, then up and to the side
  ageBanner(g, 3, lerp(W / 2, 1480, inT), lerp(68, 52, inT), lerp(1.08, .52, inT), t);
  // the ruler
  const y = lerp(H + 240, 650, inT);
  const x0 = 110, x1 = W - 110, y0 = 1350, y1 = 3700, X_ = (yr) => x0 + (yr - y0) / (y1 - y0) * (x1 - x0);
  ink(g, poly([[60, y - 44], [W - 60, y - 44], [W - 34, y], [W - 60, y + 44], [60, y + 44], [34, y]]), C.parch);
  g.fillStyle = C.parch2; g.fillRect(60, y + 26, W - 120, 17);
  line(g, [[60, y - 44], [W - 60, y - 44]], INK, LINE); line(g, [[60, y + 44], [W - 60, y + 44]], INK, LINE);
  for (let yr = 1400; yr <= 3700; yr += 100) { const big = yr % 500 === 0, xx = X_(yr); line(g, [[xx, y - 43], [xx, y - 43 + (big ? 30 : 15)]], INK, big ? 3.2 : 2); if (big) { g.font = `700 26px ${FONT}`; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${yr}`, xx, y + 13); } }
  // ages painted on the ruler: pisces, then aquarius
  const pinF = (yr, cue, text, col, up, o = {}) => {
    const a = EASE.b(ramp2(t, cue, cue + .32));
    if (a <= 0) return;
    const xx = X_(yr), h = (up ? 150 : -120) * a, top = y - 44 - h;
    line(g, [[xx, y - 44], [xx, top]], INK, 7); line(g, [[xx, y - 44], [xx, top]], C.gold, 3);
    ink(g, star(xx, top, 30 * a, 12 * a), col);
    ink(g, circle(xx, top, 8 * a), C.parch3, 2);
    tag(g, xx, top, text, { a: clamp(a), dy: up ? -70 : 72, dx: o.dx || 0, size: 30, fill: o.fill });
    if (ramp2(t, cue, cue + .4) < 1) { const u = ramp2(t, cue, cue + .4); for (let i = 0; i < 10; i++) { const q = i / 10 * Math.PI * 2 + .3, r0 = 30 + u * 70, r1 = r0 + (1 - u) * 30; line(g, [[xx + Math.cos(q) * r0, top + Math.sin(q) * r0], [xx + Math.cos(q) * r1, top + Math.sin(q) * r1]], C.gold2, 4 * (1 - u) + 1); } }
  };
  // today
  const aNow = ramp2(t, CUE.d1 - .4, CUE.d1);
  pinF(2026, CUE.d1 - .4, T_('сегодня · 2026', 'today · 2026'), C.parch3, false, { dx: -150 });
  pinF(1447, CUE.d1, T_('1447', '1447'), C.brick2, true);
  pinF(3597, CUE.d2, T_('3597', '3597'), C.brick2, true);
  pinF(2597, CUE.d3, T_('≈ 2597 · граница созвездий', '≈ 2597 · constellation border'), C.gold2, true, { fill: C.gold2 });
  // one life against the wait
  const L = ramp2(t, CUE.life - .1, CUE.life + .5);
  if (L > 0) {
    const a = X_(2026), b = X_(2026 + 85), c = X_(2597);
    line(g, [[a, y + 58], [lerp(a, b, io(L)), y + 58]], '#e0502a', 12);
    tag(g, a + 30, y + 64, T_('одна жизнь', 'one lifetime'), { a: clamp(L * 2), dy: 128, dx: 60, size: 28, fill: '#e8c7a8' });
    const k = io(ramp2(t, CUE.life + .25, CUE.life + 1));
    line(g, [[b + 8, y + 58], [lerp(b + 8, c, k), y + 58]], C.chalk, 5, [12, 10]);
    if (k > .9) tag(g, (b + c) / 2 + 30, y + 64, T_('ещё 570 лет', '570 years to go'), { a: (k - .9) * 10, dy: 62, size: 28 });
  }
  // the owl sits on the ruler at today and looks along it
  const oIn = EASE.b(ramp2(t, CUE.d1 - .1, CUE.d1 + .25));
  if (oIn > 0) {
    const tt = t - CUE.d1;
    const look = t > CUE.d3 ? .95 : (t > CUE.d2 ? .95 : (tt < .8 ? -.8 : .2));
    const k = .62 * oIn;
    g.save(); g.translate(X_(2026) + 90, y - 44); g.scale(k, k);
    drawOwl(g, 0, 0, { blink: blinkAt(t, [CUE.d2 + .6, CUE.d3 + 1.4, CUE.life + .7], .2), turn: look, startle: 0, hop: 0, look: 0 });
    g.restore();
  }
}

// ---------- the open book: what is exact, what is tradition ----------
function pageShape(x, y, w, h, left) {
  const p = new Path2D();
  if (left) { p.moveTo(x + w, y + 14); p.quadraticCurveTo(x + w * .5, y - 12, x, y + 4); p.lineTo(x, y + h); p.quadraticCurveTo(x + w * .5, y + h - 16, x + w, y + h + 14); }
  else { p.moveTo(x, y + 14); p.quadraticCurveTo(x + w * .5, y - 12, x + w, y + 4); p.lineTo(x + w, y + h); p.quadraticCurveTo(x + w * .5, y + h - 16, x, y + h + 14); }
  p.closePath();
  return p;
}
function miniEniac(g, cx, cy, t) {
  // a room of panels in a manuscript manner, lamps blinking
  ink(g, poly([[cx - 300, cy + 120], [cx + 300, cy + 120], [cx + 300, cy + 150], [cx - 300, cy + 150]]), C.khaki2);
  const Rr = rng(31);
  for (let i = 0; i < 6; i++) {
    const x = cx - 290 + i * 98;
    ink(g, poly([[x, cy - 130], [x + 90, cy - 130], [x + 90, cy + 120], [x, cy + 120]]), i % 2 ? C.slate : '#34423f');
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
      const on = (Math.floor(step(t, 8) * 8) + i * 3 + r * 5 + c * 7) % 7 < 2;
      g.fillStyle = on ? C.gold2 : '#1d2a28'; g.fill(circle(x + 16 + c * 19, cy - 108 + r * 24, 5.6));
    }
    line(g, [[x + 10, cy + 74], [x + 80, cy + 74]], C.parch2, 3); line(g, [[x + 10, cy + 92], [x + 80, cy + 92]], C.parch2, 3);
  }
  g.font = `700 25px ${FONT}`; g.fillStyle = INK; g.textAlign = 'center';
  g.fillText('0 1 1 0 1 0 0 1 · 1945–48', cx, cy - 158);
}
function miniWeb(g, cx, cy, t) {
  // a web of nodes with a crown over the busiest
  const R2 = rng(61), nodes = [];
  for (let i = 0; i < 22; i++) { const a = R2() * Math.PI * 2, r = 40 + R2() * 210; nodes.push([cx + Math.cos(a) * r * 1.2, cy + 30 + Math.sin(a) * r * .72]); }
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]); if (d < 130) line(g, [nodes[i], nodes[j]], C.khaki2, 2.4); }
  nodes.forEach((q, i) => { const on = (Math.floor(t * 5) + i) % 6 === 0; ink(g, circle(q[0], q[1], on ? 11 : 8), on ? C.gold2 : C.teal, 2.2); });
  ink(g, circle(cx, cy + 30, 30), '#b79a7a'); ink(g, S([[cx - 12, cy + 44], [cx - 16, cy + 22], [cx, cy + 30], [cx + 16, cy + 22], [cx + 12, cy + 44]]), C.parch3, 1.6);
  ink(g, poly([[cx - 36, cy - 14], [cx - 42, cy - 56], [cx - 18, cy - 34], [cx, cy - 66], [cx + 18, cy - 34], [cx + 42, cy - 56], [cx + 36, cy - 14]]), C.gold);
  for (const k of [-42, 0, 42]) ink(g, circle(cx + k, cy + (k ? -60 : -70), 6), C.brick2, 2);
}
function miniSignal(g, cx, cy, t) {
  // two towers and the teal planet: signals between twins
  for (const m of [-1, 1]) {
    const x = cx + m * 210;
    ink(g, poly([[x - 26, cy + 130], [x + 26, cy + 130], [x + 11, cy - 90], [x - 11, cy - 90]]), C.khaki2);
    for (let i = 0; i < 5; i++) line(g, [[x - 20 + i * 1.5, cy + 100 - i * 44], [x + 20 - i * 1.5, cy + 100 - i * 44]], INK, 2.4);
    ink(g, circle(x, cy - 100, 16), C.gold);
    for (let k = 0; k < 3; k++) { const ph = (t * 1.3 + k * .33) % 1, r = 22 + ph * 150; g.save(); g.globalAlpha = 1 - ph; g.strokeStyle = C.brick2; g.lineWidth = 4; const p = new Path2D(); p.arc(x, cy - 100, r, m < 0 ? -.8 : Math.PI - .8, m < 0 ? .8 : Math.PI + .8); g.stroke(p); g.restore(); }
  }
  ink(g, circle(cx, cy + 40, 66), '#7fd0c8'); line(g, [[cx - 62, cy + 18], [cx + 62, cy + 18]], '#5fb8b0', 5); line(g, [[cx - 62, cy + 54], [cx + 62, cy + 54]], '#5fb8b0', 5);
  const ring = new Path2D(); ring.ellipse(cx, cy + 40, 30, 104, .24, 0, Math.PI * 2); g.strokeStyle = INK; g.lineWidth = 7; g.stroke(ring); g.strokeStyle = C.parch; g.lineWidth = 3; g.stroke(ring);
}
function miniCloud(g, cx, cy, t) {
  const gr = clamp((t - CUE.bomb) / 1.4);
  const k = .62 + .38 * EASE.o(gr);
  g.save(); g.translate(cx, cy + 150); g.scale(k, k);
  ink(g, S([[-46, 0, 1], [-30, -90], [-22, -180], [22, -180], [30, -90], [46, 0, 1]]), '#6a5a4a');
  for (let i = 0; i < 4; i++) line(g, [[-20 + i * 13, -8], [-14 + i * 9, -170]], '#57493c', 3);
  const blobs = [[-110, -212, 54], [-58, -262, 62], [12, -288, 68], [84, -258, 60], [126, -206, 50], [50, -206, 62], [-30, -200, 64]];
  for (const [x, y, r] of blobs) ink(g, circle(x, y, r), '#7a6856');
  for (const [x, y, r] of blobs) { g.fillStyle = '#7a6856'; g.fill(circle(x, y, r - 3)); }
  g.fillStyle = '#5c4c3e'; for (const [x, y, r] of [[-90, -190, 34], [-20, -180, 40], [60, -186, 38], [116, -186, 26]]) g.fill(circle(x, y, r));
  g.fillStyle = C.brick2; for (const [x, y, r] of [[-30, -226, 22], [34, -240, 26], [88, -226, 16], [-76, -236, 14]]) g.fill(circle(x, y, r));
  ink(g, S([[-190, 0, 1], [-120, -20], [120, -20], [190, 0, 1]]), C.khaki2);
  g.restore();
  g.font = `700 27px ${FONT}`; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('1945', cx, cy - 214);
}
function miniNeural(g, cx, cy, t) {
  const layers = [3, 5, 5, 3];
  const pos = layers.map((n, l) => Array.from({ length: n }, (_, i) => [cx - 230 + l * 153, cy + 20 + (i - (n - 1) / 2) * 62]));
  const ph = Math.floor(t * 8);
  for (let l = 0; l < 3; l++) for (const a of pos[l]) for (const b of pos[l + 1]) { const on = (ph + Math.round(a[1] + b[1]) + l * 3) % 9 === 0; line(g, [a, b], on ? C.brick2 : C.parch2, on ? 3.6 : 2); }
  pos.forEach((col, l) => col.forEach((q, i) => { const on = (ph + l * 2 + i) % 5 === 0; ink(g, circle(q[0], q[1], 19), on ? C.gold2 : C.teal, 2.6); ink(g, circle(q[0], q[1], 6), on ? C.brick2 : C.teal3, 0); }));
}
function shotBook(g, t, X) {
  // table
  g.fillStyle = C.wood; g.fillRect(0, 0, W, H);
  for (let y = 40; y < H; y += 120) line(g, [[0, y], [W, y + 14]], C.wood2, 3);
  const z = io(ramp2(t, CUE.pw - .5, CUE.pw + .3));   // later the right page fills the view
  const sc = lerp(1, 1.4, z), ox = lerp(0, -410, z), oy = lerp(0, 16, z);
  g.save();
  g.translate(W / 2, H / 2); g.scale(sc, sc); g.translate(-W / 2 + ox, -H / 2 + oy);
  // cover
  ink(g, poly([[126, 96], [W - 126, 96], [W - 118, 996], [118, 996]]), C.brick3);
  line(g, [[150, 118], [W - 150, 118], [W - 144, 972], [144, 972], [150, 118]], C.gold, 4, [14, 10]);
  const pw = 820, py = 110, ph = 850;
  const L = pageShape(W / 2 - pw, py, pw, ph, true), Rp = pageShape(W / 2, py, pw, ph, false);
  ink(g, L, C.parch); ink(g, Rp, C.parch3);
  // gutter shadow
  g.save(); g.clip(L); g.fillStyle = 'rgba(92,70,52,.3)'; g.fillRect(W / 2 - 60, 80, 60, 920); g.restore();
  g.save(); g.clip(Rp); g.fillStyle = 'rgba(92,70,52,.3)'; g.fillRect(W / 2, 80, 44, 920); g.restore();
  // the question, across the spread
  const qA = ramp2(t, BEAT.b12.start + .1, BEAT.b12.start + .5) * (1 - ramp2(t, CUE.exact - .3, CUE.exact));
  if (qA > 0) {
    g.save(); g.globalAlpha = qA; g.font = `700 74px ${FONT}`; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(T_('Что всё это значит?', 'What does it all mean?'), W / 2, 500);
    g.restore();
  }
  // left page: EXACT
  const a1 = ramp2(t, CUE.exact - .05, CUE.exact + .2);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.globalAlpha = clamp(a1);
  g.font = `700 64px ${FONT}`; g.fillStyle = INK; g.fillText(T_('Точно', 'Exact'), W / 2 - pw / 2, 190);
  line(g, [[W / 2 - pw + 170, 232], [W / 2 - 170, 232]], INK, 3.4);
  const cx = W / 2 - pw / 2, cy = 410;
  for (const r of [46, 86, 126, 166]) line(g, Array.from({ length: 73 }, (_, i) => [cx + Math.cos(i * Math.PI / 36) * r, cy + Math.sin(i * Math.PI / 36) * r * .62]), C.khaki2, 2.6, [8, 8]);
  ink(g, star(cx, cy, 26, 12), C.saffron, 2.2);
  const tq = t * .9;
  for (const [r, k, col] of [[46, 2.4, C.teal], [86, 1.2, C.gold], [126, .6, C.parch2], [166, .3, C.brick2]]) ink(g, circle(cx + Math.cos(tq * k + r) * r, cy + Math.sin(tq * k + r) * r * .62, 10), col, 2.2);
  const rows = LANG === 'ru' ? ['21 декабря 2020', '20 февраля 2026', '21 июля 2026', '10–13 декабря 2026', '2 августа 2027', '24 июня 2028'] : ['21 December 2020', '20 February 2026', '21 July 2026', '10–13 December 2026', '2 August 2027', '24 June 2028'];
  g.font = `700 29px ${FONT}`; g.fillStyle = '#5c241c';
  rows.forEach((q, i) => { const ry = 590 + i * 54, on = ramp2(t, CUE.exact + .25 + i * .22, CUE.exact + .55 + i * .22); g.save(); g.globalAlpha = on; g.fillText(q, cx, ry); g.restore(); });
  g.restore();
  // a red line drawn down the middle of the book
  const lineA = ramp2(t, CUE.exact - .9, CUE.exact - .1);
  if (lineA > 0) line(g, [[W / 2, py - 4], [W / 2, lerp(py - 4, py + ph + 10, io(lineA))]], '#c2432a', 7);
  // right page: TRADITION and what it says
  const a2 = ramp2(t, CUE.trad - .05, CUE.trad + .2);
  g.save(); g.globalAlpha = clamp(a2);
  const rx = W / 2 + pw / 2;
  g.font = `700 64px ${FONT}`; g.fillStyle = INK; g.fillText(T_('Традиция', 'Tradition'), rx, 190);
  line(g, [[W / 2 + 170, 232], [W / 2 + pw - 170, 232]], INK, 3.4);
  const caption = (txt) => { g.font = `700 36px ${FONT}`; g.fillStyle = '#5c241c'; g.fillText(txt, rx, 858); };
  const vign = [
    [CUE.pw, () => { miniWeb(g, rx, 520, t); caption(T_('Плутон в Водолее', 'Pluto in Aquarius')); }],
    [CUE.un, () => { miniSignal(g, rx, 520, t); caption(T_('Уран в Близнецах', 'Uranus in Gemini')); }],
    [CUE.eniac, () => { miniEniac(g, rx, 540, t); caption(T_('ENIAC, транзистор, Шеннон', 'ENIAC, the transistor, Shannon')); }],
    [CUE.bomb, () => { miniCloud(g, rx, 500, t); caption(T_('…и бомба', '…and the bomb')); }],
    [CUE.ai, () => { miniNeural(g, rx, 520, t); caption(T_('Сегодня', 'Today')); }],
  ];
  let cur = -1; vign.forEach((q, i) => { if (t >= q[0] - .1) cur = i; });
  if (cur >= 0) {
    const since = t - (vign[cur][0] - .1), w = EASE.o(clamp(since / .28));
    g.save(); g.translate(rx, 520); g.scale(1, 1); g.globalAlpha = clamp(a2) * clamp(since / .16); g.translate(-rx + (1 - w) * 46, -520);
    vign[cur][1]();
    g.restore();
  } else if (t >= CUE.trad + .4) {
    // the verdict, stamped
    const u = EASE.b(ramp2(t, CUE.trad + 1.2, CUE.trad + 1.5));
    g.font = `700 35px ${FONT}`; g.fillStyle = '#5c241c';
    const lines_ = T_('Плутон · Нептун · Уран|сети · идеи · связь', 'Pluto · Neptune · Uranus|networks · ideas · signals').split('|');
    g.fillText(lines_[0], rx, 330); g.fillText(lines_[1], rx, 392);
    if (u > 0) {
      g.save(); g.translate(rx, 610); g.rotate(rad(-7)); g.scale(1 + (1 - u) * .5, 1 + (1 - u) * .5);
      const txt = T_('связи не найдено', 'no link found');
      g.font = `700 50px ${FONT}`; const wT = g.measureText(txt).width + 70;
      g.lineWidth = 7; g.strokeStyle = '#c2432a'; g.strokeRect(-wT / 2, -56, wT, 112); g.lineWidth = 3; g.strokeRect(-wT / 2 + 9, -47, wT - 18, 94);
      g.fillStyle = '#c2432a'; g.fillText(txt, 0, 4);
      g.restore();
    }
  }
  g.restore();
  g.restore();
}

// ---------- the same chart, closing on the star that was planted ----------
function shotStarChart(g, t, X) {
  const u = io(ramp2(t, X.t0, X.t1));
  const k = lerp(1.2, 4.6, u);
  const fx = 316, fy = 484;
  g.fillStyle = C.wood; g.fillRect(0, 0, W, H);
  g.save();
  g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-fx, -fy);
  g.save(); g.translate(W / 2, H / 2); g.rotate(rad(-8)); g.translate(-W / 2, -H / 2); drawChartLayer(g); g.restore();
  drawDeskPieces(g);
  g.restore();
}

// ---------- the last deed: under the old year she writes the new one ----------
let LETTER2 = null;
function shotDeed2(g, t, X) {
  if (!LETTER2) LETTER2 = buildLetter('Anno 2026', 1.3);
  g.save(); g.translate(W / 2, H / 2); g.rotate(rad(-8)); g.translate(-W / 2, -H / 2); drawChartLayer(g); g.restore();
  drawDeskPieces(g);
  const dx = 1000, dy = 110, da = rad(-2.6);
  g.save(); g.translate(16, 22); g.translate(dx, dy); g.rotate(da); g.fillStyle = 'rgba(16,8,4,.34)'; g.fillRect(-424, -30, 848, 1600); g.restore();
  g.save(); g.translate(dx, dy); g.rotate(da);
  drawDocSheet(g);
  // clean space under the old heading
  g.fillStyle = C.parch; g.fillRect(-352, 268, 704, 240);
  g.save(); g.translate(0, LETTER_Y); drawLettering(g, 1); g.restore();
  const wr = clamp((step(t, 12) - X.t0) / X.dur);
  let pen = LETTER2.strokes[0].q[0];
  const y2 = LETTER_Y + 210;
  g.save(); g.translate(0, y2); if (wr > 0) pen = drawLettering(g, wr, LETTER2); g.restore();
  drawDocRoller(g);
  g.restore();
  const inn = EASE.o(ramp2(t, X.t0 - .34, X.t0)), out = EASE.io(ramp2(t, X.t0 + X.dur + .05, X.t0 + X.dur + .3));
  if (inn > 0 && out < 1) {
    const ca = Math.cos(da), sa = Math.sin(da);
    const lx = pen[0], ly = pen[1] + y2;
    const nib = [dx + ca * lx - sa * ly, dy + sa * lx + ca * ly];
    const away = (1 - inn) + out;
    const nx = nib[0] + away * 900, ny = nib[1] + away * 420;
    const ang = rad(200), fk0 = handFK(0, 0, ang, 1.0, false, POSES.grip);
    const wx = nx + 30 - fk0.pinch[0], wy = ny - 58 - fk0.pinch[1];
    g.save(); g.translate(nx, ny); drawQuill(g); g.restore();
    const elbow = [wx + 1500, wy + 520];
    const dd = drawArm(g, [elbow[0] + 240, elbow[1] + 60], elbow, [wx, wy], 1);
    drawHand(g, wx, wy, ang, 1.0, false, POSES.grip);
    drawCuff(g, [wx, wy], dd, 52);
  }
}

// scene1.js: the court astronomer at her chart table. Everything is flat colour with thin ink lines.
'use strict';
let WALL = null, TABLE = null;

// ---------- the wall: a frieze and two horseshoe windows ----------
function skyLeft(g, cx) {
  // crescent moon
  ink(g, crescentPath(cx - 92, 262, 44, 24, 37, rad(-28)), C.cream, 2.6);
  const stars = [[cx + 50, 240, 11], [cx + 98, 318, 8], [cx + 28, 372, 7], [cx - 96, 420, 8], [cx + 86, 466, 9], [cx - 30, 500, 6]];
  line(g, stars.slice(0, 3).map((q) => q.slice(0, 2)), C.chalk2, 2.4, [7, 8]);
  line(g, [stars[2].slice(0, 2), [cx - 96, 420], [cx - 30, 500]], C.chalk2, 2.4, [7, 8]);
  for (const q of stars) ink(g, star(q[0], q[1], q[2], q[2] * 0.36), C.gold2, 0);
  dots(g, [[cx - 8, 200], [cx - 130, 340], [cx + 128, 396], [cx + 16, 448], [cx - 70, 470], [cx + 120, 240]], 2.6, C.chalk);
  // sea of hills and a far tower
  ink(g, S([[cx - 200, 610, 1], [cx - 110, 580], [cx - 20, 604], [cx + 80, 572], [cx + 200, 598, 1], [cx + 200, 720, 1], [cx - 200, 720, 1]]), C.night2, 0);
  ink(g, poly([[cx + 40, 586], [cx + 40, 520], [cx + 34, 514], [cx + 34, 500], [cx + 74, 500], [cx + 74, 514], [cx + 68, 520], [cx + 68, 586]]), C.night3, 0);
  ink(g, S([[cx - 200, 650, 1], [cx - 60, 628], [cx + 60, 652], [cx + 200, 634, 1], [cx + 200, 720, 1], [cx - 200, 720, 1]]), C.night3, 0);
}
function skyRight(g, cx) {
  // a comet with a dashed tail
  ink(g, star(cx - 58, 504, 19, 7.4), C.gold2, 0);
  ink(g, circle(cx - 58, 504, 6.4), C.parch3, 0);
  line(g, [[cx - 44, 490], [cx + 62, 410]], C.gold, 3.4, [18, 10]);
  line(g, [[cx - 38, 502], [cx + 86, 462]], C.gold3, 3, [12, 12]);
  line(g, [[cx - 54, 484], [cx + 22, 396]], C.gold3, 3, [10, 12]);
  const stars = [[cx - 112, 300, 8], [cx - 74, 368, 10], [cx + 92, 300, 8], [cx + 126, 372, 7], [cx - 124, 430, 6]];
  line(g, [stars[0], stars[1], stars[4]].map((q) => q.slice(0, 2)), C.chalk2, 2.4, [7, 8]);
  line(g, [stars[2], stars[3]].map((q) => q.slice(0, 2)), C.chalk2, 2.4, [7, 8]);
  for (const q of stars) ink(g, star(q[0], q[1], q[2], q[2] * 0.36), C.gold2, 0);
  dots(g, [[cx + 110, 220], [cx + 130, 340], [cx - 8, 300], [cx - 130, 410], [cx + 64, 500], [cx - 60, 520]], 2.6, C.chalk);
  ink(g, S([[cx - 200, 596, 1], [cx - 90, 572], [cx + 10, 600], [cx + 120, 566], [cx + 200, 590, 1], [cx + 200, 720, 1], [cx - 200, 720, 1]]), C.night2, 0);
  // domes far off
  ink(g, S([[cx - 98, 590, 1], [cx - 92, 556], [cx - 66, 536], [cx - 40, 556], [cx - 34, 590, 1]]), C.night3, 0);
  ink(g, S([[cx - 200, 640, 1], [cx - 40, 622], [cx + 80, 650], [cx + 200, 626, 1], [cx + 200, 720, 1], [cx - 200, 720, 1]]), C.night3, 0);
}
function archWindow(g, cx, kind) {
  const cy = 345, r1 = 172, r2 = 238, sill = 706, y0 = 78;
  const a0 = rad(156), span = rad(228);
  const x0 = cx - 262, x1 = cx + 262;
  const jx = r1 * Math.cos(rad(24)), spy = cy + r1 * Math.sin(rad(24));
  ink(g, poly([[x0, y0], [x1, y0], [x1, sill], [x0, sill]]), C.wall3);
  line(g, [[x0 + 12, y0 + 12], [x1 - 12, y0 + 12], [x1 - 12, sill], [x0 + 12, sill]], C.saffron2, 4, [20, 13]);
  sun(g, x0 + 54, y0 + 56, 30, C.saffron, C.brick);
  sun(g, x1 - 54, y0 + 56, 30, C.saffron, C.brick);
  // columns under the arch
  for (const sgn of [-1, 1]) {
    const x = cx + sgn * (jx + 34);
    ink(g, poly([[x - 20, spy + 34], [x + 20, spy + 34], [x + 20, sill], [x - 20, sill]]), C.khaki2);
    for (let y = spy + 52; y < sill - 8; y += 26) line(g, [[x - 15, y + 9], [x, y], [x + 15, y + 9]], C.wall2, 3.6);
    ink(g, poly([[x - 34, spy + 14], [x + 34, spy + 14], [x + 24, spy + 36], [x - 24, spy + 36]]), C.gold);
    ink(g, poly([[x - 27, sill - 16], [x + 27, sill - 16], [x + 27, sill], [x - 27, sill]]), C.gold3);
  }
  // voussoirs in two colours
  const N = 19;
  for (let i = 0; i < N; i++) {
    const a = a0 + span * i / N, b = a0 + span * (i + 1) / N;
    const p = new Path2D();
    p.arc(cx, cy, r2, a, b); p.arc(cx, cy, r1, b, a, true); p.closePath();
    ink(g, p, i % 2 ? C.brick : C.cream, 2.6);
    if (i % 2 === 0) {
      const m = (a + b) / 2, r = (r1 + r2) / 2;
      ink(g, diamond(cx + Math.cos(m) * r, cy + Math.sin(m) * r, 7, 11, m + Math.PI / 2), C.brick2, 0);
    } else {
      const m = (a + b) / 2, r = (r1 + r2) / 2;
      line(g, [[cx + Math.cos(m) * (r - 16), cy + Math.sin(m) * (r - 16)], [cx + Math.cos(m) * (r + 16), cy + Math.sin(m) * (r + 16)]], C.gold, 3, [5, 6]);
    }
  }
  // the opening
  const op = new Path2D();
  op.arc(cx, cy, r1, a0, a0 + span);
  op.lineTo(cx + jx, sill); op.lineTo(cx - jx, sill); op.closePath();
  g.save(); g.clip(op);
  g.fillStyle = C.night; g.fillRect(cx - 210, 150, 420, 600);
  if (kind === 'moon') skyLeft(g, cx); else skyRight(g, cx);
  g.restore();
  ink(g, op, null, LINE + 0.6);
}
function drawWall(g) {
  g.fillStyle = C.wall; g.fillRect(0, 0, W, H);
  // stitched panels behind the great disc
  g.fillStyle = C.wall2; g.fillRect(530, 76, 860, 640);
  for (let x = 610; x < 1340; x += 80) line(g, [[x, 96], [x, 700]], C.wall3, 4, [22, 16]);
  archWindow(g, 266, 'moon');
  archWindow(g, 1654, 'comet');
  // slim chevron columns
  for (const x of [556, 1364]) {
    ink(g, poly([[x - 22, 76], [x + 22, 76], [x + 22, 706], [x - 22, 706]]), C.wall3);
    for (let y = 92; y < 700; y += 24) line(g, [[x - 15, y + 9], [x, y], [x + 15, y + 9]], C.khaki2, 3.4);
  }
  // frieze
  ink(g, poly([[-5, -5], [W + 5, -5], [W + 5, 76], [-5, 76]]), C.wall3);
  g.fillStyle = C.gold3; g.fillRect(0, 62, W, 7);
  for (let x = 30, i = 0; x < W; x += 72, i++) {
    if (i % 2) sun(g, x, 30, 19, C.saffron2, C.wall2);
    else line(g, [[x - 18, 30], [x + 18, 30]], C.khaki2, 4, [7, 7]);
  }
  line(g, [[0, 69], [W, 69]], INK, 2.6);
  // hanging points along the frieze
  for (let x = 6; x < W + 20; x += 36) ink(g, poly([[x - 14, 76], [x + 14, 76], [x, 96]]), (Math.round(x / 36) % 2) ? C.saffron : C.brick, 2.4);
  // sill and the row of small niches beneath it
  ink(g, poly([[-5, 706], [W + 5, 706], [W + 5, 744], [-5, 744]]), C.saffron);
  g.fillStyle = C.saffron2; g.fillRect(0, 730, W, 14);
  for (let x = 24; x < W; x += 48) dots(g, [[x, 720]], 4.4, C.gold2);
  g.fillStyle = C.wall2; g.fillRect(0, 744, W, 136);
  line(g, [[0, 744], [W, 744]], INK, 2.8);
  for (let x = 40; x < W; x += 80) {
    ink(g, S([[x - 24, 842, 1], [x - 24, 792], [x, 762, 1], [x + 24, 792], [x + 24, 842, 1]]), C.wall, 2.6);
    ink(g, star(x, 804, 9, 3.6, 4), C.brick2, 0);
  }
}

// ---------- the great brass disc behind her ----------
function drawDisc(g, t) {
  const cx = 960, cy = 395, R = 452;
  g.fillStyle = 'rgba(12,6,3,.38)'; g.fill(circle(cx + 12, cy + 16, R + 4));
  ink(g, circle(cx, cy, R), C.saffron2, LINE);
  g.save(); g.translate(cx, cy); g.rotate(t * rad(1.5));
  for (let i = 0; i < 120; i++) {
    const a = i * Math.PI / 60, c = Math.cos(a), s = Math.sin(a);
    const long = i % 5 === 0;
    line(g, [[c * (R - 9), s * (R - 9)], [c * (R - (long ? 33 : 20)), s * (R - (long ? 33 : 20))]], INK, long ? 3.2 : 2.2);
    if (i % 15 === 7) ink(g, diamond(c * (R - 21), s * (R - 21), 7, 11, a + Math.PI / 2), C.gold2, 2);
  }
  g.restore();
  ink(g, circle(cx, cy, R - 40), C.gold, LINE);
  ink(g, circle(cx, cy, R - 56), C.brick, 2.4);
  g.save(); g.translate(cx, cy); g.rotate(-t * rad(2.5));
  for (let i = 0; i < 96; i++) {
    const a = i * Math.PI / 48;
    g.fillStyle = C.gold2; g.fill(circle(Math.cos(a) * (R - 48), Math.sin(a) * (R - 48), 2.8));
  }
  g.restore();
  ink(g, circle(cx, cy, R - 66), C.night, LINE);
  // engraving on the plate
  g.save(); g.clip(circle(cx, cy, R - 67));
  g.save(); g.translate(cx, cy); g.rotate(t * rad(0.6));
  for (const r of [R - 104, R - 170, R - 250]) line(g, Array.from({ length: 145 }, (_, i) => [Math.cos(i * Math.PI / 72) * r, Math.sin(i * Math.PI / 72) * r]), C.chalk2, 2.4, [10, 11]);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12, c = Math.cos(a), s = Math.sin(a);
    line(g, [[c * 200, s * 200], [c * (R - 74), s * (R - 74)]], C.chalk2, 2, i % 2 ? [3, 11] : [14, 9]);
  }
  const R2 = rng(11);
  for (let i = 0; i < 46; i++) {
    const a = R2() * Math.PI * 2, r = 210 + R2() * 170;
    g.fillStyle = C.chalk; g.fill(circle(Math.cos(a) * r, Math.sin(a) * r, 1.8 + R2() * 1.8));
  }
  g.restore();
  // the rete: an off-centre ring with flame pointers, turning the other way
  g.save(); g.translate(cx, cy); g.rotate(-t * rad(3.4));
  const ring = circle(70, 30, 300);
  g.lineWidth = 11; g.strokeStyle = INK; g.stroke(ring);
  g.lineWidth = 6; g.strokeStyle = C.gold3; g.stroke(ring);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 + 0.2, c = Math.cos(a), s = Math.sin(a);
    const bx = 70 + c * 300, by = 30 + s * 300;
    const tx = bx + c * 24 - s * 14, ty = by + s * 24 + c * 14;
    taper(g, [[bx, by], [bx + c * 12 - s * 2, by + s * 12 + c * 2], [tx, ty]], 10, 3, C.gold3, 2.2);
    ink(g, circle(tx, ty, 4), C.gold, 2);
  }
  g.restore();
  g.restore();
}

// ---------- lanterns, armillary, owl, pieces ----------
function drawLantern(g, x, topY, len, t, phase) {
  const a = rad(2.2) * Math.sin(t * 1.45 + phase);
  const fl = Math.sin(step(t, 8) * 19 + phase) * 0.5 + 0.5;
  g.save(); g.translate(x, topY); g.rotate(a);
  line(g, [[0, 0], [0, len]], INK, 4, [2, 8]);
  g.translate(0, len);
  glowDisc(g, 0, 52, [160 + fl * 4, 112 + fl * 4, 74 + fl * 3], '#f2bb4e', 0.045);
  ink(g, poly([[-18, 8], [18, 8], [34, 28], [34, 74], [18, 94], [-18, 94], [-34, 74], [-34, 28]]), '#f3cf73');
  const fh = 26 + fl * 6;
  ink(g, S([[-9, 72, 1], [-10, 58], [0, 72 - fh, 1], [10, 58], [9, 72, 1]]), C.brick2, 0);
  ink(g, S([[-4, 72, 1], [-5, 62], [0, 80 - fh, 1], [5, 62], [4, 72, 1]]), C.parch3, 0);
  for (const q of [[-34, 28, -18, 94], [34, 28, 18, 94], [-34, 74, -18, 8], [34, 74, 18, 8], [-18, 8, -18, 94], [18, 8, 18, 94]]) line(g, [[q[0], q[1]], [q[2], q[3]]], INK, 3);
  ink(g, poly([[-26, 8], [26, 8], [14, -8], [-14, -8]]), C.gold3);
  ink(g, poly([[-20, 94], [20, 94], [8, 108], [-8, 108]]), C.gold3);
  ink(g, star(0, 122, 12, 4.6, 4), C.gold, 2.2);
  g.restore();
}
function ringArc(g, cx, cy, rx, ry, rot, a0, a1, w, col) {
  const p = new Path2D();
  p.ellipse(cx, cy, Math.max(rx, 0.01), Math.max(ry, 0.01), rot, a0, a1);
  g.lineCap = 'butt';
  g.strokeStyle = INK; g.lineWidth = w + LINE * 2 - 1; g.stroke(p);
  g.strokeStyle = col; g.lineWidth = w; g.stroke(p);
}
function drawArmillary(g, t) {
  const cx = 1612, cy = 726, R = 112;
  const ph = t * rad(46), ps = t * rad(28);
  // stand
  ink(g, S([[cx - 62, 878, 1], [cx - 40, 860], [cx - 14, 852], [cx - 8, cy + R, 1], [cx + 8, cy + R, 1], [cx + 14, 852], [cx + 40, 860], [cx + 62, 878, 1]]), C.gold3);
  ink(g, ellipse(cx, 880, 70, 15), C.saffron2);
  const eclRy = R * 0.92 * Math.abs(Math.cos(ph)), colRx = R * 0.96 * Math.abs(Math.cos(ps));
  // back halves
  ringArc(g, cx, cy, R * .92, eclRy, rad(-23), Math.PI, Math.PI * 2, 8, C.saffron);
  ringArc(g, cx, cy, colRx, R * .96, 0, Math.PI / 2, Math.PI * 1.5, 7, C.gold3);
  ringArc(g, cx, cy, R * 1.0, R * .24, 0, Math.PI, Math.PI * 2, 9, C.gold3);
  // axis and the little sun
  line(g, [[cx - 54, cy - 126], [cx + 54, cy + 126]], INK, 7);
  line(g, [[cx - 54, cy - 126], [cx + 54, cy + 126]], C.gold2, 3);
  ink(g, circle(cx, cy, 25), C.brick2);
  ink(g, star(cx, cy, 16, 7), C.gold2, 0);
  // front halves
  ringArc(g, cx, cy, R * .92, eclRy, rad(-23), 0, Math.PI, 8, C.saffron);
  ringArc(g, cx, cy, colRx, R * .96, 0, -Math.PI / 2, Math.PI / 2, 7, C.gold3);
  ringArc(g, cx, cy, R * 1.0, R * .24, 0, 0, Math.PI, 9, C.gold);
  // the fixed outer circle with marks
  ringArc(g, cx, cy, R + 12, R + 12, 0, 0, Math.PI * 2, 12, C.gold);
  for (let i = 0; i < 36; i++) { const a = i * Math.PI / 18; line(g, [[cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8)], [cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16)]], INK, 2); }
  ink(g, star(cx, cy - R - 28, 16, 6), C.gold2, 2.4);
}
function orb(g, x, y, s, col, shade, ringed) {
  ink(g, ellipse(x, y, 30 * s, 12 * s), shade);
  ink(g, S([[x - 17 * s, y - 4 * s, 1], [x - 8 * s, y - 20 * s], [x - 6 * s, y - 34 * s, 1], [x + 6 * s, y - 34 * s, 1], [x + 8 * s, y - 20 * s], [x + 17 * s, y - 4 * s, 1]]), col);
  const bx = x, by = y - 54 * s, r = 23 * s;
  ink(g, circle(bx, by, r), col);
  g.save(); g.clip(circle(bx, by, r));
  g.fillStyle = shade; g.fill(circle(bx - r * 0.55, by + r * 0.5, r * 1.05));
  g.restore();
  ink(g, circle(bx, by, r), null);
  line(g, [[bx + r * .25, by - r * .55], [bx + r * .55, by - r * .3]], 'rgba(255,240,220,.75)', 3.2 * s);
  if (ringed) ringArc(g, bx, by, r * 1.55, r * .42, rad(-16), 0, Math.PI, 4 * s, C.gold);
}
const PIECES = [
  { x: 1088, y: 908, s: .86, c: C.teal, d: C.teal2, ring: true },
  { x: 1412, y: 925, s: 1.0, c: C.teal, d: C.teal2 },
  { x: 1000, y: 915, s: .82, c: C.brick, d: C.brick3 },
  { x: 1432, y: 1040, s: 1.28, c: C.brick, d: C.brick3 },
  { x: 1016, y: 1052, s: 1.38, c: C.saffron, d: C.saffron2, ring: true },
  { x: 620, y: 1046, s: 1.4, c: C.teal, d: C.teal2 },
];
function drawOwl(g, x, y, s) {
  // s: {turn, blink, startle, hop}
  const bl = s.blink, tu = s.turn, st = s.startle || 0;
  g.save(); g.translate(x, y - (s.hop || 0));
  // tail and feet
  ink(g, poly([[-30, -14], [30, -14], [20, 26], [-20, 26]]), C.khaki2);
  ink(g, S([[-64, -70], [-74, -130], [0, -176], [74, -130], [64, -70], [40, -6], [0, 6], [-40, -6]]), '#b49a78');
  // breast and its rows of small V feathers
  const breast = S([[-42, -112], [0, -128], [42, -112], [46, -60], [26, -8], [0, 0], [-26, -8], [-46, -60]]);
  ink(g, breast, '#d8cab0', 2.6);
  g.save(); g.clip(breast);
  for (let r = 0; r < 5; r++) for (let i = -3; i <= 3; i++) {
    const fx = i * 22 + (r % 2 ? 11 : 0), fy = -108 + r * 22;
    line(g, [[fx - 8, fy - 5], [fx, fy + 4], [fx + 8, fy - 5]], C.khaki2, 2.6);
  }
  g.restore();
  // wings, lifted a little when startled
  for (const m of [-1, 1]) {
    g.save(); g.scale(m, 1); g.translate(0, -st * 6); g.rotate(rad(-st * 9));
    ink(g, S([[44, -128], [72, -118], [84, -66], [70, -14, 1], [52, -32], [44, -76]]), C.khaki2);
    line(g, [[58, -92], [66, -80], [74, -92]], C.olive, 2.6);
    line(g, [[56, -66], [64, -54], [72, -66]], C.olive, 2.6);
    line(g, [[58, -42], [64, -32], [70, -42]], C.olive, 2.6);
    g.restore();
  }
  // head
  g.save();
  g.translate(tu * 7, -6 - st * 6);
  for (const m of [-1, 1]) ink(g, poly([[m * 40, -192], [m * (72 + st * 6), -238 - st * 10], [m * 74, -178]]), C.khaki2);
  ink(g, S([[-76, -158], [-72, -206], [0, -222], [72, -206], [76, -158], [52, -122], [0, -112], [-52, -122]]), '#b49a78');
  const dx = tu * 16;
  for (const m of [-1, 1]) {
    const ex = m * 32 + dx, ey = -170;
    ink(g, circle(ex, ey, 33 - Math.abs(tu) * (m * tu < 0 ? 5 : 0)), C.parch3, 2.6);
    const er = 19 + st * 4;
    ink(g, circle(ex, ey, er), C.gold, 2.6);
    ink(g, circle(ex + tu * 7, ey + (s.look || 0) * 6, 10 - st * 3), INK, 0);
    g.fillStyle = C.parch3; g.fill(circle(ex + tu * 7 + 3, ey + (s.look || 0) * 6 - 3, 2.6));
    if (bl > 0) {
      const lid = new Path2D();
      lid.arc(ex, ey, er + 1, 0, Math.PI * 2);
      g.save(); g.clip(lid);
      g.fillStyle = '#b49a78'; g.fillRect(ex - 34, ey - 34, 68, 15 + 49 * bl);
      g.restore();
      ink(g, circle(ex, ey, er), null, 2.6);
      if (bl > 0.8) line(g, [[ex - er, ey + 7], [ex + er, ey + 7]], INK, 3);
    }
  }
  ink(g, poly([[dx, -180], [dx + 12, -160], [dx, -140], [dx - 12, -160]]), C.saffron, 2.6);
  // brow marks
  for (const m of [-1, 1]) line(g, [[dx + m * 10, -196], [dx + m * 42, -212 - st * 5]], INK, 3.2);
  g.restore();
  // talons
  for (const m of [-1, 1]) for (const k of [-11, 0, 11]) ink(g, ellipse(m * 26 + k, 4, 6, 8), C.saffron, 2.2);
  g.restore();
}

// ---------- the table with its chart ----------
function drawTablePlate(g) {
  const top = 862, ch = 888;
  const Tx = (u, v) => 960 + u * lerp(650, 850, v), Ty = (v) => lerp(ch, 1120, v);
  ink(g, poly([[226, top], [1694, top], [1920, 1125], [0, 1125]]), C.wood2);
  ink(g, poly([[226, top], [1694, top], [1700, top + 10], [220, top + 10]]), C.wood3, 2.4);
  // the chart on it
  ink(g, poly([[Tx(-1, 0), ch], [Tx(1, 0), ch], [Tx(1, 1), 1120], [Tx(-1, 1), 1120]]), C.khaki);
  g.save();
  g.clip(poly([[Tx(-1, 0), ch], [Tx(1, 0), ch], [Tx(1, 1), 1120], [Tx(-1, 1), 1120]]));
  // margin line and grid
  line(g, [[Tx(-0.96, 0.03), Ty(0.03)], [Tx(0.96, 0.03), Ty(0.03)]], C.khaki2, 3, [14, 10]);
  for (let u = -0.96; u <= 0.97; u += 0.24) line(g, [[Tx(u, 0.03), Ty(0.03)], [Tx(u, 1), Ty(1)]], C.khaki2, 2.2, [10, 12]);
  // the sky-disc in perspective
  const ex = 960, ey = 1002, rx = 600, ry = 104;
  ink(g, ellipse(ex, ey, rx + 16, ry + 5), C.gold3);
  ink(g, ellipse(ex, ey, rx, ry), C.night);
  for (const k of [0.33, 0.66]) { const p = ellipse(ex, ey, rx * k, ry * k); g.save(); g.setLineDash([9, 9]); g.strokeStyle = C.chalk2; g.lineWidth = 2; g.stroke(p); g.restore(); }
  const R = rng(5), pts = [];
  for (let i = 0; i < 34; i++) { const a = R() * Math.PI * 2, r = 0.2 + R() * 0.75; pts.push([ex + Math.cos(a) * rx * r, ey + Math.sin(a) * ry * r]); }
  for (let i = 0; i < 16; i += 2) line(g, [pts[i], pts[i + 1]], C.chalk2, 2, [5, 6]);
  for (const q of pts) { g.fillStyle = C.chalk; g.fill(ellipse(q[0], q[1], 3.2, 1.8)); }
  // scribbled notes in the corners
  for (const [u, v, l] of [[-0.86, 0.16, .2], [-0.84, 0.24, .14], [0.66, 0.15, .22], [0.7, 0.23, .14]]) line(g, [[Tx(u, v), Ty(v)], [Tx(u + l, v), Ty(v)]], C.olive, 4, [18, 8]);
  g.restore();
  // two books under the owl
  ink(g, poly([[372, 842], [572, 842], [586, 884], [360, 884]]), C.brick);
  ink(g, poly([[372, 842], [572, 842], [572, 850], [372, 850]]), C.cream2, 2);
  line(g, [[400, 864], [540, 864]], C.gold, 3.4, [10, 8]);
  ink(g, poly([[396, 806], [556, 806], [566, 844], [388, 844]]), C.teal);
  ink(g, poly([[396, 806], [556, 806], [556, 813], [396, 813]]), C.cream2, 2);
  ink(g, star(476, 828, 11, 4.4), C.gold, 0);
  // inkwell with a feather
  const wx = 1742, wy = 1000;
  taper(g, [[wx + 8, wy - 44], [wx + 58, wy - 128], [wx + 118, wy - 214]], 3, 3, INK);
  ink(g, S([[wx + 34, wy - 80], [wx + 40, wy - 140], [wx + 100, wy - 214], [wx + 128, wy - 232, 1], [wx + 124, wy - 180], [wx + 84, wy - 120]]), C.parch3);
  for (let k = 0; k < 6; k++) line(g, [[wx + 50 + k * 11, wy - 104 - k * 18], [wx + 72 + k * 10, wy - 118 - k * 18]], C.parch2, 2.4);
  ink(g, ellipse(wx, wy + 8, 52, 17), C.wall);
  ink(g, S([[wx - 44, wy + 8, 1], [wx - 40, wy - 22], [wx - 22, wy - 32], [wx + 22, wy - 32], [wx + 40, wy - 22], [wx + 44, wy + 8, 1], [wx, wy + 24]]), C.slate);
  ink(g, ellipse(wx, wy - 34, 22, 8), C.gold3);
  ink(g, ellipse(wx, wy - 34, 14, 4.4), INK, 0);
  // rolled charts, lower left
  for (const [x, y, l, c] of [[200, 1012, 210, C.parch], [176, 1056, 240, C.parch2]]) {
    ink(g, S([[x, y - 22, 1], [x + l, y - 30, 1], [x + l + 6, y + 8, 1], [x + 6, y + 22, 1]]), c);
    ink(g, ellipse(x + l + 2, y - 11, 11, 19, rad(4)), C.parch3);
    line(g, Array.from({ length: 12 }, (_, i) => { const a = i * 0.9, r = 9 - i * .7; return [x + l + 2 + Math.cos(a) * r * .55, y - 11 + Math.sin(a) * r]; }), INK, 1.8, null, true);
    ink(g, poly([[x + l * .45, y - 28], [x + l * .55, y - 30], [x + l * .57, y + 16], [x + l * .47, y + 18]]), C.brick2, 2.4);
  }
}

// ---------- her figure ----------
const ROBE = S([[905, 528, 1], [830, 556], [745, 586], [672, 640], [625, 730], [590, 820], [566, 900, 1], [1354, 900, 1], [1330, 820], [1295, 730], [1248, 640], [1175, 586], [1090, 556], [1015, 528, 1], [960, 600, 1]]);
const PANEL = poly([[960, 604], [908, 545], [868, 900], [1052, 900], [1012, 545]]);

function drawVeil(g) {
  const v = S([[832, 118], [752, 200], [700, 330], [650, 480], [612, 640], [596, 800, 1], [1324, 800, 1], [1308, 640], [1270, 480], [1220, 330], [1168, 200], [1088, 118]]);
  ink(g, v, C.rose);
  g.save(); g.clip(v);
  // a small repeating star on the veil
  for (let r = 0; r < 11; r++) {
    for (let i = -8; i <= 8; i++) {
      const x = 960 + i * 64 + (r % 2 ? 32 : 0), y = 130 + r * 56;
      if (r % 2) ink(g, star(x, y, 12, 3.6, 4), C.rose2, 0);
      else { g.fillStyle = C.rose3; g.fill(circle(x, y, 4)); }
    }
  }
  g.restore();
  // hem line
  const hem = S([[752, 200], [700, 330], [650, 480], [612, 640]], false);
  const hem2 = S([[1168, 200], [1220, 330], [1270, 480], [1308, 640]], false);
  g.save(); g.setLineDash([3, 15]); g.lineCap = 'round'; g.strokeStyle = C.gold2; g.lineWidth = 7;
  g.translate(10, 4); g.stroke(hem); g.translate(-20, 0); g.stroke(hem2);
  g.restore();
}
function drawCrescent(g, s) {
  // horns rising from behind the head; local coordinates
  const c = S([[-206, -268, 1], [-205, -190], [-150, -120], [-70, -86], [0, -78], [70, -86], [150, -120], [205, -190], [206, -268, 1], [150, -196], [84, -160], [0, -148], [-84, -160], [-150, -196]]);
  ink(g, c, C.gold);
  g.save(); g.clip(c);
  g.fillStyle = C.gold3;
  g.fill(S([[-230, -220, 1], [-190, -150], [-110, -106], [0, -94], [110, -106], [190, -150], [230, -220, 1], [230, 0, 1], [-230, 0, 1]]));
  g.restore();
  ink(g, c, null);
  // pearls along the rim
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, x = lerp(136, 196, u), y = lerp(-170, -246, u * u);
    for (const m of [-1, 1]) ink(g, circle(m * x, y, 5.4), C.parch3, 2.2);
  }
  for (const m of [-1, 1]) { ink(g, diamond(m * 206, -272, 15, 21), C.brick2); ink(g, diamond(m * 207, -274, 6, 9), C.gold2, 0); }
  // the crown star on its stem
  line(g, [[0, -146], [0, -228]], INK, 9); line(g, [[0, -146], [0, -228]], C.gold, 4.4);
  ink(g, star(0, -236, 44, 17), C.gold2);
  ink(g, circle(0, -236, 12), C.brick2, 2.6);
  ink(g, circle(2, -238, 3.2), C.parch3, 0);
}
function drawHairBack(g) {
  ink(g, S([[-92, -130], [-124, -60], [-128, 40], [-112, 130], [-60, 176], [60, 176], [112, 130], [128, 40], [124, -60], [92, -130]]), C.hair2);
}
function drawCollar(g) {
  for (const m of [-1, 1]) {
    g.save(); g.translate(960, 0); g.scale(m, 1); g.translate(-960, 0);
    const wing = S([[1000, 572, 1], [1090, 572], [1190, 520], [1236, 388, 1], [1176, 416], [1114, 446], [1056, 470], [1006, 480, 1]]);
    ink(g, wing, C.brick2);
    g.save(); g.clip(wing);
    g.fillStyle = C.brick;
    g.fill(S([[1000, 500, 1], [1060, 490], [1130, 460], [1236, 388, 1], [1176, 416], [1114, 446], [1056, 470], [1006, 480, 1]]));
    for (let i = 0; i < 9; i++) {
      const a = rad(-44 + i * 7.2), r0 = 86, r1 = 300;
      line(g, [[985 + Math.cos(a) * r0, 560 + Math.sin(a) * r0], [985 + Math.cos(a) * r1, 560 + Math.sin(a) * r1]], C.saffron, 3, [11, 10]);
    }
    g.restore();
    ink(g, wing, null);
    const rim = [[1236, 388], [1214, 454], [1190, 520], [1146, 546], [1090, 572]];
    for (let i = 0; i < rim.length; i++) dots(g, [rim[i]], 6, C.gold2, 2.2);
    g.restore();
  }
}
function drawRobe(g) {
  ink(g, ROBE, C.teal);
  g.save(); g.clip(ROBE);
  // quilted lattice with little stars
  const a = 58, b = 92;
  for (let i = -14; i < 14; i++) {
    const x0 = 960 + i * a * 2;
    line(g, [[x0 - 400 / b * a * 4, 500 - 0 + 400 * 0], [x0 + 900 / b * a, 1400]], C.teal3, 3.4, [16, 13]);
    line(g, [[x0 + 400 / b * a * 4, 500], [x0 - 900 / b * a, 1400]], C.teal3, 3.4, [16, 13]);
  }
  for (let r = 0; r < 6; r++) for (let i = -8; i <= 8; i++) {
    const x = 960 + i * a * 2 + (r % 2 ? a : 0), y = 500 + r * b + 56;
    ink(g, star(x, y, 11, 4, 4), C.saffron, 0);
  }
  // flat shadow on her far side, and under the collar
  g.fillStyle = C.teal2;
  g.fill(S([[556, 910, 1], [612, 730], [672, 620], [760, 570], [800, 620], [742, 700], [706, 800], [690, 910, 1]]));
  g.fill(S([[800, 545, 1], [960, 545], [1120, 545, 1], [1050, 610], [960, 640], [870, 610]]));
  g.restore();
  ink(g, ROBE, null);
  // front panel
  ink(g, PANEL, C.saffron);
  g.save(); g.clip(PANEL);
  g.fillStyle = C.saffron2; g.fillRect(860, 500, 44, 420); g.fill(poly([[885, 500], [930, 500], [905, 920], [860, 920]]));
  for (let y = 740; y < 900; y += 76) { sun(g, 960, y, 24, C.brick, C.gold2); }
  g.restore();
  // edging
  for (const q of [[[908, 545], [868, 900]], [[1012, 545], [1052, 900]]]) {
    line(g, q, INK, 12); line(g, q, C.gold, 6);
  }
  // clasp: a small crescent and star, the same as her crown
  const cx = 960, cy = 636;
  ink(g, S([[cx - 50, cy - 26, 1], [cx - 42, cy + 18], [cx, cy + 44], [cx + 42, cy + 18], [cx + 50, cy - 26, 1], [cx + 26, cy + 4], [cx, cy + 14], [cx - 26, cy + 4]]), C.gold);
  ink(g, star(cx, cy - 22, 20, 8), C.gold2);
  ink(g, circle(cx, cy - 22, 6), C.brick2, 2);
  // heavy folds, thin tapered ink
  taper(g, [[694, 770], [716, 830], [716, 900]], 1, 6, INK);
  taper(g, [[1250, 760], [1256, 830], [1244, 900]], 1, 6, INK);
  taper(g, [[1160, 700], [1184, 790], [1178, 900]], 1, 5, INK);
}
function drawBraid(g, pts) {
  const q = sampleSpline(pts, 14);
  const n = q.length;
  ink(g, taperPath(pts, (u) => lerp(40, 28, u)), C.hair2);
  let acc = 0, next = 6, side = 1;
  for (let i = 1; i < n; i++) {
    const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1], d = Math.hypot(dx, dy);
    acc += d;
    if (acc >= next) {
      next += 23;
      const th = Math.atan2(dy, dx), wn = lerp(1, .74, i / n);
      const mx = q[i][0] - Math.sin(th) * 7.5 * side * wn, my = q[i][1] + Math.cos(th) * 7.5 * side * wn;
      ink(g, ellipse(mx, my, 21 * wn, 10.5 * wn, th + side * 0.62), side > 0 ? C.hair : C.hair3, 2.4);
      side = -side;
    }
  }
  const e = q[n - 1], d = q[n - 5];
  const ang = Math.atan2(e[1] - d[1], e[0] - d[0]);
  g.save(); g.translate(e[0], e[1]); g.rotate(ang);
  ink(g, S([[0, -11, 1], [34, -15], [62, 0, 1], [34, 15], [0, 11, 1]]), C.hair2);
  line(g, [[12, -5], [42, -2]], C.hair3, 2.4); line(g, [[12, 5], [42, 3]], C.hair3, 2.4);
  ink(g, poly([[-10, -17], [14, -17], [14, 17], [-10, 17]]), C.gold);
  ink(g, circle(2, 0, 4), C.brick2, 1.8);
  g.restore();
}
function drawEye(g, m, s) {
  // m = -1 screen left, +1 screen right; local head coordinates, nose axis at x = dx
  const dx = s.turn * 13, x = dx + m * (40 - m * s.turn * 3), y = -28;
  const lid = s.lid;
  const out = [x + m * 26, y - 12], inn = [x - m * 24, y + 3];
  const low = y + 10;
  const up = y - 3 - 25 * lid;
  // eye shadow plane under the brow
  g.fillStyle = 'rgba(52,108,100,.26)';
  g.fill(S([[inn[0], inn[1] - 2], [x - m * 6, y - 38], [x + m * 22, y - 30], [out[0] + m * 3, out[1] - 2], [x, up + 4]]));
  if (lid < 0.12) {
    // closed: a calm downward curve with lashes
    line(g, [inn, [x - m * 4, y + 9], [x + m * 12, y + 5], [out[0], out[1] + 2]], INK, 4.2, null, true);
    line(g, [[x + m * 6, y + 9], [x + m * 9, y + 16]], INK, 2.6);
    line(g, [[x + m * 15, y + 5], [x + m * 20, y + 12]], INK, 2.6);
    line(g, [[out[0] - m * 1, out[1] + 2], [out[0] + m * 7, out[1] + 7]], INK, 2.6);
    return;
  }
  const eye = S([[inn[0], inn[1], 1], [x, up], [x + m * 15, up + 3], [out[0], out[1], 1], [x + m * 8, low + 1], [x - m * 8, low]]);
  ink(g, eye, '#f6f1e6', 0);
  g.save(); g.clip(eye);
  const px = x + s.px * 12, py = y - 6 + s.py * 7;
  ink(g, circle(px, py, 13.5), '#274a44', 0);
  ink(g, circle(px, py, 8), INK, 0);
  g.fillStyle = '#f6f1e6'; g.fill(circle(px + 4, py - 5, 3.2));
  g.fillStyle = 'rgba(23,16,12,.2)'; g.fillRect(x - 40, up - 4, 80, 9);
  g.restore();
  // heavy upper lid, thin lower line
  taper(g, [inn, [x, up], [x + m * 15, up + 3], out, [out[0] + m * 9, out[1] - 4]], 3, 3, INK, 0, (u) => 2.6 + 3.6 * Math.sin(Math.PI * clamp(u * 1.15)));
  line(g, [[x - m * 10, low - 1], [x + m * 8, low + 1], [out[0] - m * 3, out[1] + 5]], 'rgba(23,16,12,.8)', 2, null, true);
}
function drawFace(g, s) {
  const dx = s.turn * 13;
  // face mask, long and narrow
  const face = S(sym([[0, -140], [56, -134], [76, -90], [81, -28], [76, 36], [58, 98], [28, 148], [0, 166]]));
  ink(g, face, C.skin);
  g.save(); g.clip(face);
  g.fillStyle = C.skin2;
  g.fill(S([[-90, -150, 1], [-52 + dx * .6, -96], [-62 + dx * .6, -10], [-50 + dx * .4, 70], [-14 + dx * .2, 148], [-20, 180, 1], [-100, 180, 1]]));
  // cheeks
  g.fillStyle = C.blush;
  g.fill(ellipse(dx * .7 - 48, 38, 18, 13)); g.fill(ellipse(dx * .7 + 50, 38, 18, 13));
  // shadow under the band
  g.fillStyle = 'rgba(120,96,76,.5)';
  g.fill(S([[-90, -150, 1], [90, -150, 1], [86, -110], [0, -122], [-86, -110]]));
  g.restore();
  ink(g, face, null);
  // nose: one long plane and a line
  const nx = dx;
  g.fillStyle = C.skin2;
  g.fill(S([[nx - 3, -58, 1], [nx - 13, 20], [nx - 18 + s.turn * 5, 54], [nx - 2, 62], [nx + 2, 30]]));
  line(g, [[nx + 7, -66], [nx + 8, -10], [nx + 11, 34], [nx + 13 + s.turn * 4, 56], [nx + 2, 66], [nx - 12, 60]], INK, 3, null, true);
  // brows
  for (const m of [-1, 1]) {
    const x = dx + m * 40, up = s.brow * (m > 0 ? (s.browR == null ? 1 : s.browR) : 1);
    const iny = -64 - up * 4 + (s.frown || 0) * 7;
    taper(g, [[x - m * 28, iny], [x - m * 4, -84 - up * 11], [x + m * 22, -82 - up * 11], [x + m * 38, -60 - up * 4]], 3, 3, INK, 0, (u) => 2 + 3.6 * Math.sin(Math.PI * u));
  }
  drawEye(g, -1, s); drawEye(g, 1, s);
  // mouth
  const my = 104, sm = s.smile;
  const mouth = S([[dx - 20, my - sm * 5, 1], [dx - 7, my - 8], [dx, my - 4], [dx + 7, my - 8], [dx + 20, my - sm * 5, 1], [dx + 8, my + 8], [dx - 8, my + 8]]);
  ink(g, mouth, C.brick2, 2.4);
  line(g, [[dx - 20, my - sm * 5], [dx, my - 1 + sm * 2], [dx + 20, my - sm * 5]], INK, 2.4, null, true);
  // chin dimple
  line(g, [[dx - 6, 130], [dx + 6, 130]], 'rgba(23,16,12,.55)', 2.4);
  // front curtains of hair
  for (const m of [-1, 1]) {
    const hair = S([[m * 4, -142, 1], [m * 46, -128], [m * 72, -86], [m * 78, -24], [m * 74, 42], [m * 62, 96, 1], [m * 90, 120], [m * 116, 92], [m * 124, 12], [m * 118, -70], [m * 84, -136], [m * 30, -158, 1]]);
    ink(g, hair, m < 0 ? C.hair2 : C.hair);
    line(g, [[m * 66, -120], [m * 96, -70], [m * 102, 8], [m * 94, 86]], m < 0 ? C.hair : C.hair3, 3, null, true);
    line(g, [[m * 44, -132], [m * 84, -84], [m * 92, -18], [m * 86, 60]], m < 0 ? C.hair : C.hair3, 2.6, null, true);
    // small drop earring with a lag
    const sw = (s.earSwing || 0) * 7;
    line(g, [[m * 94, 112], [m * 94 + sw, 134]], INK, 3);
    ink(g, diamond(m * 94 + sw, 148, 10, 16), C.gold);
    ink(g, circle(m * 94 + sw, 148, 3.6), C.brick2, 0);
  }
  // coronet across the brow
  const band = S([[-88, -116, 1], [-60, -134], [0, -150], [60, -134], [88, -116, 1], [84, -90, 1], [56, -106], [0, -122], [-56, -106], [-84, -90, 1]]);
  ink(g, band, C.gold);
  g.save(); g.clip(band);
  g.fillStyle = C.gold3; g.fill(S([[-88, -102, 1], [-56, -116], [0, -132], [56, -116], [88, -102, 1], [88, -70, 1], [-88, -70, 1]]));
  g.restore();
  ink(g, band, null);
  for (let i = -3; i <= 3; i++) {
    const x = i * 24, y = -136 + Math.abs(i) * Math.abs(i) * 2.2 + (Math.abs(i) * 1.2);
    if (i === 0) continue;
    ink(g, circle(x, y + 2, 5), C.parch3, 2);
  }
  ink(g, diamond(0, -136, 15, 19), C.brick2);
  ink(g, diamond(0, -138, 5.4, 8), C.gold2, 0);
}
function withHead(g, s, fn) {
  g.save();
  g.translate(960, 492); g.rotate(rad(s.tilt)); g.translate(0, -177 + (s.nod || 0));
  fn();
  g.restore();
}
function drawFigure(g, s) {
  g.save();
  g.translate(960, 900); g.rotate(rad(s.sway || 0)); g.translate(-960 + (s.dx || 0), -900 + (s.dy || 0));
  drawVeil(g);
  withHead(g, s, () => {
    g.save(); g.translate(-s.turn * 6, 0); drawCrescent(g, s); g.restore();
    drawHairBack(g);
  });
  drawCollar(g);
  // neck in shade, lighter at the throat
  ink(g, poly([[916, 440], [1004, 440], [1012, 566], [908, 566]]), C.skin2);
  g.fillStyle = C.skin; g.fill(poly([[944, 500], [1000, 480], [1006, 566], [940, 566]]));
  drawRobe(g);
  // the throat shows in the V of the robe
  ink(g, poly([[908, 545], [1012, 545], [960, 604]]), C.skin2);
  g.fillStyle = C.skin; g.fill(poly([[930, 560], [1004, 552], [960, 598]]));
  line(g, [[934, 566], [960, 582], [986, 566]], 'rgba(23,16,12,.55)', 2.4, null, true);
  const nk = sampleSpline([[914, 520], [930, 548], [960, 562], [990, 548], [1006, 520]], 3);
  for (let i = 0; i < nk.length; i++) ink(g, circle(nk[i][0], nk[i][1], 4.6), C.parch3, 1.8);
  drawBraid(g, [[862, 410], [846, 490], [838, 580], [846, 680], [862, 760]]);
  drawBraid(g, [[1058, 410], [1074, 490], [1082, 580], [1074, 680], [1058, 760]]);
  withHead(g, s, () => drawFace(g, s));
  g.restore();
}

// a single red sleeve bent at the elbow, drawn as one silhouette; the shoulder cap goes on afterwards
function drawArm(g, A, B, E, side) {
  const wa = (u) => lerp(98, 82, u), wb = (u) => lerp(82, 54, u);
  const body = (grow) => { const p = new Path2D(); taperPath([A, B], (u) => wa(u) + grow, 6, p); taperPath([B, E], (u) => wb(u) + grow, 6, p); return p; };
  g.fillStyle = INK; g.fill(body(LINE * 2), 'nonzero');
  const fill = body(0);
  g.fillStyle = C.brick2; g.fill(fill, 'nonzero');
  g.save(); g.clip(fill, 'nonzero');
  const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, ox = -dy / l * side, oy = dx / l * side;
  const fx = E[0] - B[0], fy = E[1] - B[1], fl = Math.hypot(fx, fy) || 1, px = -fy / fl * side, py = fx / fl * side;
  g.fillStyle = C.brick;
  g.fill(taperPath([[A[0] + ox * 38, A[1] + oy * 38], [B[0] + ox * 32, B[1] + oy * 32]], (u) => lerp(46, 40, u), 6));
  g.fill(taperPath([[B[0] + px * 32, B[1] + py * 32], [E[0] + px * 21, E[1] + py * 21]], (u) => lerp(40, 26, u), 6));
  line(g, [[B[0] - px * 13, B[1] - py * 13], [E[0] - px * 9, E[1] - py * 9]], C.saffron, 3.4, [13, 12]);
  g.restore();
  return [fx / fl, fy / fl];
}
function drawShoulder(g, Q, side) {
  const [x, y] = Q;
  const cap = S([[x - 58 * side, y + 30], [x - 74 * side, y - 2], [x - 50 * side, y - 40], [x + 8 * side, y - 50], [x + 54 * side, y - 24], [x + 66 * side, y + 20], [x + 36 * side, y + 48], [x - 20 * side, y + 50]]);
  ink(g, cap, C.teal);
  g.save(); g.clip(cap);
  g.fillStyle = C.teal2; g.fill(S([[x - 84 * side, y + 60, 1], [x - 80 * side, y + 8], [x - 34 * side, y + 20], [x + 26 * side, y + 30], [x + 78 * side, y + 18], [x + 78 * side, y + 60, 1]]));
  g.restore();
  ink(g, cap, null);
  // pleats gathered toward the seam
  for (const k of [-34, -10, 14, 38]) taper(g, [[x + k * 1.05 * side, y - 40 + Math.abs(k) * .3], [x + k * 1.15 * side, y - 16]], 3.2, .8, INK);
  line(g, [[x - 50 * side, y + 30], [x - 12 * side, y + 43], [x + 32 * side, y + 41], [x + 56 * side, y + 20]], C.gold2, 4, [8, 9], true);
}

// ---------- the shot: all motion is posed on twos, the props drift on ones ----------
const PLUCK = [1226, 176];      // the star waiting on the great disc
const STAR_AT = [1178, 968];    // where she plants it on the chart
const STEM = 60;
const T_PLANT = 6.72, T_TAKE = 3.92;
const ARM_R = {
  shoulder: [1218, 632],
  elbow: [[0, [1346, 824]], [3.1, [1346, 824]], [3.3, [1356, 838]], [3.8, [1340, 690], 'o'], [4.3, [1306, 712]], [5.45, [1306, 712]], [6.25, [1420, 650], 'io'], [6.72, [1458, 650], 'i2'], [7.6, [1460, 654]]],
  ang: [[0, rad(196)], [3.1, rad(196)], [3.3, rad(212)], [3.78, rad(232), 'o'], [4.3, rad(238)], [4.72, rad(228)], [5.45, rad(232)], [5.75, rad(240)], [6.25, rad(252)], [6.72, rad(100), 'i2'], [7.6, rad(100)]],
};
const POSE_R = [[3.1, POSES.chin], [3.3, POSES.reach], [3.78, POSES.reach], [3.92, POSES.pinch, 'o'], [4.72, POSES.twist], [5.45, POSES.pinch], [6.5, POSES.pinch], [6.72, POSES.plant, 'i2'], [7.0, POSES.plant], [7.2, POSES.open, 'o'], [8, POSES.open]];
function poseR(t) {
  if (t < 3.1) {
    const on = (t >= 1.92 && t < 2.08) || (t >= 2.42 && t < 2.58);
    return on ? POSES.tap : POSES.chin;
  }
  return track(POSE_R, t);
}
const CHIN_WRIST = [1136, 540];
const REF0 = (() => { const k = handFK(CHIN_WRIST[0], CHIN_WRIST[1], rad(196), 1.0, true, POSES.chin); return k.pinch; })();
const REF_KEYS = [[0, REF0], [3.1, REF0], [3.3, [REF0[0] + 34, REF0[1] + 44], 'io'], [3.78, [PLUCK[0], PLUCK[1] + 34], 'o'], [3.92, [PLUCK[0], PLUCK[1] + 34]], [4.3, [1176, 262], 'io'], [5.45, [1168, 262]], [5.72, [1182, 288], 'io'], [6.25, [1312, 150], 'io'], [T_PLANT, [STAR_AT[0], STAR_AT[1] - STEM + 34], 'i2'], [6.86, [STAR_AT[0], STAR_AT[1] - STEM + 37], 'o'], [7.3, [STAR_AT[0] + 26, STAR_AT[1] - STEM - 26], 'io'], [8, [STAR_AT[0] + 28, STAR_AT[1] - STEM - 28]]];
const headKeys = {
  tilt: [[0, 2.4], [3.1, 2.4], [3.8, -2.6, 'b'], [5.45, -3.2], [5.8, 1.5], [6.25, 2.2], [6.72, 4.4, 'i2'], [7.1, 2.6, 'o'], [8, 2.6]],
  turn: [[0, 0], [3.1, 0], [3.8, 0.75, 'o'], [5.45, 0.8], [5.8, 0.55], [6.72, 0.7], [7.1, 0.25, 'o'], [8, 0.2]],
  lid: [[0, 0], [3.12, 0], [3.28, 1, 'o'], [5.5, 1], [5.72, 0.72], [6.5, 0.74], [6.72, 0.55, 'i2'], [7.0, 1, 'o'], [8, 1]],
  px: [[0, 0], [3.3, 0.1], [3.6, 0.85, 'o'], [5.45, 0.85], [5.6, 0.2, 'o'], [6.25, 0.35], [6.72, 0.55], [7.1, -0.1, 'o'], [8, -0.1]],
  py: [[0, 0], [3.3, 0], [3.6, -0.7, 'o'], [4.2, -0.5], [5.45, -0.4], [5.6, 0.7, 'o'], [6.8, 0.9], [7.1, 0.1, 'o'], [8, 0.1]],
  brow: [[0, 0.1], [3.2, 0.1], [3.5, 0.75, 'o'], [4.9, 0.8], [5.1, 1.2, 'b'], [5.5, 1.1], [5.75, 0.3], [6.7, 0.1], [7.0, 0.9, 'o'], [8, 0.9]],
  frown: [[0, 0], [5.6, 0], [5.8, 0.9], [6.8, 1], [7.05, 0, 'o'], [8, 0]],
  smile: [[0, 0], [4.9, 0], [5.2, 0.8, 'o'], [5.55, 0.5], [5.75, 0], [6.9, 0], [7.2, 1, 'o'], [8, 1]],
  sway: [[0, -0.5], [3.1, -0.5], [3.8, 0.9, 'o'], [5.5, 1.0], [6.25, 0.2], [6.72, 1.9, 'i2'], [7.1, 0.7, 'o'], [8, 0.7]],
  dy: [[0, 0], [6.5, 0], [6.72, 10, 'i2'], [7.1, 0, 'o'], [8, 0]],
};
function blinkAt(t, times, d = 0.17) {
  for (const b of times) { const u = (t - b) / d; if (u >= 0 && u < 1) return 1 - Math.abs(u * 2 - 1) * 0.9; }
  return 0;
}
function poseL(t) {
  const base = POSES.flat.slice();
  // fingers drum on the chart while she thinks, then rest
  if (t > 1.7 && t < 3.15) {
    const k = Math.floor((t - 1.7) * 10) % 5;
    if (k < 4) { base[k * 3] += -11; base[k * 3 + 1] += 12; }
  }
  if (t > T_PLANT && t < T_PLANT + 0.2) { for (let i = 0; i < 4; i++) { base[i * 3] -= 7; } }
  return base;
}
function drawGuestStar(g, x, y, r, stemLen = 46) {
  if (stemLen) { line(g, [[x, y], [x, y + stemLen]], INK, 7); line(g, [[x, y], [x, y + stemLen]], C.gold, 3); }
  ink(g, star(x, y, r, r * 0.38), C.gold2);
  ink(g, circle(x, y, r * 0.26), C.brick2, 2);
}
// film time to choreography time; the timeline sets these so the acting lands on the narration
const WARP = { arm: (x) => x, head: (x) => x, flare: -100 };
function scene1(g, tRaw) {
  if (!WALL) { WALL = plate(drawWall); TABLE = plate(drawTablePlate); }
  const tF = step(tRaw, 12);
  const t = WARP.arm(tF), tH = WARP.head(tF);
  g.drawImage(WALL, 0, 0);
  drawLantern(g, 266, 173, 118, tRaw, 0);
  drawLantern(g, 1654, 173, 118, tRaw, 1.7);
  drawDisc(g, tRaw);
  const s = {
    tilt: track(headKeys.tilt, tH), turn: track(headKeys.turn, tH), lid: track(headKeys.lid, tH) * (1 - blinkAt(tH, [4.42, 6.08])),
    px: track(headKeys.px, tH), py: track(headKeys.py, tH), brow: track(headKeys.brow, tH), frown: track(headKeys.frown, tH),
    smile: track(headKeys.smile, tH), sway: track(headKeys.sway, tH), dy: track(headKeys.dy, tH),
    earSwing: Math.sin((tH - 3.3) * 7) * Math.exp(-Math.max(0, tH - 3.3) * 2) * (tH > 3.3 ? 1 : 0) + (tH > T_PLANT ? Math.sin((tH - T_PLANT) * 9) * Math.exp(-(tH - T_PLANT) * 3) : 0),
  };
  drawFigure(g, s);
  g.drawImage(TABLE, 0, 0);
  drawArmillary(g, t);

  // impact: pieces hop, the flame ducks, ticks flash around the star
  const since = t - T_PLANT;
  const hop = (k) => (since >= 0 && since < 0.42) ? Math.sin(since / 0.42 * Math.PI) * k : 0;

  // owl: blinks, follows the hand with its head, startled by the plant
  const owlTurn = track([[0, -0.15], [3.2, -0.15], [3.6, 0.95, 'o'], [5.6, 0.95], [6.3, 0.85], [6.72, 0.55], [7.25, 0.35], [8, 0.35]], tH);
  const owlStart = (since >= 0 && since < 0.46) ? 1 - since / 0.46 : 0;
  drawOwl(g, 476, 806, { blink: blinkAt(t, [2.32, 3.34, 5.1], 0.2), turn: owlTurn, startle: owlStart, hop: hop(30), look: t > 5.6 ? 0.8 : (t > 3.5 ? -0.7 : 0) });

  // pieces
  for (const p of PIECES) {
    const dist = Math.hypot(p.x - STAR_AT[0], (p.y - STAR_AT[1]) * 2);
    const y = p.y - hop(26 * clamp(1.15 - dist / 900));
    if (p.y < STAR_AT[1]) orb(g, p.x, y, p.s, p.c, p.d, p.ring);
  }
  // the planted star and the marks of its landing
  if (since >= 0) {
    const pop = clamp(since / 0.1);
    const r = 36 + 10 * Math.exp(-since * 7);
    glowDisc(g, STAR_AT[0], STAR_AT[1] - STEM, [84, 56], '#f2bb4e', 0.1 * pop);
    if (since < 0.5) {
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + 0.13, u = EASE.o(since / 0.5);
        const r0 = 44 + u * 130, r1 = r0 + (1 - u) * 60;
        line(g, [[STAR_AT[0] + Math.cos(a) * r0, STAR_AT[1] - 2 + Math.sin(a) * r0 * .36], [STAR_AT[0] + Math.cos(a) * r1, STAR_AT[1] - 2 + Math.sin(a) * r1 * .36]], C.gold2, 5 * (1 - u) + 1.5);
      }
    }
    ink(g, ellipse(STAR_AT[0], STAR_AT[1], 24, 8), C.gold3, 2.6);
    drawGuestStar(g, STAR_AT[0], STAR_AT[1] - STEM, r, STEM);
  }
  for (const p of PIECES) {
    const dist = Math.hypot(p.x - STAR_AT[0], (p.y - STAR_AT[1]) * 2);
    const y = p.y - hop(26 * clamp(1.15 - dist / 900));
    if (p.y >= STAR_AT[1]) orb(g, p.x, y, p.s, p.c, p.d, p.ring);
  }

  // the star waits on the great disc until she takes it
  if (t < T_TAKE) {
    const tw = 1 + 0.12 * Math.sin(step(tRaw, 6) * 9);
    const since = tRaw - WARP.flare;
    const lit = clamp(since / .25);            // before the flare the star is only a faint point on the disc
    const burst = since > 0 ? Math.exp(-since * 1.6) : 0;
    const R0 = lerp(9, 30 * tw, EASE.o(lit)) + burst * 14;
    if (lit > 0) {
      glowDisc(g, PLUCK[0], PLUCK[1], [62 + burst * 90, 40 + burst * 54], '#f2bb4e', 0.09 + burst * .12);
      if (since < 1.2) for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + .13, u = EASE.o(clamp(since / 1.2)), r0 = 44 + u * 120, r1 = r0 + (1 - u) * 56;
        line(g, [[PLUCK[0] + Math.cos(a) * r0, PLUCK[1] + Math.sin(a) * r0], [PLUCK[0] + Math.cos(a) * r1, PLUCK[1] + Math.sin(a) * r1]], C.gold2, 5 * (1 - u) + 1.5);
      }
      if (since < .7) { const gr = 150 * Math.sin(clamp(since / .7) * Math.PI); ink(g, star(PLUCK[0], PLUCK[1], gr, gr * .07, 4, rad(10)), C.parch3, 0); }
    }
    drawGuestStar(g, PLUCK[0], PLUCK[1], R0, 0);
  }
  // resting arm, left of frame
  const LS = [706, 632], LE = [556, 824], LW = [716, 908];
  const dl = drawArm(g, LS, LE, LW, 1);
  drawHand(g, LW[0] + dl[0] * 6, LW[1] + dl[1] * 6, rad(-4), 0.96, false, poseL(t));
  drawCuff(g, LW, dl, 52);
  drawShoulder(g, LS, 1);

  // working arm: the wrist is solved from the point between thumb and first finger
  const RS = ARM_R.shoulder;
  const eb = track(ARM_R.elbow, t), ang = track(ARM_R.ang, t), pose = poseR(t);
  const ref = track(REF_KEYS, t).slice();
  if (t >= 1.8 && t < 3.1) ref[1] += ((t >= 1.92 && t < 2.08) || (t >= 2.42 && t < 2.58)) ? 5 : 0;
  const off = handFK(0, 0, ang, 1.0, true, pose).pinch;
  const wr = [ref[0] - off[0], ref[1] - off[1]];
  // star-pin, carried between the two fingertips
  const carrying = t >= T_TAKE && t < T_PLANT;
  const d = drawArm(g, RS, eb, wr, -1);
  const carryY = ref[1] - 34;
  if (carrying) {
    glowDisc(g, ref[0], carryY, [70, 46], '#f2bb4e', 0.09);
    line(g, [[ref[0], carryY], [ref[0], ref[1] + 28]], INK, 7); line(g, [[ref[0], carryY], [ref[0], ref[1] + 28]], C.gold, 3);
  }
  drawHand(g, wr[0] - d[0] * 0, wr[1] - d[1] * 0, ang, 1.0, true, pose);
  if (carrying) drawGuestStar(g, ref[0], carryY, 34, 0);
  if (carrying || (t >= T_TAKE - 0.1 && t < T_TAKE)) {
    // glints as she turns it in the light
    for (const b of [3.92, 4.72, 5.16]) {
      const u = (t - b) / 0.25;
      if (u >= 0 && u < 1) {
        const gr = 86 * Math.sin(u * Math.PI);
        ink(g, star(ref[0], carryY, gr, gr * 0.08, 4, rad(10)), C.parch3, 0);
      }
    }
  }
  drawCuff(g, wr, d, 52);
  drawShoulder(g, RS, -1);
}

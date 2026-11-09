// scene2.js: a hard cut to the table seen from above. A deed slides in and she signs the year on it.
'use strict';

// hand-lettered heading, as pen strokes (x right, y down, baseline at 0, capital height 100)
const GLYPHS = {
  A: { adv: 70, strokes: [[[2, 0], [18, -44], [34, -100]], [[34, -100], [50, -48], [64, 0]], [[12, -36], [36, -40], [56, -40]]] },
  n: { adv: 56, strokes: [[[4, -60], [6, -30], [4, 0]], [[6, -40], [20, -60], [36, -50], [38, -18], [40, -4], [50, 0]]] },
  o: { adv: 56, strokes: [[[26, -60], [6, -46], [4, -18], [22, 0], [42, -14], [44, -42], [26, -60]]] },
  ' ': { adv: 30, strokes: [] },
  1: { adv: 38, strokes: [[[2, -78], [20, -100], [18, -50], [16, 0]]] },
  0: { adv: 62, strokes: [[[28, -100], [6, -76], [4, -28], [26, 0], [48, -26], [50, -74], [28, -100]]] },
  5: { adv: 58, strokes: [[[44, -100], [24, -98], [10, -98]], [[10, -98], [8, -76], [6, -56]], [[6, -56], [30, -64], [46, -42], [38, -12], [18, 0], [2, -10]]] },
  4: { adv: 62, strokes: [[[36, -100], [16, -62], [0, -32], [24, -32], [54, -34]], [[38, -72], [36, -36], [34, 0]]] },
  2: { adv: 58, strokes: [[[4, -76], [22, -100], [44, -82], [30, -46], [2, 0], [28, -4], [50, 0]]] },
  6: { adv: 56, strokes: [[[42, -100], [14, -72], [4, -30], [22, 0], [44, -16], [40, -46], [16, -52], [6, -32]]] },
};
const TITLE = 'Anno 1054';
const LETTER_Y = 196;
function buildLetter(title, scale = 1.3) {
  const shear = 0.17;
  let width = 0;
  for (const ch of title) width += GLYPHS[ch].adv;
  width *= scale;
  const strokes = [];
  let x = -width / 2;
  for (const ch of title) {
    for (const st of GLYPHS[ch].strokes) {
      const pts = st.map(([a, b]) => [x + (a - b * shear) * scale, b * scale]);
      const q = sampleSpline(pts, 12);
      let len = 0; for (let i = 1; i < q.length; i++) len += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
      strokes.push({ q, len });
    }
    x += GLYPHS[ch].adv * scale;
  }
  // a final flourish under the line
  const fl = sampleSpline([[-width / 2 - 24, 42], [-width / 6, 34], [width / 5, 40], [width / 2 + 6, 28], [width / 2 + 40, 18], [width / 2 + 14, 46], [width / 2 - 40, 54]], 12);
  let flen = 0; for (let i = 1; i < fl.length; i++) flen += Math.hypot(fl[i][0] - fl[i - 1][0], fl[i][1] - fl[i - 1][1]);
  strokes.push({ q: fl, len: flen, thin: true });
  let total = 0; for (const s of strokes) total += s.len + 40;
  let acc = 0;
  for (const s of strokes) { s.a = acc / total; acc += s.len + 40; s.b = acc / total - 40 / total; }
  return { strokes, width };
}
const LETTER = buildLetter(TITLE);
function nibStroke(g, q, n, thin) {
  // a broad pen held at a fixed angle: thick on the downstrokes, thin across
  const ang = rad(-38), w = thin ? 4.4 : 15;
  const nx = Math.cos(ang) * w / 2, ny = Math.sin(ang) * w / 2;
  g.fillStyle = INK;
  const m = Math.min(n, q.length);
  for (let i = 1; i < m; i++) {
    const a = q[i - 1], b = q[i];
    g.beginPath();
    g.moveTo(a[0] - nx, a[1] - ny); g.lineTo(a[0] + nx, a[1] + ny); g.lineTo(b[0] + nx, b[1] + ny); g.lineTo(b[0] - nx, b[1] - ny);
    g.closePath(); g.fill();
    g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke();
  }
}
// draws the lettering up to progress u, returns the pen position
function drawLettering(g, u, L = LETTER) {
  let pen = L.strokes[0].q[0];
  for (const s of L.strokes) {
    if (u <= s.a) { break; }
    const v = clamp((u - s.a) / (s.b - s.a));
    const n = Math.max(2, Math.ceil(v * s.q.length));
    nibStroke(g, s.q, n, s.thin);
    pen = s.q[Math.min(s.q.length - 1, n - 1)];
  }
  return pen;
}
// ---------- the deed ----------
const DOC = (() => {
  const R = rng(1054), rows = [];
  for (let r = 0; r < 28; r++) {
    const y = 300 + r * 43 + (r > 6 ? 16 : 0);
    let x = -326;
    const items = [];
    while (x < 318) {
      const l = 50 + R() * 240, kind = R();
      const xe = Math.min(x + l, 324);
      items.push({ x0: x, x1: xe, red: kind < 0.2, swash: kind > 0.8 });
      x = xe + 14 + R() * 20;
    }
    rows.push({ y, items, dot: R() < 0.22 });
  }
  return { rows };
})();
function drawDocSheet(g) {
  const hw = 420, top = -8, bot = 1500;
  // sheet with a slightly uneven edge
  const edge = (x, sgn) => Array.from({ length: 16 }, (_, i) => [x + sgn * Math.sin(i * 1.7) * 3, top + (bot - top) * i / 15]);
  const pts = edge(hw, 1).concat(edge(-hw, -1).reverse());
  ink(g, poly(pts), C.parch);
  g.save(); g.clip(poly(pts));
  g.fillStyle = C.parch2; g.fillRect(-hw, top, 50, bot - top); // far margin in shade
  g.fillStyle = 'rgba(92,70,52,.5)'; g.fillRect(-hw, top, hw * 2, 40); // the roller's shadow
  g.restore();
  // ruled margins with stars
  for (const m of [-1, 1]) {
    line(g, [[m * 356, 34], [m * 356, bot]], C.khaki, 3.4, [14, 11]);
    for (let y = 60; y < bot; y += 88) ink(g, (Math.round(y / 88) % 2) ? diamond(m * 390, y, 9, 13) : star(m * 390, y, 13, 5, 4), C.khaki, 0);
  }
  // body text, drawn as blocks of ink like a page seen from afar
  for (const row of DOC.rows) {
    for (const it of row.items) {
      const col = it.red ? '#a8321a' : '#5c241c';
      if (it.swash && it.x1 - it.x0 > 70) {
        line(g, [[it.x0, row.y], [it.x1 - 58, row.y]], col, 17);
        line(g, [[it.x1 - 58, row.y], [it.x1 - 44, row.y + 8], [it.x1 - 30, row.y - 4], [it.x1 - 14, row.y - 11], [it.x1, row.y + 3], [it.x1 + 12, row.y - 3]], col, 5.2, null, true);
      } else line(g, [[it.x0, row.y], [it.x1, row.y]], col, 17);
    }
    if (row.dot) dots(g, [[-344, row.y]], 8.5, '#5c241c');
  }
  // the little sky diagram set into the page
  const dx = 214, dy = 452;
  ink(g, circle(dx, dy, 84), C.parch3);
  line(g, Array.from({ length: 49 }, (_, i) => [dx + Math.cos(i * Math.PI / 24) * 62, dy + Math.sin(i * Math.PI / 24) * 62]), C.khaki2, 2.4, [5, 6]);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(g, [[dx + Math.cos(a) * 36, dy + Math.sin(a) * 36], [dx + Math.cos(a) * 58, dy + Math.sin(a) * 58]], '#a8321a', 3.4); }
  ink(g, star(dx, dy, 30, 12), '#a8321a', 2.2);
}
function drawDocRoller(g) {
  const hw = 452, y0 = -78, y1 = 22, h = y1 - y0, cy = (y0 + y1) / 2;
  // ribbon first, it hangs from under the roller over the left margin
  ink(g, S([[-418, y1 - 8, 1], [-410, y1 + 40], [-416, y1 + 100], [-430, y1 + 160, 1], [-406, y1 + 142], [-388, y1 + 164, 1], [-382, y1 + 100], [-376, y1 + 40], [-378, y1 - 8, 1]]), C.brick2);
  line(g, [[-398, y1 + 8], [-398, y1 + 112]], C.brick, 4);
  const body = new Path2D();
  body.moveTo(-hw + 18, y0); body.lineTo(hw - 26, y0); body.lineTo(hw - 26, y1); body.lineTo(-hw + 18, y1);
  body.ellipse(-hw + 18, cy, 18, h / 2, 0, Math.PI / 2, Math.PI * 1.5);
  body.closePath();
  ink(g, body, C.khaki);
  g.save(); g.clip(body);
  g.fillStyle = C.khaki2; g.fillRect(-hw, y1 - 30, hw * 2, 34);
  g.fillStyle = '#b39a7e'; g.fillRect(-hw, y0 + 10, hw * 2, 18);
  g.restore();
  ink(g, body, null);
  dots(g, [[-hw + 40, cy + 8], [-hw + 62, cy + 8], [-hw + 84, cy + 8], [-hw + 106, cy + 8]], 5, C.khaki2);
  // rolled end with its spiral
  ink(g, ellipse(hw - 26, cy, 24, h / 2), C.parch);
  line(g, Array.from({ length: 22 }, (_, i) => { const a = i * 0.72, r = 1 - i / 25; return [hw - 26 + Math.cos(a) * 17 * r, cy + Math.sin(a) * 38 * r]; }), C.khaki2, 3, null, true);
}
// ---------- the chart under it ----------
function drawChartLayer(g) {
  g.fillStyle = C.wood; g.fillRect(-500, -600, W + 1000, H + 1200);
  // table edge across the top
  ink(g, poly([[-500, -600], [W + 500, -600], [W + 500, 46], [-500, 46]]), C.wall);
  ink(g, poly([[-500, 8], [W + 500, 8], [W + 500, 70], [-500, 70]]), C.wood3);
  g.fillStyle = C.wood2; g.fillRect(-500, 46, W + 1000, 24);
  line(g, [[-500, 46], [W + 500, 46]], INK, 2.6);
  // parchment chart
  ink(g, poly([[-500, 96], [W + 500, 96], [W + 500, H + 600], [-500, H + 600]]), C.khaki);
  line(g, [[-500, 124], [W + 500, 124]], C.khaki2, 3.6, [18, 12]);
  // patches of darker tint, like the land on an old map, in hard flat shapes
  ink(g, S([[1380, 96, 1], [1460, 150], [1590, 140], [1700, 190], [1880, 160], [2420, 200, 1], [2420, 96, 1]]), C.olive2, 0);
  ink(g, S([[1200, 880], [1400, 840], [1600, 900], [1820, 860], [2420, 900, 1], [2420, 1700, 1], [1200, 1700, 1]]), C.olive2, 0);
  ink(g, S([[-500, 980, 1], [-260, 950], [-100, 1010], [60, 1100], [-40, 1700, 1], [-500, 1700, 1]]), C.olive2, 0);
  // graticule
  for (let x = -480; x < W + 480; x += 150) line(g, [[x, 130], [x, H + 600]], C.khaki2, 2.4, [10, 12]);
  for (let y = 240; y < H + 600; y += 150) line(g, [[-500, y], [W + 500, y]], C.khaki2, 2.4, [10, 12]);
  const coast = S([[930, 96, 1], [960, 150], [1020, 170], [1040, 230], [1110, 262], [1170, 232], [1240, 262], [1280, 330], [1230, 392], [1160, 372], [1120, 430], [1050, 420], [1000, 356], [950, 330], [900, 240], [880, 170], [890, 96, 1]]);
  ink(g, coast, '#8a725c', 0);
  g.save(); g.setLineDash([3, 9]); g.lineCap = 'round'; g.strokeStyle = C.olive; g.lineWidth = 3; g.stroke(coast); g.restore();
  for (const [x, y, k] of [[980, 220, .9], [1060, 320, 1], [1170, 300, .8], [1120, 350, .7]]) {
    ink(g, poly([[x - 24 * k, y], [x, y - 32 * k], [x + 24 * k, y]]), C.khaki, 2.4, C.olive);
    line(g, [[x, y - 32 * k], [x + 6 * k, y - 15 * k], [x + 2 * k, y]], C.olive, 2);
  }
  line(g, [[930, 740], [1040, 690], [1180, 650], [1330, 610]], C.brick2, 4, [12, 12], true);
  ink(g, poly([[1312, 596], [1342, 606], [1322, 628]]), C.brick2, 0);
  // sea marks and small hills
  for (const [x, y] of [[1460, 690], [1600, 660], [1800, 700], [1880, 620], [1410, 590], [1640, 1040], [1860, 1090], [1450, 960]]) {
    line(g, [[x - 22, y], [x - 11, y - 7], [x, y], [x + 11, y - 7], [x + 22, y]], C.khaki2, 3, null, true);
    line(g, [[x - 8, y + 13], [x + 3, y + 6], [x + 14, y + 13], [x + 25, y + 6], [x + 36, y + 13]], C.khaki2, 3, null, true);
  }
  for (const [x, y, k] of [[1320, 950, 1], [1380, 1000, .8], [1280, 1040, .9], [1900, 900, 1], [1950, 960, .8]]) {
    ink(g, poly([[x - 26 * k, y], [x, y - 34 * k], [x + 26 * k, y]]), C.khaki, 2.6, C.olive);
    line(g, [[x, y - 34 * k], [x + 6 * k, y - 16 * k], [x + 2 * k, y]], C.olive, 2.2);
  }
  // the sky-disc
  const cx = 300, cy = 560, R = 560;
  ink(g, circle(cx, cy, R + 26), C.gold3);
  for (let i = 0; i < 180; i++) {
    const a = i * Math.PI / 90, long = i % 5 === 0;
    line(g, [[cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22)], [cx + Math.cos(a) * (R + (long ? 6 : 13)), cy + Math.sin(a) * (R + (long ? 6 : 13))]], INK, long ? 3 : 2);
  }
  ink(g, circle(cx, cy, R), C.night);
  for (const r of [R * .3, R * .55, R * .8]) line(g, Array.from({ length: 145 }, (_, i) => [cx + Math.cos(i * Math.PI / 72) * r, cy + Math.sin(i * Math.PI / 72) * r]), C.chalk2, 2.6, [11, 11]);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; line(g, [[cx + Math.cos(a) * 40, cy + Math.sin(a) * 40], [cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)]], C.chalk2, 2, [3, 12]); }
  // constellations
  const cons = [
    [[-40, 210], [60, 290], [160, 250], [240, 330], [190, 430]],
    [[60, 530], [150, 600], [90, 700], [190, 760]],
    [[420, 200], [500, 280], [460, 370]],
    [[-60, 760], [40, 850], [150, 900]],
    [[380, 860], [470, 780], [570, 830]],
  ];
  for (const c of cons) {
    line(g, c, C.chalk, 3, [9, 9]);
    c.forEach((q, i) => ink(g, star(q[0], q[1], i % 2 ? 11 : 15, i % 2 ? 4.4 : 5.6), C.parch3, 0));
  }
  const R2 = rng(101);
  for (let i = 0; i < 70; i++) {
    const a = R2() * Math.PI * 2, r = R2() * R * .96;
    g.fillStyle = C.chalk; g.fill(circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.8 + R2() * 2));
  }
  // sun diagram at the right
  const sx = 1660, sy = 440;
  ink(g, circle(sx, sy, 214), '#b39a7e');
  for (const r of [196, 150, 104]) line(g, Array.from({ length: 97 }, (_, i) => [sx + Math.cos(i * Math.PI / 48) * r, sy + Math.sin(i * Math.PI / 48) * r]), C.olive, 3, [10, 9]);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; line(g, [[sx + Math.cos(a) * 66, sy + Math.sin(a) * 66], [sx + Math.cos(a) * (i % 2 ? 86 : 98), sy + Math.sin(a) * (i % 2 ? 86 : 98)]], C.brick, 5); }
  ink(g, star(sx, sy, 60, 28), C.saffron); ink(g, circle(sx, sy, 22), C.brick2);
  for (const [r, a, c, s] of [[150, 3.9, C.teal, 18], [196, 0.6, C.brick, 22], [104, 5.4, C.gold, 12]]) ink(g, circle(sx + Math.cos(a) * r, sy + Math.sin(a) * r, s), c);
  // ink notes
  for (const [x, y, l] of [[1500, 760, 160], [1500, 790, 240], [1500, 820, 120], [1730, 760, 130], [1780, 820, 90]]) line(g, [[x, y], [x + l, y]], C.olive, 6, [20, 9]);
  // compass rose
  const rx = 1730, ry = 985;
  ink(g, star(rx, ry, 92, 16, 4), C.parch2);
  ink(g, star(rx, ry, 58, 14, 4, Math.PI / 4), C.khaki2);
  ink(g, circle(rx, ry, 12), C.brick2);
}
function drawDeskPieces(g) {
  orb(g, 240, 240, 1.7, C.teal, C.teal2);
  orb(g, 88, 170, 1.45, C.brick, C.brick3, true);
  orb(g, 1720, 760, 1.65, C.brick, C.brick3);
  orb(g, 1548, 1068, 2.0, C.teal, C.teal2, true);
  // the inkwell, seen from above
  ink(g, ellipse(1818, 140, 112, 74), C.slate);
  ink(g, ellipse(1818, 132, 66, 42), C.gold3);
  ink(g, ellipse(1818, 132, 46, 28), INK, 0);
  line(g, [[1800, 124], [1832, 120]], 'rgba(255,240,220,.5)', 3);
  // the planted guest star, now seen close
  const x = 316, y = 546;
  glowDisc(g, x, y - 62, [122, 84], '#f2bb4e', 0.09);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + 0.26;
    line(g, [[x + Math.cos(a) * 94, y - 62 + Math.sin(a) * 94], [x + Math.cos(a) * (i % 2 ? 122 : 146), y - 62 + Math.sin(a) * (i % 2 ? 122 : 146)]], C.gold2, 5);
  }
  ink(g, ellipse(x, y + 8, 42, 16), C.gold3);
  drawGuestStar(g, x, y - 62, 64, 72);
}
// a quill with a feathered vane; nib at the origin, the shaft running up and to the right
function drawQuill(g) {
  const tip = [176, -342];
  ink(g, S([[28, -68], [38, -148], [110, -280], [tip[0] + 6, tip[1] - 16, 1], [tip[0] + 18, tip[1] + 60], [120, -170], [58, -74]]), C.parch3);
  for (let i = 0; i < 9; i++) line(g, [[44 + i * 13, -104 - i * 24], [64 + i * 13, -112 - i * 24]], C.parch2, 2.6);
  taper(g, [[0, 0], [24, -50], [90, -176], [tip[0], tip[1]]], 5, 2.4, INK);
  taper(g, [[0, 0], [14, -28]], 1, 5, INK);
}
function scene2(g, t, t0, leave = 0) {
  const u = t - t0;     // 0 at the cut
  // the camera eases across the table
  const c = EASE.o2(clamp(u / 2.2));
  const camA = [lerp(40, 0, c), lerp(-44, 0, c)];
  const rot = rad(lerp(-9.6, -8, c));
  g.save();
  g.translate(W / 2 + camA[0] * 0.6, H / 2 + camA[1] * 0.6); g.rotate(rot); g.translate(-W / 2, -H / 2);
  drawChartLayer(g);
  g.restore();
  g.save();
  g.translate(camA[0], camA[1]);
  drawDeskPieces(g);
  g.restore();

  // the deed slides in from the lower left, turning square as it arrives
  const m = EASE.io(clamp(u / 1.72)), mm = 1 - Math.pow(1 - m, 2.2);
  const dx = lerp(-250, 1000, mm) + leave * leave * 1400, dy = lerp(780, 110, mm) + leave * 180;
  const da = rad(lerp(-26, -2.6, mm) + leave * 14);
  const place = (g2) => { g2.translate(dx, dy); g2.rotate(da); };
  g.save(); g.translate(16, 22); place(g);
  g.fillStyle = 'rgba(16,8,4,.34)'; g.fillRect(-424, -30, 848, 1600);
  g.restore();
  g.save(); place(g);
  g.scale(1, 1);
  drawDocSheet(g);
  // lettering, written once the deed has nearly settled
  const wr = clamp((step(u, 12) - 1.12) / 0.96);
  let pen = LETTER.strokes[0].q[0];
  g.save(); g.translate(0, LETTER_Y);
  if (wr > 0) pen = drawLettering(g, wr);
  g.restore();
  drawDocRoller(g);
  g.restore();

  // her hand and quill come in from the right to sign the year
  const inn = EASE.o(clamp((u - 0.82) / 0.3)), out = EASE.io(clamp((u - 2.1) / 0.24));
  if (inn > 0) {
    const ca = Math.cos(da), sa = Math.sin(da);
    const ts = wr >= 1 ? 1 : wr;
    const local = [pen[0], pen[1] + LETTER_Y];
    const nib = [dx + ca * local[0] - sa * local[1], dy + sa * local[0] + ca * local[1]];
    const away = (1 - inn) + out;
    // the pen lifts away a little between strokes of the entry and after the last one
    const nx = nib[0] + away * 900, ny = nib[1] + away * 420;
    const ang = rad(200);
    const grip = [nx + 30, ny - 58];
    const fk0 = handFK(0, 0, ang, 1.0, false, POSES.grip);
    const wx = grip[0] - fk0.pinch[0], wy = grip[1] - fk0.pinch[1];
    g.save(); g.translate(nx, ny); drawQuill(g); g.restore();
    const elbow = [wx + 1500, wy + 520];
    const dd = drawArm(g, [elbow[0] + 240, elbow[1] + 60], elbow, [wx, wy], 1);
    drawHand(g, wx, wy, ang, 1.0, false, POSES.grip);
    drawCuff(g, [wx, wy], dd, 52);
  }
}

// hand.js: a long-fingered hand built from straight jointed segments, and the sleeve that carries it.
'use strict';
const HAND = {
  knuckles: [[82, -25], [92, -8], [89, 10], [78, 26]], // index, middle, ring, little
  lens: [[52, 40, 32], [58, 44, 34], [52, 40, 30], [40, 31, 24]],
  thumbBase: [38, -30], thumbLens: [60, 48],
  w: 12,
};
// angles in degrees: + bends toward the little-finger side
//              index        middle      ring        little      thumb
const POSES = {
  chin:  [  -2,  4,  8,   34, 52, 44,   44, 58, 46,   54, 60, 44,   -8, 44 ],
  tap:   [ -10,  6, 10,   34, 52, 44,   44, 58, 46,   54, 60, 44,   -8, 44 ],
  reach: [ -38, 22, 24,  -14, 14, 16,   -2, 12, 14,   10, 12, 10,  -14, 12 ],
  pinch: [ -70, 55, 80,   -8, 14, 16,    0, 13, 13,   10, 13,  9,   14, 18 ],
  twist: [ -70, 55, 80,   -2, 20, 20,    6, 18, 16,   16, 16, 10,   14, 18 ],
  flat:  [ -10,  4,  2,   -3,  3,  2,    4,  2,  2,   11,  2,  2,    4, 12 ],
  plant: [ -70, 55, 80,   -6, 30, 26,   -2, 30, 24,    6, 32, 20,   14, 18 ],
  open:  [ -34, 22, 22,  -10, 26, 22,   -2, 28, 20,    8, 30, 16,  -18, 10 ],
  grip:  [ -66, 52, 76,   62, 70, 50,   68, 72, 50,   74, 74, 46,   14, 18,  1, .56, .52, .5 ],
};
const PALM = S([[0, -20, 1], [28, -36], [72, -38], [96, -24], [100, 0], [92, 26], [70, 38], [26, 32], [0, 20, 1]]);

function handFK(x, y, ang, scale, flip, pose) {
  const c = Math.cos(ang), s = Math.sin(ang), f = flip ? -1 : 1;
  const tf = (lx, ly) => [x + (c * lx - s * ly * f) * scale, y + (s * lx + c * ly * f) * scale];
  const fingers = [];
  for (let k = 0; k < 4; k++) {
    let a = 0, px = HAND.knuckles[k][0], py = HAND.knuckles[k][1];
    const out = [[px - 16, py]];
    out.push([px, py]);
    const ls = pose[14 + k] == null ? 1 : pose[14 + k];
    for (let j = 0; j < 3; j++) {
      a += rad(pose[k * 3 + j]);
      px += Math.cos(a) * HAND.lens[k][j] * ls; py += Math.sin(a) * HAND.lens[k][j] * ls;
      out.push([px, py]);
    }
    fingers.push(out.map((q) => tf(q[0], q[1])));
  }
  let a = rad(-38) + rad(pose[12]), px = HAND.thumbBase[0], py = HAND.thumbBase[1];
  const th = [[px - 10, py + 6], [px, py]];
  px += Math.cos(a) * HAND.thumbLens[0]; py += Math.sin(a) * HAND.thumbLens[0]; th.push([px, py]);
  a += rad(pose[13]);
  px += Math.cos(a) * HAND.thumbLens[1]; py += Math.sin(a) * HAND.thumbLens[1]; th.push([px, py]);
  const thumb = th.map((q) => tf(q[0], q[1]));
  const iTip = fingers[0][4], tTip = thumb[3];
  return { fingers, thumb, iTip, tTip, pinch: [(iTip[0] + tTip[0]) / 2, (iTip[1] + tTip[1]) / 2], c, s, f };
}
function drawHand(g, x, y, ang, scale, flip, pose, fill = C.skin, shade = C.skin2) {
  const k = handFK(x, y, ang, scale, flip, pose);
  const wf = HAND.w * scale;
  const seg = (pts, w, col) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; g.stroke(poly(pts, false)); };
  const finger = (pts, w) => {
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) seg([pts[i], pts[i + 1]], w * lerp(1, .78, i / n) + 2 * LINE, INK);
    for (let i = 0; i < n; i++) seg([pts[i], pts[i + 1]], w * lerp(1, .78, i / n), fill);
  };
  // the thumb sits behind the palm, the four fingers fan out from under the knuckle line
  finger(k.thumb, wf * 1.05);
  for (const i of [3, 2, 1, 0]) finger(k.fingers[i], wf * (i === 3 ? 0.86 : i === 0 ? 0.95 : 1));
  g.save();
  g.translate(x, y); g.rotate(ang); g.scale(scale, scale * k.f);
  g.lineWidth = LINE / scale;
  ink(g, PALM, fill, LINE / scale);
  // flat shadow along the far edge of the hand
  g.save(); g.clip(PALM);
  g.fillStyle = shade;
  g.fill(S([[0, 12, 1], [40, 22], [100, 16], [100, 50, 1], [0, 50, 1]]));
  g.restore();
  g.restore();
  // melt the knuckle line into the fingers, then a few tendon marks
  for (let i = 0; i < 4; i++) {
    const a = k.fingers[i][0], b = k.fingers[i][1], e = [lerp(b[0], k.fingers[i][2][0], 0.3), lerp(b[1], k.fingers[i][2][1], 0.3)];
    seg([a, b, e], wf * (i === 3 ? 0.86 : i === 0 ? 0.95 : 1), fill);
  }
  g.save();
  g.translate(x, y); g.rotate(ang); g.scale(scale, scale * k.f);
  const col = 'rgba(23,16,12,.85)';
  line(g, [[48, -14], [74, -12]], col, 2 / scale);
  line(g, [[52, 2], [78, 3]], col, 2 / scale);
  line(g, [[48, 16], [70, 18]], col, 2 / scale);
  g.restore();
  return k;
}
// sleeve from shoulder through elbow to wrist; returns the direction at the wrist
function drawSleeve(g, A, B, E, o = {}) {
  const c0 = o.fill || C.saffron, c1 = o.shade || C.saffron2;
  const w0 = o.w0 || 128, w1 = o.w1 || 96, w2 = o.w2 || 60;
  const wa = (s) => lerp(w0, w1, s), wb = (s) => lerp(w1, w2, s);
  const up = [A, B], fore = [B, E];
  const outline = (grow) => {
    const p = new Path2D();
    taperPath(up, (s) => wa(s) + grow, 6, p);
    taperPath(fore, (s) => wb(s) + grow, 6, p);
    return p;
  };
  g.fillStyle = INK; g.fill(outline(LINE * 2), 'nonzero');
  const body = outline(0);
  g.fillStyle = c0; g.fill(body, 'nonzero');
  g.save(); g.clip(body, 'nonzero');
  const sh = o.side || 1;
  const nrm = (P, Q, d) => { const dx = Q[0] - P[0], dy = Q[1] - P[1], l = Math.hypot(dx, dy) || 1; return [-dy / l * d * sh, dx / l * d * sh]; };
  const nf = nrm(B, E, 1), nu = nrm(A, B, 1);
  g.fillStyle = c1;
  g.fill(taperPath([[A[0] + nu[0] * wa(0) * .42, A[1] + nu[1] * wa(0) * .42], [B[0] + nu[0] * w1 * .42, B[1] + nu[1] * w1 * .42]], (s) => lerp(w0, w1, s) * 0.42, 6));
  g.fill(taperPath([[B[0] + nf[0] * w1 * .42, B[1] + nf[1] * w1 * .42], [E[0] + nf[0] * w2 * .42, E[1] + nf[1] * w2 * .42]], (s) => lerp(w1, w2, s) * 0.42, 6));
  // dashed stitching along the sleeve
  const dashCol = o.stitch || C.brick;
  line(g, [[B[0] - nf[0] * w1 * .18, B[1] - nf[1] * w1 * .18], [E[0] - nf[0] * w2 * .18, E[1] - nf[1] * w2 * .18]], dashCol, 4, [16, 14]);
  g.restore();
  const d = [E[0] - B[0], E[1] - B[1]], l = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / l, d[1] / l];
}
function drawCuff(g, E, d, w) {
  const n = [-d[1], d[0]];
  const q = (a, b, ha, hb) => [
    [E[0] + d[0] * a + n[0] * ha, E[1] + d[1] * a + n[1] * ha], [E[0] + d[0] * b + n[0] * hb, E[1] + d[1] * b + n[1] * hb],
    [E[0] + d[0] * b - n[0] * hb, E[1] + d[1] * b - n[1] * hb], [E[0] + d[0] * a - n[0] * ha, E[1] + d[1] * a - n[1] * ha],
  ];
  ink(g, poly(q(-30, -8, w / 2 + 2, w / 2 + 5)), C.brick2);
  ink(g, poly(q(-10, 12, w / 2 + 5, w / 2 + 3)), C.gold);
  ink(g, poly(q(3, 12, w / 2 + 4, w / 2 + 2)), C.gold3, 0);
  for (const s of [-0.28, 0, 0.28]) dots(g, [[E[0] - d[0] * 19 + n[0] * w * s, E[1] - d[1] * 19 + n[1] * w * s]], 3.4, C.gold2);
}

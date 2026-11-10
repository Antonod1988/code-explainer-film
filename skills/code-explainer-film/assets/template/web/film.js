// film.js: the whole film laid out on the narration. Every moment hangs on a cue from the voice take of that language.
'use strict';
let SPACE = null;
const TL = TIMING[LANG];
const BEAT = Object.fromEntries(TL.beats.map((b) => [b.id, b]));
const CUE = {};
for (const b of TL.beats) Object.assign(CUE, b.cues);

// the band of parchment that sweeps from right to left, roll at its foot
function wipeGeom(p) {
  const footX = lerp(W + 280, -340, p);
  const lean = rad(lerp(25, 6, p));
  const w = 380;
  const footY = H - 62 + Math.sin(p * Math.PI) * 4;
  const dirx = Math.sin(lean), diry = -Math.cos(lean), nx = Math.cos(lean), ny = Math.sin(lean);
  const far = Math.max(1600, H + 520);
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
  const { footX, footY, lean, w, P, band, far } = W0;
  ink(g, band, C.parch3);
  g.save(); g.clip(band);
  g.fillStyle = C.parch; g.fill(poly([P(-w / 2 - 8, 0), P(-w / 2 + 40, 0), P(-w / 2 + 40, far + 100), P(-w / 2 - 8, far + 100)]));
  const zig = [];
  for (let i = 0; i < 26; i++) zig.push(P(w / 2 - 66 + (i % 2 ? 26 : 0), 40 + i * 62));
  line(g, zig, C.parch2, 4, [13, 10]);
  for (let i = 0; i < 12; i++) { const q = P(-w * .12, 120 + i * 134); ink(g, star(q[0], q[1], 13, 5, 4, lean), C.parch2, 0); }
  g.restore();
  const foot = new Path2D(); foot.ellipse(footX, footY, w / 2 + 9, 34, lean, 0, Math.PI * 2); ink(g, foot, C.parch3);
  const inner = new Path2D(); inner.ellipse(footX + Math.cos(lean) * 2, footY + Math.sin(lean) * 2, w / 2 - 12, 22, lean, 0, Math.PI * 2); ink(g, inner, C.khaki, 2.4);
  const inner2 = new Path2D(); inner2.ellipse(footX + Math.cos(lean) * 8, footY + Math.sin(lean) * 8, w / 2 - 66, 13, lean, 0, Math.PI * 2); ink(g, inner2, C.khaki2, 2.2);
}

// ---------- the shots: a flat one is a function from shots.js, a 3D one goes through SPACE ----------
const SHOT = {
  title: shotTitle,
  orbit(g, t) { SPACE.draw(g, 'orbit', t, { b: BEAT.b02, bloom: .22 }); },
  phases: shotPhases,
};

// ---------- the order, and how each shot arrives: 'cut', 'wipe' or 'fade'. Times come from beats and cues, never typed in ----------
const SEQ = [
  { s: 'title', at: () => 0 },
  { s: 'orbit', at: () => BEAT.b02.start - .3, tr: 'wipe' },
  { s: 'phases', at: () => BEAT.b03.start - .35, tr: 'fade' },
].map((q) => ({ ...q, t: q.at() }));
const FADE = .55, WIPE_D = 1.5, FADE_IN = .4, FADE_OUT = 1.2;
let TMP = null, TMPG = null;

const FILM = {
  get DUR() { return TL.total; },
  SEQ,
  async init(space) {
    SPACE = space;
    TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H; TMPG = TMP.getContext('2d', { alpha: false, willReadFrequently: true });
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
    applyGrain(g);   // last, in screen space, so 2D, 3D and labels share one surface
    const black = Math.max(1 - t / FADE_IN, ramp(t, TL.total - FADE_OUT, TL.total - .1));
    if (black > 0) { g.fillStyle = `rgba(0,0,0,${EASE.io(clamp(black))})`; g.fillRect(0, 0, W, H); }
  },
};

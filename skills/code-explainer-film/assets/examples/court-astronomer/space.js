// space.js: the 3D inserts. A shared kit (brass, toon planets with ink outlines, chalk lines, stars) and one builder per shot.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const TAU = Math.PI * 2, RAD = Math.PI / 180, EPS = 23.44 * RAD;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const COL = (c) => new THREE.Color(c);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
composer.addPass(renderPass);
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: 'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);gl_FragColor=vec4(min(c.rgb,vec3(5.)),1.);}',
}));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.22, 0.5, 1.25);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const ENV = (() => { const p = new THREE.PMREMGenerator(renderer); const t = p.fromScene(new RoomEnvironment(), 0.03).texture; p.dispose(); return t; })();

// ---------- materials ----------
const GRAD = (() => { const d = new Uint8Array([70, 135, 200, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const GRAD_SOFT = (() => { const d = new Uint8Array([150, 195, 230, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const brass = (c = '#c9963a', r = 0.4) => new THREE.MeshStandardMaterial({ color: COL(c), metalness: 1, roughness: r });
const BRASS = brass(), BRASS_D = brass('#8f6420', 0.5), BRASS_L = brass('#dcae52', 0.34);
const enamel = (c, r = 0.35) => new THREE.MeshStandardMaterial({ color: COL(c), metalness: 0.05, roughness: r });
const INKM = new THREE.MeshBasicMaterial({ color: COL('#17100c'), side: THREE.BackSide });
const SPHERE = new THREE.SphereGeometry(1, 200, 140);

// ---------- canvas textures ----------
function ctex(w, h, fn, opt = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h, c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opt.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = opt.wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  return t;
}
function bands(g, w, h, list, wob, seed) {
  const R = rng(seed); let y = 0;
  const total = list.reduce((a, b) => a + b[1], 0);
  for (const [col, hh] of list) {
    const b = hh / total * h, ph = R() * 9, am = wob * (0.5 + R());
    g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
    g.lineTo(0, y);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / w * TAU * 6 + ph) * am + Math.sin(x / w * TAU * 17 + ph * 2) * am * .4);
    g.lineTo(w, h); g.closePath(); g.fill();
    y += b;
  }
}
const TEX = {
  jupiter: () => ctex(2048, 1024, (g, w, h) => {
    bands(g, w, h, [['#c9a877', 60], ['#ead9b6', 90], ['#b06a3a', 70], ['#efe3c7', 80], ['#d6b283', 40], ['#a65a2e', 90], ['#eddcbc', 110], ['#c99a68', 50], ['#9a5a30', 80], ['#e8d6b0', 80], ['#b58a58', 60], ['#caa97c', 70]], 5, 11);
    g.fillStyle = '#a53f1e'; g.strokeStyle = '#6e2212'; g.lineWidth = 4;
    const p = new Path2D(); p.ellipse(w * .36, h * .63, 92, 48, 0, 0, TAU); g.fill(p); g.stroke(p);
    g.fillStyle = '#d0693c'; const q = new Path2D(); q.ellipse(w * .36, h * .63, 56, 26, 0, 0, TAU); g.fill(q);
    const R = rng(9); g.fillStyle = 'rgba(255,245,225,.6)';
    for (let i = 0; i < 90; i++) { const pth = new Path2D(); pth.ellipse(R() * w, h * (.18 + R() * .66), 8 + R() * 24, 2 + R() * 4, 0, 0, TAU); g.fill(pth); }
  }, { wrap: true }),
  saturn: () => ctex(2048, 1024, (g, w, h) => {
    bands(g, w, h, [['#b9a26c', 80], ['#e9dbb0', 120], ['#d6c084', 70], ['#f2e8c6', 130], ['#cdb67a', 80], ['#e3d3a0', 120], ['#c2ab70', 70], ['#ead9a8', 90], ['#a99158', 90]], 2.5, 21);
  }, { wrap: true }),
  ring: () => ctex(1024, 32, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const st = [[0, '#00000000'], [.04, '#7a6848'], [.2, '#b8a678'], [.36, '#d9c897'], [.56, '#e8d9ab'], [.585, '#10100c'], [.64, '#10100c'], [.655, '#bfae80'], [.82, '#a8976c'], [.9, '#7a6848'], [.965, '#6a5a40'], [1, '#00000000']];
    for (let i = 0; i < st.length - 1; i++) { g.fillStyle = st[i][1]; g.fillRect(st[i][0] * w, 0, (st[i + 1][0] - st[i][0]) * w + 1, h); }
    const R = rng(5); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(30,20,10,${R() * .16})`; g.fillRect(R() * w, 0, 1 + R() * 3, h); }
  }),
  uranus: () => ctex(1024, 512, (g, w, h) => {
    bands(g, w, h, [['#8fc7c0', 40], ['#a7dcd4', 140], ['#bde8e0', 200], ['#a2d6ce', 140], ['#86bdb6', 60]], 1, 31);
  }, { wrap: true }),
  neptune: () => ctex(1024, 512, (g, w, h) => {
    bands(g, w, h, [['#27457e', 70], ['#2f5a9c', 160], ['#3a6db4', 120], ['#2a5192', 120], ['#213d72', 60]], 2, 41);
    const R = rng(4); g.fillStyle = 'rgba(235,245,255,.75)';
    for (let i = 0; i < 26; i++) { const p = new Path2D(); p.ellipse(R() * w, h * (.22 + R() * .55), 12 + R() * 36, 1.4 + R() * 2.4, 0, 0, TAU); g.fill(p); }
    g.fillStyle = '#16294f'; const q = new Path2D(); q.ellipse(w * .6, h * .6, 42, 22, 0, 0, TAU); g.fill(q);
  }, { wrap: true }),
  pluto: () => ctex(1024, 512, (g, w, h) => {
    g.fillStyle = '#b79a7a'; g.fillRect(0, 0, w, h);
    const R = rng(8);
    for (let i = 0; i < 70; i++) { g.fillStyle = R() < .5 ? 'rgba(92,66,48,.45)' : 'rgba(226,206,176,.5)'; const p = new Path2D(); p.ellipse(R() * w, R() * h, 10 + R() * 60, 6 + R() * 26, R() * 3, 0, TAU); g.fill(p); }
    g.fillStyle = '#efe3cb';
    g.beginPath(); g.moveTo(w * .5, h * .72); g.bezierCurveTo(w * .36, h * .6, w * .36, h * .36, w * .45, h * .34); g.bezierCurveTo(w * .49, h * .33, w * .5, h * .4, w * .5, h * .42); g.bezierCurveTo(w * .5, h * .4, w * .53, h * .32, w * .57, h * .35); g.bezierCurveTo(w * .64, h * .4, w * .62, h * .6, w * .5, h * .72); g.fill();
  }, { wrap: true }),
  mars: () => ctex(1024, 512, (g, w, h) => {
    g.fillStyle = '#b5562e'; g.fillRect(0, 0, w, h);
    const R = rng(12);
    for (let i = 0; i < 80; i++) { g.fillStyle = R() < .6 ? 'rgba(90,40,22,.4)' : 'rgba(220,150,100,.4)'; const p = new Path2D(); p.ellipse(R() * w, h * (.1 + R() * .8), 10 + R() * 50, 5 + R() * 18, R() * 3, 0, TAU); g.fill(p); }
    g.fillStyle = '#ece5d6'; g.fillRect(0, 0, w, 24); g.fillRect(0, h - 18, w, 18);
  }, { wrap: true }),
  moon: () => ctex(1024, 512, (g, w, h) => {
    g.fillStyle = '#bdb6a6'; g.fillRect(0, 0, w, h);
    const R = rng(14);
    for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(92,86,78,.55)'; const p = new Path2D(); p.ellipse(R() * w, h * (.2 + R() * .6), 30 + R() * 70, 20 + R() * 40, R() * 3, 0, TAU); g.fill(p); }
    for (let i = 0; i < 160; i++) { const x = R() * w, y = R() * h, r = 2 + R() * 9; g.strokeStyle = 'rgba(70,64,56,.5)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
  }, { wrap: true }),
};
const EARTH_TEX = (() => { let t = null; return () => { if (!t) t = ctex(4096, 2048, (g, w, h, c) => paintEarth(c, { lon0: -180, lon1: 180, lat0: -90, lat1: 90 }), { wrap: true }); return t; }; })();

// a planet: toon-shaded painted sphere with an ink outline
function planet(kind, R, opt = {}) {
  const g = new THREE.Group();
  const map = kind === 'earth' ? EARTH_TEX() : TEX[kind]();
  const m = new THREE.Mesh(SPHERE, new THREE.MeshToonMaterial({ map, gradientMap: GRAD }));
  m.scale.setScalar(R);
  const hull = new THREE.Mesh(SPHERE, INKM);
  hull.scale.setScalar(R * (1 + (opt.outline == null ? 0.022 : opt.outline)));
  g.add(hull, m);
  g.userData.body = m;
  if (kind === 'saturn') {
    const rg = new THREE.RingGeometry(R * 1.3, R * 2.35, 128, 1);
    const pos = rg.attributes.position, uv = rg.attributes.uv, v = V3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - R * 1.3) / (R * 1.05), .5); }
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: TEX.ring(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.02, depthWrite: true }));
    ring.rotation.x = -Math.PI / 2;
    const tilt = new THREE.Group(); tilt.rotation.z = (opt.ringTilt == null ? 26 : opt.ringTilt) * RAD; tilt.rotation.x = 0.32; tilt.add(ring); g.add(tilt);
    g.userData.ring = tilt;
  }
  return g;
}

// ---------- lines and stars ----------
function fat(points, o = {}) {
  const f = []; for (const p of points) f.push(p.x, p.y, p.z);
  const geo = new LineGeometry(); geo.setPositions(f);
  const col = COL(o.color || '#7d9a93'); if (o.boost) col.multiplyScalar(o.boost);
  const mat = new LineMaterial({ color: col, linewidth: o.width || 2.4, dashed: !!o.dash, dashSize: o.dash || 1, gapSize: o.gap || o.dash || 1, transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity == null ? 1 : o.opacity, worldUnits: false, depthTest: o.depthTest !== false, depthWrite: o.depthWrite !== false });
  mat.resolution.set(W, H);
  mat.toneMapped = false;
  const l = new Line2(geo, mat);
  if (o.dash) l.computeLineDistances();
  l.frustumCulled = false;
  return l;
}
const circlePts = (r, y = 0, n = 180, a0 = 0, a1 = TAU) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return V3(r * Math.cos(a), y, -r * Math.sin(a)); });
const STAR8 = ctex(64, 64, (g, w) => {
  g.clearRect(0, 0, w, w); g.fillStyle = '#fff';
  const p = star(w / 2, w / 2, w / 2 - 1, w * .11); g.fill(p);
});
const DOT = ctex(32, 32, (g, w) => { g.clearRect(0, 0, w, w); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 1, 0, TAU); g.fill(); });
const SOFT = ctex(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
function points(list, size, map, color, o = {}) {
  const pos = new Float32Array(list.length * 3); list.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size, map, color: COL(color), transparent: true, alphaTest: o.alphaTest == null ? 0.2 : o.alphaTest, sizeAttenuation: !!o.atten, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: o.opacity == null ? 1 : o.opacity });
  const P = new THREE.Points(g, m); P.frustumCulled = false; return P;
}
function starfield(scene, r = 300, seed = 7, nFaint = 1800, nBright = 90) {
  const R = rng(seed), f = [], b = [];
  const dir = () => { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u); return V3(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar(r); };
  for (let i = 0; i < nFaint; i++) f.push(dir());
  for (let i = 0; i < nBright; i++) b.push(dir());
  scene.add(points(f, 2.4, DOT, '#8fb0a8', { alphaTest: .3 }));
  scene.add(points(b, 13, STAR8, '#e9e2d6', { alphaTest: .3 }));
}
function world(bg = '#0e2329', envI = 0.6) {
  const s = new THREE.Scene();
  s.background = COL(bg);
  s.environment = ENV; s.environmentIntensity = envI;
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.7); sun.position.set(5, 4, 6); s.add(sun);
  s.add(new THREE.HemisphereLight(0xbfdcd8, 0x2a1c15, 0.7));
  s.userData.sun = sun;
  return s;
}
const cam = (fov = 40) => new THREE.PerspectiveCamera(fov, W / H, 0.05, 2000);
function project(camera, v) {
  const p = v.clone().project(camera);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, front: p.z < 1 };
}
// rotation for lettering on a dial canvas: tops point outward on the far side, inward on the near side
const dialRot = (a, nearLon) => { let d = (a / RAD - nearLon + 540) % 360 - 180; return -a + Math.PI / 2 + (Math.abs(d) < 90 ? Math.PI : 0); };
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeO = (u) => { u = clamp(u); return 1 - Math.pow(1 - u, 3); };
const backO = (u) => { u = clamp(u); const s = 1.7; u -= 1; return u * u * ((s + 1) * u + s) + 1; };
const ramp = (t, a, b) => clamp((t - a) / (b - a));

// ---------- astronomy ----------
function prec(y) { let Y = y - 2000, ex = 0; const lim = 3000; if (Y > lim) { ex = Y - lim; Y = lim; } else if (Y < -lim) { ex = Y + lim; Y = -lim; } const rate = 50.288 + 2 * 1.1054e-4 * Y; return (50.288 * Y + 1.1054e-4 * Y * Y + rate * ex) / 3600; }
const vEcl = (lon, lat, r = 1) => { const l = lon * RAD, b = lat * RAD; return V3(r * Math.cos(b) * Math.cos(l), r * Math.sin(b), -r * Math.cos(b) * Math.sin(l)); };
function eqToEcl(raH, dec) {
  const ra = raH * 15 * RAD, d = dec * RAD, x = Math.cos(d) * Math.cos(ra), y = Math.cos(d) * Math.sin(ra), z = Math.sin(d);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS), ze = -y * Math.sin(EPS) + z * Math.cos(EPS);
  return [Math.atan2(ye, x) / RAD, Math.asin(ze) / RAD];
}
const MS = (y, m = 1, d = 1) => { const t = new Date(Date.UTC(2000, m - 1, d)); t.setUTCFullYear(y); return t.getTime(); };
const TBL = (() => {
  const out = {};
  for (const k in DATA.table.data) { const b = atob(DATA.table.data[k]), a = new Uint16Array(b.length / 2); for (let i = 0; i < a.length; i++) a[i] = b.charCodeAt(i * 2) | (b.charCodeAt(i * 2 + 1) << 8); out[k] = a; }
  return out;
})();
const T0 = MS(1450), DAY = 864e5, TSTEP = DATA.table.step * DAY;
// geocentric ecliptic longitude of a slow planet at a time in ms
function lonAt(k, t) {
  const f = (t - T0) / TSTEP, i = Math.floor(f), a = TBL[k][i] / 65535 * 360, b = TBL[k][i + 1] / 65535 * 360;
  let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360;
  return (a + d * (f - i) + 360) % 360;
}
const yearToMs = (y) => { const Y = Math.floor(y), a = MS(Y), b = MS(Y + 1); return a + (y - Y) * (b - a); };
const msToYear = (t) => { const Y = new Date(t).getUTCFullYear(), a = MS(Y), b = MS(Y + 1); return Y + (t - a) / (b - a); };
const dateMs = (s) => { const [y, m, d] = s.split('-').map(Number); return MS(y, m, d) + DAY / 2; };
// rough heliocentric longitude from mean elements, good enough for an orrery
const ELEM = {
  E: [1.0, .0167, 100.464, 35999.372, 102.94], J: [5.203, .0484, 34.396, 3034.746, 14.73], S: [9.537, .0539, 49.954, 1222.494, 92.6],
  U: [19.19, .0473, 313.238, 428.482, 170.95], N: [30.07, .0086, 304.88, 218.459, 44.97], P: [39.48, .2488, 238.929, 145.207, 224.07],
};
function helio(k, year) {
  const [a, e, L, n, w] = ELEM[k]; const T = (year - 2000) / 100;
  const M = (L + n * T - w) * RAD; const nu = M + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
  return { lon: (nu / RAD + w + 720) % 360, r: a * (1 - e * e) / (1 + e * Math.cos(nu)) };
}

// ---------- shared overlay helpers (2D, drawn after the 3D pass) ----------
const OVER = { tags: [] };
function dateText(t, withDay = true) {
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth(), n = d.getUTCDate();
  const RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const RU0 = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  if (LANG === 'ru') return withDay ? `${n} ${RU[m]} ${y}` : `${RU0[m]} ${y}`;
  return withDay ? `${n} ${EN[m]} ${y}` : `${EN[m]} ${y}`;
}
const yearText = (y) => { y = Math.round(y); return y <= 0 ? (LANG === 'ru' ? `${1 - y} до н. э.` : `${1 - y} BC`) : (LANG === 'ru' ? `${y} год` : (y < 1000 ? `AD ${y}` : `${y}`)); };
const NAMES = {
  J: T_('Юпитер', 'Jupiter'), S: T_('Сатурн', 'Saturn'), U: T_('Уран', 'Uranus'), N: T_('Нептун', 'Neptune'), P: T_('Плутон', 'Pluto'), E: T_('Земля', 'Earth'),
};
const SIGNS = LANG === 'ru' ? ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы']
  : ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const CONS_NAME = { Psc: T_('Рыбы', 'Pisces'), Aqr: T_('Водолей', 'Aquarius'), Cap: T_('Козерог', 'Capricorn'), Sgr: T_('Стрелец', 'Sagittarius'), Oph: T_('Змееносец', 'Ophiuchus'), Sco: T_('Скорпион', 'Scorpius'), Lib: T_('Весы', 'Libra'), Vir: T_('Дева', 'Virgo'), Leo: T_('Лев', 'Leo'), Cnc: T_('Рак', 'Cancer'), Gem: T_('Близнецы', 'Gemini'), Tau: T_('Телец', 'Taurus'), Ari: T_('Овен', 'Aries') };
const PCOL = { J: '#d9a441', S: '#e9dbb0', U: '#7fd0c8', N: '#6f9ae0', P: '#d9779a', E: '#2f8280' };

// ---------- the axis world: Earth, its wobbling axis, the pole stars (wobble and pole shots) ----------
function buildAxis() {
  const s = world(); const c = cam(38);
  starfield(s, 320, 3, 2200, 60);
  const earthPivot = new THREE.Group(); s.add(earthPivot);
  const earth = planet('earth', 1, { outline: 0.012 }); earthPivot.add(earth);
  // axis rod with brass knobs
  const rodM = brass('#b88a34', .55), rod = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 3.5, 16), rodM); earthPivot.add(rod);
  const knob1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), rodM); knob1.position.y = 1.75; earthPivot.add(knob1);
  const knob2 = knob1.clone(); knob2.position.y = -1.75; earthPivot.add(knob2);
  const eq = new THREE.Mesh(new THREE.TorusGeometry(1.012, 0.012, 12, 180), BRASS); eq.rotation.x = Math.PI / 2; earthPivot.add(eq);
  // near cone ring swept by the rod
  const h = 1.75, rr = h * Math.tan(EPS);
  const coneRing = fat(circlePts(rr, h, 180), { color: '#e2b85c', width: 3, dash: .09, gap: .07 }); s.add(coneRing);
  const coneRing2 = fat(circlePts(rr, -h, 180), { color: '#7d9a93', width: 2, dash: .09, gap: .07, opacity: .6 }); s.add(coneRing2);
  const conePts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; conePts.push(V3(0, 0, 0), V3(rr * Math.cos(a), h, -rr * Math.sin(a))); }
  const ghost = []; for (let i = 0; i < 12; i++) ghost.push(fat([conePts[i * 2], conePts[i * 2 + 1]], { color: '#7d9a93', width: 1.2, opacity: .28 }));
  ghost.forEach((g) => s.add(g));
  // a spinning top beside it, same tilt, same wobble
  const prof = [[0, -1.02], [.03, -1], [.05, -.86], [.12, -.72], [.55, -.42], [.72, -.28], [.74, -.2], [.62, -.1], [.3, -.03], [.12, .02], [.09, .14], [.06, .2], [.06, .7], [.09, .74], [.09, .8], [.05, .84], [0, .86]].map((q) => new THREE.Vector2(q[0], q[1]));
  const topG = new THREE.Group();
  const topBody = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), BRASS); topG.add(topBody);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.745, .72, .07, 64, 1, true), enamel('#b0451f')); band.position.y = -.24; topG.add(band);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const stud = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), BRASS_L); stud.position.set(.75 * Math.cos(a), -.24, .75 * Math.sin(a)); topG.add(stud); const stud2 = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), enamel(i % 2 ? '#1c645c' : '#d3c4a6')); stud2.position.set(.42 * Math.cos(a), -.02, .42 * Math.sin(a)); topG.add(stud2); }
  const topPivot = new THREE.Group(); topPivot.add(topG); s.add(topPivot);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, .05, 96), new THREE.MeshBasicMaterial({ color: COL('#16313a') })); s.add(plate);
  const plateRim = new THREE.Mesh(new THREE.TorusGeometry(1.55, .02, 10, 128), BRASS); plateRim.rotation.x = Math.PI / 2; s.add(plateRim);
  const topRing = fat(circlePts(.86 * Math.tan(EPS) + .86 * .02, 0, 96), { color: '#e2b85c', width: 2.4, dash: .05, gap: .05 }); s.add(topRing);

  // far sky: real stars in ecliptic coordinates around the pole of the ecliptic
  const Rs = 90, sky = new THREE.Group(); s.add(sky);
  const SK = {
    umi: [[2.53, 89.26], [17.54, 86.59], [16.77, 82.04], [15.73, 77.79], [16.29, 75.76], [15.35, 71.83], [14.85, 74.16], [15.73, 77.79]],
    uma: [[11.06, 61.75], [11.03, 56.38], [11.9, 53.69], [12.26, 57.03], [11.06, 61.75], [12.26, 57.03], [12.9, 55.96], [13.4, 54.93], [13.79, 49.31]],
    cas: [[.15, 59.15], [.68, 56.54], [.95, 60.72], [1.43, 60.24], [1.91, 63.67]],
    dra: [[17.94, 51.49], [17.51, 52.3], [17.15, 65.71], [16.4, 61.51], [15.42, 58.97], [14.07, 64.38], [12.56, 69.79], [11.52, 69.33]],
    cyg: [[20.69, 45.28], [20.37, 40.26], [19.51, 27.96], [20.37, 40.26], [20.77, 33.97], [20.37, 40.26], [19.75, 45.13]],
    lyr: [[18.62, 38.78], [18.75, 37.61], [18.98, 32.69], [18.84, 33.36], [18.62, 38.78]],
    cep: [[21.31, 62.59], [21.48, 70.56], [23.66, 77.63], [22.83, 66.2], [21.31, 62.59]],
  };
  const skyStars = [];
  for (const k in SK) {
    const pts = SK[k].map(([ra, dec]) => { const [l, b] = eqToEcl(ra, dec); return vEcl(l, b, Rs); });
    sky.add(fat(pts, { color: '#7d9a93', width: 2, dash: 1.1, gap: .9, opacity: .75 }));
    skyStars.push(...pts);
  }
  sky.add(points(skyStars, 19, STAR8, '#efe7d6', { alphaTest: .3 }));
  const lat = 90 - EPS / RAD;
  const poleRing = fat(circlePts(Rs * Math.cos(lat * RAD), Rs * Math.sin(lat * RAD), 360), { color: '#e2b85c', width: 3, dash: 1.4, gap: 1.1, boost: 1.2 }); sky.add(poleRing);
  const yearTicks = [];
  for (let y = -10000; y <= 14000; y += 2000) { const v = vEcl(90 - prec(y), lat, Rs), v2 = vEcl(90 - prec(y), lat + 1.3, Rs); yearTicks.push(fat([v, v2], { color: '#e2b85c', width: 3 })); }
  yearTicks.forEach((l) => sky.add(l));
  const STARS = { pol: eqToEcl(2.53, 89.26), thu: eqToEcl(14.07, 64.38), veg: eqToEcl(18.62, 38.78) };
  const bright = ['pol', 'thu', 'veg'].map((k) => vEcl(STARS[k][0], STARS[k][1], Rs));
  sky.add(points(bright, 38, STAR8, '#fff4d8', { alphaTest: .25 }));
  const pointerGeo = fat([V3(), V3(0, 1, 0)], { color: '#f0c95a', width: 3, boost: 1.6 }); s.add(pointerGeo);
  const cursor = points([V3()], 64, STAR8, '#ffe9a8', { alphaTest: .2 }); s.add(cursor);
  cursor.material.color.multiplyScalar(1.6);
  const cursorGeoPos = cursor.geometry.attributes.position;

  const lon0 = -105 * RAD;
  function pose(phi, spin, yearLine, Plen) {
    // axis in ecliptic frame; phi is the longitude of the north pole
    const a = V3(Math.sin(EPS) * Math.cos(phi), Math.cos(EPS), -Math.sin(EPS) * Math.sin(phi));
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), a);
    earthPivot.quaternion.copy(q);
    earth.rotation.y = spin;
    return { a, q };
  }
  return {
    scene: s, camera: c, parts: { earthPivot, earth, rod, topPivot, topG, plate, plateRim, topRing, coneRing, coneRing2, ghost, sky, pointerGeo, cursor, cursorGeoPos, bright, poleRing, knob1, knob2, eq },
    update(t, X) {
      if (X.mode === 'wobble') {
        const tTop = CUE.top, tE = CUE.earth, b0 = X.b.start, b1 = X.end;
        const phi = lon0 + (t - b0) * TAU / 6.2;
        const { a, q } = pose(phi, t * 1.15);
        const grow = ease(ramp(t, b0 - .1, b0 + 1.2));
        // the axis rod grows out of the poles first
        this.parts.rod.scale.set(1, Math.max(.001, grow), 1); knob1.visible = knob2.visible = grow > .95;
        knob1.position.y = 1.75; knob2.position.y = -1.75;
        const showCone = ease(ramp(t, tTop - 1, tTop + .2));
        coneRing.visible = coneRing2.visible = showCone > 0.02; ghost.forEach((g) => { g.visible = showCone > 0.02; g.material.opacity = .28 * showCone; });
        coneRing.material.opacity = showCone; coneRing.material.transparent = true; coneRing2.material.opacity = .6 * showCone; coneRing2.material.transparent = true;
        // the top arrives on its plate, then leaves as the camera closes on the Earth
        const inT = backO(ramp(t, tTop - .55, tTop + .25)), outT = ease(ramp(t, tE + .1, tE + 1.0));
        const k = inT * (1 - outT);
        topPivot.visible = plate.visible = plateRim.visible = topRing.visible = k > .002;
        const px = 3.05, py = -.72;
        plate.position.set(px, py - 1.05, 0); plate.scale.setScalar(Math.max(k, .001)); plateRim.position.copy(plate.position); plateRim.position.y += .03; plateRim.scale.setScalar(Math.max(k, .001));
        topPivot.position.set(px, py, 0); topPivot.quaternion.copy(q); topPivot.scale.setScalar(Math.max(k, .001));
        topG.rotation.y = t * 7.5;
        topRing.position.set(px, py + .86 * Math.cos(EPS), 0); topRing.scale.setScalar(Math.max(k, .001));
        // camera: straight on, then wide for the pair, then close
        const u1 = ease(ramp(t, tTop - .9, tTop + .1)), u2 = ease(ramp(t, tE, tE + 1.6));
        const tx = lerp(lerp(0, 1.35, u1), 0, u2), ty = lerp(lerp(.15, -.25, u1), .25, u2), zz = lerp(lerp(5.4, 7.4, u1), 4.9, u2);
        c.position.set(tx + Math.sin(t * .1) * .3, ty + .75, zz); c.lookAt(tx, ty, 0);
        pointerGeo.visible = cursor.visible = false; sky.visible = false;
      } else {
        // pole shot: the year runs and the far end of the axis walks along the ring
        const Y = X.year;
        const phi = (90 - prec(Y)) * RAD;
        const { a } = pose(phi, t * .8);
        topPivot.visible = plate.visible = plateRim.visible = topRing.visible = false;
        this.parts.rod.scale.set(1, 1, 1); knob1.visible = knob2.visible = true;
        coneRing.visible = coneRing2.visible = false; ghost.forEach((g) => { g.visible = false; });
        sky.visible = true;
        const tip = a.clone().multiplyScalar(Rs);
        const geo = pointerGeo.geometry; geo.setPositions([a.x * 1.75, a.y * 1.75, a.z * 1.75, tip.x, tip.y, tip.z]);
        pointerGeo.visible = true; cursor.visible = true;
        cursorGeoPos.setXYZ(0, tip.x, tip.y, tip.z); cursorGeoPos.needsUpdate = true;
        // camera moves from beside the Earth to under it, looking up along the axis
        const u = ease(ramp(t, X.b.start - .6, X.b.start + 2.6));
        const P0 = V3(0, 1, 4.9), P1 = V3(1.3, -2.15, 3.2);
        c.position.copy(P0).lerp(P1, u);
        c.fov = lerp(38, 74, u); c.updateProjectionMatrix();
        const L0 = V3(0, .25, 0), L1 = V3(-2, 20, -5.5);
        c.lookAt(L0.clone().lerp(L1, u));
      }
    },
    overlay(g, t, X) {
      if (X.mode === 'wobble') {
        const tE = CUE.earth;
        const a = ease(ramp(t, CUE.top - .1, CUE.top + .3)) * (1 - ease(ramp(t, tE, tE + .5)));
        if (a > 0) tag(g, project(c, topPivot.position.clone().add(V3(0, .9, 0))).x, project(c, topPivot.position.clone().add(V3(0, .9, 0))).y, T_('волчок', 'a top'), { a, dy: -60 });
        const aE = ease(ramp(t, tE, tE + .35));
        if (aE > 0) plaque(g, T_('один оборот ≈ 25 772 года', 'one wobble ≈ 25,772 years'), W / 2, 112, { a: aE });
        const eps = ease(ramp(t, X.b.start + 1.1, X.b.start + 1.6)) * (1 - ease(ramp(t, CUE.top - .3, CUE.top)));
        if (eps > 0) { const p = project(c, V3(.6, 1.6, 0)); tag(g, p.x, p.y, T_('23,4°', '23.4°'), { a: eps, dx: 110, dy: -30, size: 28 }); }
      } else {
        const Y = X.year;
        plaque(g, yearText(Y), W / 2, 112, { a: ease(ramp(t, X.b.start + .3, X.b.start + 1)) });
        const names = [T_('Полярная', 'Polaris'), T_('Тубан', 'Thuban'), T_('Вега', 'Vega')];
        const when = [CUE.pole0, CUE.thuban, CUE.vega];
        bright.forEach((v, i) => {
          const pp = project(c, v);
          const a = i === 0 ? ease(ramp(t, X.b.start + .8, X.b.start + 1.4)) : ease(ramp(t, when[i] - .5, when[i]));
          if (a > 0 && pp.front) tag(g, pp.x, pp.y, names[i], { a, dy: i === 1 ? -74 : -66, dx: i === 2 ? -30 : 0 });
        });
      }
    },
  };
}

// ---------- the zodiac band: real stick figures on a cylinder; the spring point crawls ----------
function buildZodiac() {
  const s = world(); const c = cam(36);
  starfield(s, 380, 5, 2000, 80);
  const RC = 18;
  const ringM = BRASS;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RC, .09, 16, 360), ringM); ring.rotation.x = Math.PI / 2; s.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(RC + .9, .05, 12, 360), BRASS_D); ring2.rotation.x = Math.PI / 2; ring2.position.y = -1.9; s.add(ring2);
  const ring3 = ring2.clone(); ring3.position.y = 1.9; s.add(ring3);
  const posOn = (lon, y, r = RC) => { const l = lon * RAD; return V3(r * Math.cos(l), y, -r * Math.sin(l)); };
  for (const [key, con] of Object.entries(DATA.constellations)) {
    const col = key === 'Aqr' ? '#7fe0d8' : '#d3c4a6';
    const pts = con.s.map(([l, b]) => posOn(l, RC * Math.tan(b * RAD) * .92));
    con.e.forEach((e) => s.add(fat([pts[e[0]], pts[e[1]]], { color: col, width: 2.2, opacity: .8 })));
    const big = pts.filter((_, i) => con.s[i][2] < 2.6), small = pts.filter((_, i) => con.s[i][2] >= 2.6);
    if (big.length) s.add(points(big, 30, STAR8, '#fff4d8', { alphaTest: .25 }));
    if (small.length) s.add(points(small, 18, STAR8, '#efe7d6', { alphaTest: .25 }));
  }
  // borders along the band
  const seq = DATA.cseq;
  for (let i = 1; i < seq.length; i++) {
    const l = seq[i].l;
    s.add(fat([posOn(l, -6.4), posOn(l, 6.4)], { color: '#e2b85c', width: 2.2, dash: .4, gap: .32, opacity: .85 }));
    const tick = new THREE.Mesh(new THREE.BoxGeometry(.14, 3.8, .14), BRASS_D); tick.position.copy(posOn(l, 0, RC + .9)); s.add(tick);
  }
  // sector highlight strip for the current constellation
  const stripGeo = new THREE.BufferGeometry(); const stripMat = new THREE.MeshBasicMaterial({ color: COL('#e2b85c'), transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false });
  const strip = new THREE.Mesh(stripGeo, stripMat); s.add(strip);
  function setStrip(l0, l1) {
    const n = 48, p = new Float32Array((n + 1) * 6), idx = [];
    for (let i = 0; i <= n; i++) { const l = lerp(l0, l1, i / n), a = posOn(l, -6.2), b = posOn(l, 6.2); p.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    stripGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); stripGeo.setIndex(idx); stripGeo.computeBoundingSphere();
  }
  // the Earth in the middle, the Sun on the ring, the sight line between
  const earth = planet('earth', 1.05, { outline: .014 }); earth.rotation.z = EPS; s.add(earth);
  const sunStar = points([V3()], 150, STAR8, '#ffdf8a', { alphaTest: .2 }); sunStar.material.color.multiplyScalar(2); s.add(sunStar);
  const sunGlow = points([V3()], 300, SOFT, '#f2bb4e', { alphaTest: 0, add: true, opacity: .75 }); s.add(sunGlow);
  const beam = fat([V3(), V3(1, 0, 0)], { color: '#f0c95a', width: 3.4, boost: 1.5 }); s.add(beam);
  const conAt = (l) => { l = (l + 720) % 360; let k = seq[0].c; for (const q of seq) if (l >= q.l) k = q.c; return k; };
  const bounds = (k) => { // longitudinal extent of the constellation on the ecliptic
    if (k === 'Psc') return [351.66 - 360, 28.69];
    const i = seq.findIndex((q) => q.c === k); const nxt = i + 1 < seq.length ? seq[i + 1].l : 360; return [seq[i].l, nxt];
  };
  return {
    scene: s, camera: c,
    update(t, X) {
      const lon = -prec(X.year);
      const sp = posOn(lon, 0);
      sunStar.geometry.attributes.position.setXYZ(0, sp.x, sp.y, sp.z); sunStar.geometry.attributes.position.needsUpdate = true;
      sunGlow.geometry.attributes.position.setXYZ(0, sp.x, sp.y, sp.z); sunGlow.geometry.attributes.position.needsUpdate = true;
      beam.geometry.setPositions([0, 0, 0, sp.x, sp.y, sp.z]);
      earth.userData.body.rotation.y = t * .6;
      const k = conAt(lon), [a, b] = bounds(k); setStrip(a, b);
      stripMat.opacity = 0; strip.visible = false;
      // the camera sits behind the Earth, a little above the band, looking out at the Sun; it swings with the point
      const u = ease(ramp(t, X.b.start - .4, X.b.start + 4));
      const az = (lon + 180) * RAD + lerp(.5, .16, u) + Math.sin(t * .13) * .03;
      const rr = lerp(12, 8.2, u), y = lerp(9, 3.5, u);
      c.position.set(rr * Math.cos(az), y, -rr * Math.sin(az));
      const look = posOn(lon, lerp(0, .8, u));
      c.lookAt(look);
      this.lon = lon; this.con = k;
    },
    overlay(g, t, X) {
      const a0 = ease(ramp(t, X.b.start + .1, X.b.start + .6));
      plaque(g, yearText(X.year), W / 2, 106, { a: a0 });
      // names of constellations in view
      for (const q of ['Gem', 'Tau', 'Ari', 'Psc', 'Aqr', 'Cap']) {
        const [l0, l1] = bounds(q), mid = (l0 + l1) / 2, v = posOn(mid, 5.3), pp = project(c, v);
        const dot = v.clone().sub(c.position).normalize().dot(posOn(this.lon, 0).sub(c.position).normalize());
        if (pp.front && dot > .55) tag(g, pp.x, pp.y, CONS_NAME[q], { a: a0 * clamp((dot - .55) * 8), dy: 0, dx: 0, stemless: true, fill: q === this.con ? C.gold2 : C.parch, size: q === this.con ? 32 : 26 });
      }
      if (X.border) {
        const pp = project(c, posOn(351.66, 0));
        tag(g, pp.x, pp.y, T_('≈ 2597: граница Водолея', '≈ 2597: the border of Aquarius'), { a: a0, dy: 196, size: 30, fill: C.gold2 });
        const k = (t - X.border) / .9;
        if (k > 0 && k < 1) {
          const q = project(c, posOn(this.lon, 0)), u = EASE.o(k);
          for (let i = 0; i < 16; i++) { const q0 = i / 16 * Math.PI * 2 + .2, r0 = 70 + u * 240, r1 = r0 + (1 - u) * 90; line(g, [[q.x + Math.cos(q0) * r0, q.y + Math.sin(q0) * r0], [q.x + Math.cos(q0) * r1, q.y + Math.sin(q0) * r1]], '#bff4ec', 6 * (1 - u) + 1.5); }
        }
      }
      const aVP = X.border ? 0 : ease(ramp(t, CUE.vp - .1, CUE.vp + .3)) * (1 - ease(ramp(t, CUE.vp + 3.4, CUE.vp + 3.9)));
      if (aVP > 0) { const pp = project(c, posOn(this.lon, 0)); tag(g, pp.x, pp.y, T_('точка весны', 'the spring point'), { a: aVP, dy: -118, size: 30 }); }
    },
  };
}

// ---------- the brass orrery: planets on arms, the hands of the clock ----------
const ORB = { E: 1.7, J: 3.1, S: 4.3, U: 5.5, N: 6.6, P: 7.7 };
function buildOrrery() {
  const s = world('#0e2329', 1.0); const c = cam(36);
  starfield(s, 260, 9, 1600, 60);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 10, .32, 180), BRASS_D); base.position.y = -.16; s.add(base);
  const plateTex = ctex(4096, 4096, (g, w) => {
    const cx = w / 2, cy = w / 2, K = w / 2 / 9.6;
    g.fillStyle = '#16313a'; g.fillRect(0, 0, w, w);
    // rails drawn in chalk on a night-blue table
    g.strokeStyle = 'rgba(125,154,147,.5)'; g.setLineDash([26, 22]); g.lineWidth = 5;
    for (const k in ORB) { g.beginPath(); g.arc(cx, cy, ORB[k] * K, 0, TAU); g.stroke(); }
    g.setLineDash([]);
    // zodiac band
    const r0 = 8.25 * K, r1 = 9.5 * K;
    for (let i = 0; i < 12; i++) {
      const a0 = -i * 30 * RAD, a1 = -(i + 1) * 30 * RAD;
      g.beginPath(); g.arc(cx, cy, r1, a0, a1, true); g.arc(cx, cy, r0, a1, a0, false); g.closePath();
      g.fillStyle = i % 2 ? '#8f2f18' : '#c8a766'; g.fill(); g.strokeStyle = '#17100c'; g.lineWidth = 6; g.stroke();
      const m = (a0 + a1) / 2, r = (r0 + r1) / 2;
      g.save(); g.translate(cx + Math.cos(m) * r, cy + Math.sin(m) * r); g.rotate(dialRot(-m, 330));
      g.fillStyle = i % 2 ? '#e9dbb0' : '#3a1a10'; g.font = `700 ${Math.round(.42 * K)}px "Segoe Print", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(SIGNS[i], 0, 0); g.restore();
    }
    g.strokeStyle = '#e2b85c'; g.lineWidth = 3;
    for (let i = 0; i < 360; i += 5) { const a = i * RAD, q0 = r0 - (i % 30 ? 16 : 34), q1 = r0; g.beginPath(); g.moveTo(cx + Math.cos(a) * q0, cy + Math.sin(a) * q0); g.lineTo(cx + Math.cos(a) * q1, cy + Math.sin(a) * q1); g.stroke(); }
  });
  const plate = new THREE.Mesh(new THREE.CircleGeometry(9.6, 180), new THREE.MeshBasicMaterial({ map: plateTex }));
  plate.rotation.x = -Math.PI / 2; plate.rotation.z = 0; plate.position.y = .012; s.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(9.62, .08, 14, 240), BRASS_L); rim.rotation.x = Math.PI / 2; s.add(rim);
  // central column and gears
  const col = new THREE.Mesh(new THREE.LatheGeometry([[.62, 0], [.62, .16], [.34, .26], [.24, .5], [.2, 1.1], [.17, 2.2], [.28, 2.34], [.1, 2.46], [0, 2.5]].map((q) => new THREE.Vector2(q[0], q[1])), 48), BRASS); s.add(col);
  const gearShape = (R0, teeth) => { const sh = new THREE.Shape(); const n = teeth * 4; for (let i = 0; i <= n; i++) { const a = i / n * TAU, m = i % 4; const r = (m === 1 || m === 2) ? R0 * 1.09 : R0 * .94; const x = r * Math.cos(a), y = r * Math.sin(a); if (i) sh.lineTo(x, y); else sh.moveTo(x, y); } const hole = new THREE.Path(); hole.absarc(0, 0, R0 * .22, 0, TAU, true); sh.holes.push(hole); return sh; };
  const gearGeo = (R0, teeth, d = .1) => { const g = new THREE.ExtrudeGeometry(gearShape(R0, teeth), { depth: d, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 2, curveSegments: 12 }); g.rotateX(-Math.PI / 2); return g; };
  const gears = [
    { m: new THREE.Mesh(gearGeo(.95, 24), BRASS), x: 0, z: 0, y: .04, w: 1 },
    { m: new THREE.Mesh(gearGeo(.5, 12), BRASS_L), x: 1.36, z: .35, y: .04, w: -2 },
    { m: new THREE.Mesh(gearGeo(.72, 18), BRASS_D), x: -.9, z: 1.32, y: .04, w: -1.333 },
    { m: new THREE.Mesh(gearGeo(.38, 10), BRASS), x: .2, z: -1.25, y: .04, w: -2.4 },
  ];
  gears.forEach((q) => { q.m.position.set(q.x, q.y, q.z); s.add(q.m); });
  // the Sun on the column
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(.5, 48, 32), new THREE.MeshBasicMaterial({ color: COL('#ffd67a').multiplyScalar(1.3) })); sunBall.position.y = 2.72; s.add(sunBall);
  const hull = new THREE.Mesh(new THREE.SphereGeometry(.52, 32, 24), INKM); hull.position.y = 2.72; s.add(hull);
  const rays = points([V3(0, 2.72, 0)], 190, STAR8, '#f2bb4e', { alphaTest: .2 }); s.add(rays);
  const pl = new THREE.PointLight(0xffd9a0, 12, 40, 1.4); pl.position.y = 2.72; s.add(pl);
  // arms
  const arms = {};
  const list = [['E', 'earth', .24, .62], ['J', 'jupiter', .5, .86], ['S', 'saturn', .4, 1.1], ['U', 'uranus', .3, 1.34], ['N', 'neptune', .3, 1.58], ['P', 'pluto', .16, 1.82]];
  for (const [k, kind, R, y] of list) {
    const g = new THREE.Group();
    const L = ORB[k];
    const arm = new THREE.Mesh(new THREE.BoxGeometry(L + .9, .05, .1), BRASS); arm.position.set((L - .9) / 2, y, 0); g.add(arm);
    const weight = new THREE.Mesh(new THREE.SphereGeometry(.14, 20, 14), BRASS_D); weight.position.set(-.9, y, 0); g.add(weight);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 12), BRASS_L); post.position.set(L, y + .25, 0); g.add(post);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .07, 24), BRASS_L); collar.position.set(0, y, 0); g.add(collar);
    const P = planet(kind, R, { outline: .03, ringTilt: 18 }); P.position.set(L, y + .5 + R * .5, 0); g.add(P);
    const pivot = new THREE.Group(); pivot.add(g); s.add(pivot);
    arms[k] = { pivot, g, P, arm, y, L, R };
  }
  // the slowest hand: a long thin needle for the spring point
  const needleP = new THREE.Group();
  const needle = new THREE.Mesh(new THREE.BoxGeometry(8.4, .03, .05), enamel('#7fe0d8', .3)); needle.material.emissive = COL('#2a9c94'); needle.material.emissiveIntensity = .9; needle.position.set(4.2, .1, 0); needleP.add(needle); s.add(needleP);
  const glow = points([V3()], 120, SOFT, '#ffe7a8', { alphaTest: 0, add: true, opacity: 0 }); s.add(glow);
  return {
    scene: s, camera: c, arms,
    update(t, X) {
      const y = X.year;
      for (const k in arms) { arms[k].pivot.rotation.y = helio(k, y).lon * RAD; }
      needleP.rotation.y = -prec(y) * RAD;
      const gearA = (y - 2000) * 1.2;
      gears.forEach((q) => { q.m.rotation.y = gearA * q.w; });
      for (const k in arms) arms[k].P.userData.body.rotation.y = t * .7;
      // the highlighted arm glows
      let best = null;
      for (const [k, cue] of [['J', CUE.j], ['S', CUE.s], ['U', CUE.u], ['N', CUE.n], ['P', CUE.p]]) if (t >= cue - .05) best = k;
      if (best && t < X.end && !X.clock) {
        const A = arms[best]; const v = V3(); A.P.getWorldPosition(v);
        glow.geometry.attributes.position.setXYZ(0, v.x, v.y, v.z); glow.geometry.attributes.position.needsUpdate = true;
        glow.material.opacity = .85 * (1 - .7 * ramp(t, (best === 'J' ? CUE.j : best === 'S' ? CUE.s : best === 'U' ? CUE.u : best === 'N' ? CUE.n : CUE.p), (best === 'J' ? CUE.j : best === 'S' ? CUE.s : best === 'U' ? CUE.u : best === 'N' ? CUE.n : CUE.p) + 1));
      } else glow.material.opacity = 0;
      // the camera starts low among the gears and climbs
      const u = X.clock ? ease(ramp(t, X.t0 + 5, X.t0 + 11)) * .12 : ease(ramp(t, X.b.start - .4, CUE.fast + .6));
      const az = X.clock ? -.1 + (t - X.t0) * .022 : lerp(-.25, .85, ease(ramp(t, X.b.start - .5, X.end + .5)));
      const rr = lerp(10.6, 17.6, u), hh = lerp(2.3, 11.2, u);
      c.position.set(rr * Math.cos(az), hh, rr * Math.sin(az));
      const look = V3(0, lerp(1.25, .6, u), 0);
      c.lookAt(look);
    },
    overlay(g, t, X) {
      if (X.clock) return;
      const v = V3();
      for (const [k, cue, per] of [['J', CUE.j, T_('12 лет', '12 years')], ['S', CUE.s, T_('29 лет', '29 years')], ['U', CUE.u, T_('84 года', '84 years')], ['N', CUE.n, T_('165 лет', '165 years')], ['P', CUE.p, T_('248 лет', '248 years')]]) {
        const a = ease(ramp(t, cue - .05, cue + .25));
        if (a <= 0) continue;
        arms[k].P.getWorldPosition(v); v.y += arms[k].R + .3;
        const pp = project(c, v);
        tag(g, pp.x, pp.y, `${NAMES[k]} · ${per}`, { a, dy: -56, size: 25 });
      }
      const aN = ease(ramp(t, X.b.start + 3.3, X.b.start + 3.8)) * (1 - ease(ramp(t, CUE.j - .1, CUE.j + .3)));
      if (aN > 0) {
        const ly = -prec(X.year), pp = project(c, V3(8 * Math.cos(ly * RAD), .1, -8 * Math.sin(ly * RAD)));
        tag(g, pp.x, pp.y, T_('точка весны · 25 772 года', 'spring point · 25,772 years'), { a: aN, dy: -80, size: 26 });
      }
    },
  };
}

// ---------- the 2020 conjunction, seen through an eyepiece, then signs against constellations ----------
function buildConj() {
  const s = world('#0b1d23', .6); const c = cam(30);
  starfield(s, 200, 21, 1500, 40);
  const J = planet('jupiter', 1.1, { outline: .016 }), Sat = planet('saturn', .92, { outline: .016, ringTilt: 14 });
  s.add(J, Sat);
  s.userData.sun.position.set(-6, 3, 7);
  const moons = []; const mp = points([V3(-1.9, 0, 0), V3(-2.6, 0, 0), V3(2.2, 0, 0), V3(3.3, 0, 0)], 7, DOT, '#efe7d6', { alphaTest: .3 }); J.add(mp);
  c.position.set(0, 0, 13); c.lookAt(0, 0, 0);
  const borderLine = fat([V3(0, -5, 0), V3(0, 5, 0)], { color: '#e2b85c', width: 3, dash: .28, gap: .2 }); s.add(borderLine);
  const k = 2.1;       // world units per degree of longitude
  return {
    scene: s, camera: c,
    update(t, X) {
      const date = X.date;
      const lj = lonAt('J', date), ls = lonAt('S', date);
      const track = 300.2;    // the eyepiece follows the pair slowly toward the sign border
      const cen = lerp(297.6, 300.45, ease(ramp(msToYear(date), 2020.905, 2020.975)));
      J.position.set((lj - cen) * k, -1.3, 0); Sat.position.set((ls - cen) * k, 1.22, -.6);
      borderLine.position.x = (300 - cen) * k;
      J.userData.body.rotation.y = t * .18; Sat.userData.body.rotation.y = t * .25;
      J.rotation.z = .06;
      c.position.set(Math.sin(t * .12) * .25, Math.cos(t * .1) * .15, 15.6 - ease(ramp(t, X.b.start, X.gc + 2)) * 1.0);
      c.lookAt(0, 0, 0);
      this.borderX = project(c, V3((300 - cen) * k, 3.6, 0)).x;
    },
    overlay(g, t, X) {
      // the brass eyepiece around the view
      eyepiece(g, ease(ramp(t, X.b.start - .4, X.b.start + .2)));
      plaque(g, dateText(X.date), W / 2, 92, { a: ease(ramp(t, X.b.start + .2, X.b.start + .7)) });
      const bx = this.borderX, by = 200;
      const a = ease(ramp(t, X.b.start + .9, X.b.start + 1.5));
      tag(g, bx - 150, by + 16, SIGNS[9], { a, dy: 0, stemless: true, size: 25 });
      tag(g, bx + 150, by + 16, SIGNS[10], { a, dy: 0, stemless: true, size: 25, fill: C.gold2 });
      const a2 = ease(ramp(t, X.gc + 1.5, X.gc + 2));
      if (a2 > 0) {
        const px = project(c, J.position), ps = project(c, Sat.position);
        tag(g, (px.x + ps.x) / 2 + 28, (px.y + ps.y) / 2 + 14, T_('ближе всего с 1623 года', 'closest since 1623'), { a: a2, dy: 0, stemless: true, size: 27 });
      }
    },
  };
}
function buildSigns() {
  const s = world('#0e2329', .8); const c = cam(34);
  starfield(s, 300, 31, 1500, 40);
  // outer ring: the real constellations, unequal; inner ring: the equal signs
  const mkRing = (r0, r1, draw, n = 2048) => {
    const t = ctex(n, n, (g, w) => { g.clearRect(0, 0, w, w); draw(g, w / 2, r0 / r1 * w / 2, w / 2 - 2); });
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 240, 1), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    // ring uv: planar over the bounding square
    const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / r1 / 2 + .5, pos.getY(i) / r1 / 2 + .5);
    return m;
  };
  const fontPx = (p) => `700 ${p}px "Segoe Print", serif`;
  const label = (g, cx, a, r, text, col, size) => { g.save(); g.translate(cx + Math.cos(a) * r, cx - Math.sin(a) * r); g.rotate(dialRot(a, 321)); g.fillStyle = col; g.font = fontPx(size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 0); g.restore(); };
  const consRing = mkRing(7.2, 9, (g, cx, r0, r1) => {
    const seq = DATA.cseq;
    for (let i = 0; i < seq.length; i++) {
      const a0 = seq[i].l * RAD, a1 = (i + 1 < seq.length ? seq[i + 1].l : 360) * RAD;
      g.beginPath(); g.arc(cx, cx, r1, -a0, -a1, true); g.arc(cx, cx, r0, -a1, -a0, false); g.closePath();
      g.fillStyle = seq[i].c === 'Aqr' ? '#1c645c' : (i % 2 ? '#16313a' : '#1d414a'); g.fill(); g.strokeStyle = '#e2b85c'; g.lineWidth = 4; g.stroke();
      if ((seq[i].c !== 'Psc' || i > 0) && seq[i].c !== 'Sco') { const m = (a0 + a1) / 2, span = (a1 - a0) / RAD; label(g, cx, seq[i].c === 'Psc' ? 2 * Math.PI - 0.0 + 10 * RAD : m, (r0 + r1) / 2, CONS_NAME[seq[i].c], '#e9e2d6', clamp(span * 2.6, 34, 62)); }
    }
    // little stars
    for (const [k, con] of Object.entries(DATA.constellations)) for (const q of con.s) {
      const a = q[0] * RAD, rr = lerp(r0, r1, .5 + q[1] / 22 * .8);
      g.fillStyle = '#efe7d6'; g.beginPath(); g.arc(cx + Math.cos(a) * rr, cx - Math.sin(a) * rr, 5, 0, TAU); g.fill();
    }
  });
  consRing.rotation.x = -Math.PI / 2; s.add(consRing);
  const signsRing = mkRing(5.2, 7, (g, cx, r0, r1) => {
    for (let i = 0; i < 12; i++) {
      const a0 = i * 30 * RAD, a1 = (i + 1) * 30 * RAD;
      g.beginPath(); g.arc(cx, cx, r1, -a0, -a1, true); g.arc(cx, cx, r0, -a1, -a0, false); g.closePath();
      g.fillStyle = i === 0 ? '#b0451f' : (i % 2 ? '#c8a766' : '#a8884a'); g.fill(); g.strokeStyle = '#17100c'; g.lineWidth = 6; g.stroke();
      label(g, cx, (a0 + a1) / 2, (r0 + r1) / 2, SIGNS[i], i === 0 ? '#f2e8d0' : '#2b1c15', 64);
    }
  });
  signsRing.rotation.x = -Math.PI / 2;
  const signsPivot = new THREE.Group(); signsPivot.add(signsRing); s.add(signsPivot);
  const rim0 = new THREE.Mesh(new THREE.TorusGeometry(9.04, .07, 12, 240), BRASS_L); rim0.rotation.x = Math.PI / 2; s.add(rim0);
  const rim1 = new THREE.Mesh(new THREE.TorusGeometry(7.1, .07, 12, 240), BRASS); rim1.rotation.x = Math.PI / 2; s.add(rim1);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(5.16, .05, 12, 240), BRASS); rim2.rotation.x = Math.PI / 2; s.add(rim2);
  const earth = planet('earth', .95, { outline: .014 }); earth.position.y = 1.0; s.add(earth);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 1, 16), BRASS); stem.position.y = .5; s.add(stem);
  const needle = fat([V3(), V3(9.2, 0, 0)], { color: '#f0c95a', width: 4, boost: 1.5 }); needle.position.y = .06; signsPivot.add(needle);
  const needleTip = points([V3(9.4, .06, 0)], 46, STAR8, '#ffe9a8', { alphaTest: .2 }); signsPivot.add(needleTip);
  return {
    scene: s, camera: c,
    update(t, X) {
      signsPivot.rotation.y = -prec(X.year) * RAD;
      earth.userData.body.rotation.y = t * .5;
      const az = .9 + (t - X.t0) * .03;
      const u = ease(ramp(t, X.t0, X.t0 + 2));
      const rr = lerp(16.5, 14, u), hh = lerp(11, 15.5, u);
      c.position.set(rr * Math.sin(az), hh, rr * Math.cos(az)); c.lookAt(.4, -.6, .4);
    },
    overlay(g, t, X) {
      plaque(g, yearText(X.year), W / 2, 92, { a: ease(ramp(t, X.t0 + .1, X.t0 + .5)) });
      const pr = (y, lon, r) => project(c, V3(r * Math.cos(lon * RAD), y, -r * Math.sin(lon * RAD)));
      const a = ease(ramp(t, X.t0 + .9, X.t0 + 1.4));
      const lon = -prec(X.year);
      if (a > 0) {
        let p = pr(0, lon + 15, 6.1); tag(g, p.x, p.y, T_('знаки', 'signs'), { a, dy: -96, dx: -60, size: 28, fill: C.gold2 });
        p = pr(0, lon - 62, 8.1); tag(g, p.x, p.y, T_('созвездия', 'constellations'), { a, dy: -86, dx: 30, size: 28 });
      }
    },
  };
}

// ---------- the zodiac wheel with five hands: real geocentric longitudes ----------
const RAIL = { J: 6.3, S: 5.5, U: 4.7, N: 3.9, P: 3.1 };
function buildWheel() {
  const s = world('#0e2329', .9); const c = cam(33);
  starfield(s, 280, 41, 1700, 70);
  const tex = ctex(4096, 4096, (g, w) => {
    const cx = w / 2, K = w / 2 / 9.2;
    g.fillStyle = '#15303a'; g.fillRect(0, 0, w, w);
    // grid of the disc
    g.strokeStyle = 'rgba(125,154,147,.42)'; g.lineWidth = 5; g.setLineDash([24, 20]);
    for (const k in RAIL) { g.beginPath(); g.arc(cx, cx, RAIL[k] * K, 0, TAU); g.stroke(); }
    g.lineWidth = 4; g.setLineDash([8, 22]);
    for (let i = 0; i < 12; i++) { const a = i * 30 * RAD; g.beginPath(); g.moveTo(cx + Math.cos(a) * 1.2 * K, cx - Math.sin(a) * 1.2 * K); g.lineTo(cx + Math.cos(a) * 7.05 * K, cx - Math.sin(a) * 7.05 * K); g.stroke(); }
    g.setLineDash([]);
    const r0 = 7.2 * K, r1 = 9.1 * K;
    const air = { 2: 1, 6: 1, 10: 1 };
    for (let i = 0; i < 12; i++) {
      const a0 = i * 30 * RAD, a1 = (i + 1) * 30 * RAD;
      g.beginPath(); g.arc(cx, cx, r1, -a0, -a1, true); g.arc(cx, cx, r0, -a1, -a0, false); g.closePath();
      g.fillStyle = i % 2 ? '#8f2f18' : '#c8a766'; g.fill(); g.strokeStyle = '#17100c'; g.lineWidth = 7; g.stroke();
      const m = (a0 + a1) / 2, r = (r0 + r1) / 2;
      g.save(); g.translate(cx + Math.cos(m) * r, cx - Math.sin(m) * r); g.rotate(dialRot(m, 320));
      g.fillStyle = i % 2 ? '#efe3c7' : '#2b1c15'; g.font = `700 ${Math.round(.52 * K)}px "Segoe Print", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(SIGNS[i], 0, 0); g.restore();
      // degree ticks
      g.strokeStyle = i % 2 ? '#e9c98a' : '#3a1a10'; g.lineWidth = 3;
      for (let d = 0; d < 30; d += 5) { const q = (i * 30 + d) * RAD; g.beginPath(); g.moveTo(cx + Math.cos(q) * r0, cx - Math.sin(q) * r0); g.lineTo(cx + Math.cos(q) * (r0 + (d % 15 ? 14 : 30)), cx - Math.sin(q) * (r0 + (d % 15 ? 14 : 30))); g.stroke(); }
    }
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(9.2, 180), new THREE.MeshBasicMaterial({ map: tex })); disc.rotation.x = -Math.PI / 2; s.add(disc);
  // the disc is painted with lon increasing counter-clockwise as seen from above
  const uv = disc.geometry.attributes.uv, pos = disc.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 18.4 + .5, pos.getY(i) / 18.4 + .5);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(9.35, 9.7, .5, 180), BRASS_D); edge.position.y = -.27; s.add(edge);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(9.25, .09, 14, 240), BRASS_L); rim.rotation.x = Math.PI / 2; s.add(rim);
  const rimI = new THREE.Mesh(new THREE.TorusGeometry(7.16, .05, 12, 240), BRASS); rimI.rotation.x = Math.PI / 2; s.add(rimI);
  const hubStem = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, .9, 24), BRASS); hubStem.position.y = .42; s.add(hubStem);
  const earth = planet('earth', .72, { outline: .018 }); earth.position.y = 1.35; s.add(earth);
  // hands
  const hands = {};
  const kinds = { J: ['jupiter', .46], S: ['saturn', .38], U: ['uranus', .3], N: ['neptune', .3], P: ['pluto', .2] };
  let h = .34;
  for (const k of ['J', 'S', 'U', 'N', 'P']) {
    const g = new THREE.Group(), L = RAIL[k];
    const bar = new THREE.Mesh(new THREE.BoxGeometry(L, .03, .055), BRASS); bar.position.set(L / 2, h, 0); g.add(bar);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .34, 10), BRASS_L); post.position.set(L, h + .17, 0); g.add(post);
    const P = planet(kinds[k][0], kinds[k][1], { outline: .035, ringTilt: 18 }); P.position.set(L, h + .34 + kinds[k][1] * .6, 0); g.add(P);
    s.add(g); hands[k] = { g, P, h, L, R: kinds[k][1] };
    h += .06;
  }
  // aspect figures: filled translucent polygon + gold lines, rebuilt each frame
  const mkLine = (col, w, boost) => { const l = fat([V3(), V3(1, 0, 0)], { color: col, width: w, boost }); l.visible = false; s.add(l); return l; };
  const lines = { gold: Array.from({ length: 6 }, () => mkLine('#f0c95a', 5, 1.6)), red: [mkLine('#e0502a', 6, 1.7)], ghost: Array.from({ length: 3 }, () => fat([V3(), V3(1, 0, 0)], { color: '#e2b85c', width: 2.4, dash: .22, gap: .18, opacity: .7 })) };
  lines.ghost.forEach((l) => { l.visible = false; s.add(l); });
  const fillGeo = new THREE.BufferGeometry(); const fillMat = new THREE.MeshBasicMaterial({ color: COL('#f0c95a'), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const fill = new THREE.Mesh(fillGeo, fillMat); fill.position.y = .02; s.add(fill);
  const glow = points([V3()], 120, SOFT, '#ffe7a8', { alphaTest: 0, add: true, opacity: 0 }); s.add(glow);
  const sector = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: COL('#ffe7a8'), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); sector.position.y = .03; s.add(sector);
  const setSector = (sign) => {
    const n = 32, p = new Float32Array((n + 1) * 6), idx = [];
    for (let i = 0; i <= n; i++) { const a = (sign * 30 + i / n * 30) * RAD, c0 = Math.cos(a), s0 = Math.sin(a); p.set([7.2 * c0, 0, -7.2 * s0, 9.1 * c0, 0, -9.1 * s0], i * 6); if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    sector.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); sector.geometry.setIndex(idx); sector.geometry.computeBoundingSphere();
  };
  const handTip = (k, lon) => { const L = RAIL[k], a = lon * RAD; return V3(L * Math.cos(a), hands[k].h + .1, -L * Math.sin(a)); };
  return {
    scene: s, camera: c, hands,
    update(t, X) {
      const date = X.date;
      for (const k in hands) { const lon = lonAt(k, date); hands[k].g.rotation.y = lon * RAD; hands[k].P.userData.body.rotation.y = t * .6; hands[k].lon = lon; }
      earth.userData.body.rotation.y = t * .4;
      // the figure for this moment
      lines.gold.forEach((l) => { l.visible = false; }); lines.red[0].visible = false; lines.ghost.forEach((l) => { l.visible = false; }); fillMat.opacity = 0; glow.material.opacity = 0; sector.material.opacity = 0;
      const F = X.figure;
      if (F) {
        const set = (l, a, b) => { l.geometry.setPositions([a.x, a.y, a.z, b.x, b.y, b.z]); l.visible = true; };
        const tips = F.keys.map((k) => handTip(k, hands[k].lon));
        const u = F.a;
        if (F.kind === 'chain' || F.kind === 'tri') {
          const n = F.kind === 'tri' ? tips.length : tips.length - 1;
          for (let i = 0; i < n; i++) { const A = tips[i], B = tips[(i + 1) % tips.length]; const seg = clamp(u * n - i); if (seg > 0) set(lines.gold[i], A, A.clone().lerp(B, seg)); }
        }
        if (F.kind === 'square') { const seg = clamp(u); set(lines.red[0], tips[0], tips[0].clone().lerp(tips[1], seg)); }
        if (F.fill) {
          const q = new Float32Array((tips.length + 1) * 3); q.set([0, 0, 0], 0); tips.forEach((v, i) => q.set([v.x, 0, v.z], (i + 1) * 3));
          const idx = []; if (F.kind === 'tri') idx.push(1, 2, 3); else for (let i = 1; i < tips.length; i++) idx.push(0, i, i + 1);
          fillGeo.setAttribute('position', new THREE.BufferAttribute(q, 3)); fillGeo.setIndex(idx); fillGeo.computeBoundingSphere();
          fillMat.opacity = .13 * u; fillMat.color.set(F.fillCol || '#f0c95a');
        }
        if (F.ghost) {
          const lon = hands[F.keys[F.keys.length - 1]].lon, r = 4.4;
          const pts = [0, 60, 120, 180].map((d) => { const a = (lon + d) * RAD; return V3(r * Math.cos(a), .1, -r * Math.sin(a)); });
          for (let i = 0; i < 3; i++) { lines.ghost[i].geometry.setPositions([pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z]); lines.ghost[i].computeLineDistances(); lines.ghost[i].visible = u > .95; }
        }
      }
      if (X.focus) {
        const v = V3(); hands[X.focus.k].P.getWorldPosition(v);
        glow.geometry.attributes.position.setXYZ(0, v.x, v.y, v.z); glow.geometry.attributes.position.needsUpdate = true;
        glow.material.opacity = X.focus.a * .9;
      }
      if (X.sector != null) { setSector(X.sector); sector.material.opacity = (X.sectorA == null ? 1 : X.sectorA) * .34; }
      // camera
      const az = X.az + (t - X.t0) * .012, rr = X.rr, hh = X.hh;
      c.position.set(X.lx + rr * Math.sin(az), hh, X.lz + rr * Math.cos(az));
      c.lookAt(X.lx, 0, X.lz);
    },
    overlay(g, t, X) {
      if (X.dateOn !== false) plaque(g, dateText(X.date, X.showDay !== false), 300, 86, { a: X.dateA == null ? 1 : X.dateA, size: 38 });
      for (const q of X.tags || []) {
        const v = V3(); hands[q.k].P.getWorldPosition(v); v.y += hands[q.k].R + .1;
        const pp = project(c, v);
        tag(g, pp.x, pp.y, q.text, { a: q.a, dy: q.dy == null ? -62 : q.dy, dx: q.dx || 0, size: q.size || 26, fill: q.fill });
      }
    },
  };
}

// ---------- the inside lane: the Earth overtakes Saturn, the sight line swings back ----------
function buildLanes() {
  const s = world('#0e2329', .9); const c = cam(34);
  starfield(s, 260, 51, 1500, 50);
  const RE = 2.6, RS = 5.6, RZ = 9.4;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.62, 48, 32), new THREE.MeshBasicMaterial({ color: COL('#ffd67a').multiplyScalar(1.3) })); s.add(sun);
  const sunHull = new THREE.Mesh(new THREE.SphereGeometry(.645, 32, 24), INKM); s.add(sunHull);
  s.add(points([V3()], 210, STAR8, '#f2bb4e', { alphaTest: .2 }));
  const pl = new THREE.PointLight(0xffe4b8, 16, 30, 1.2); s.add(pl);
  s.userData.sun.intensity = .5;
  s.add(fat(circlePts(RE), { color: '#7fd0c8', width: 3, dash: .26, gap: .18 }));
  s.add(fat(circlePts(RS), { color: '#e9dbb0', width: 3, dash: .26, gap: .18 }));
  const tex = ctex(2048, 2048, (g, w) => {
    g.clearRect(0, 0, w, w); const cx = w / 2, r1 = cx - 4, r0 = r1 * (8.9 / 10.1);
    for (let i = 0; i < 12; i++) {
      const a0 = i * 30 * RAD, a1 = (i + 1) * 30 * RAD;
      g.beginPath(); g.arc(cx, cx, r1, -a0, -a1, true); g.arc(cx, cx, r0, -a1, -a0, false); g.closePath();
      g.fillStyle = i % 2 ? '#8f2f18' : '#c8a766'; g.fill(); g.strokeStyle = '#17100c'; g.lineWidth = 5; g.stroke();
      const m = (a0 + a1) / 2, r = (r0 + r1) / 2;
      g.save(); g.translate(cx + Math.cos(m) * r, cx - Math.sin(m) * r); g.rotate(dialRot(m, 301)); g.fillStyle = i % 2 ? '#efe3c7' : '#2b1c15'; g.font = '700 50px "Segoe Print", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SIGNS[i], 0, 0); g.restore();
    }
  });
  const ringM = new THREE.Mesh(new THREE.RingGeometry(8.9, 10.1, 240, 1), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); ringM.rotation.x = -Math.PI / 2; s.add(ringM);
  { const pos = ringM.geometry.attributes.position, uv = ringM.geometry.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 20.2 + .5, pos.getY(i) / 20.2 + .5); }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(10.14, .07, 12, 240), BRASS_L); rim.rotation.x = Math.PI / 2; s.add(rim);
  const earth = planet('earth', .36, { outline: .03 }); s.add(earth);
  const sat = planet('saturn', .46, { outline: .03, ringTilt: 18 }); s.add(sat);
  const sight = fat([V3(), V3(1, 0, 0)], { color: '#f0c95a', width: 3.4, boost: 1.5 }); s.add(sight);
  const mark = points([V3()], 60, STAR8, '#ffe9a8', { alphaTest: .2 }); s.add(mark);
  // the trail the hit-point leaves on the band: drawn stepping outward so forward, back and forward again show as a loop
  const TN = 420; const trail = fat(Array.from({ length: TN }, () => V3()), { color: '#f0c95a', width: 3.4, boost: 1.3 }); s.add(trail);
  const trailPos = new Float64Array(TN * 3);
  return {
    scene: s, camera: c,
    update(t, X) {
      // one year and a bit around the December station
      const y = X.year;
      const le = helio('E', y).lon, ls = helio('S', y).lon;
      const E = V3(RE * Math.cos(le * RAD), 0, -RE * Math.sin(le * RAD)), Sp = V3(RS * Math.cos(ls * RAD), 0, -RS * Math.sin(ls * RAD));
      earth.position.copy(E).setY(.4); sat.position.copy(Sp).setY(.4);
      earth.userData.body.rotation.y = t * 1.2; sat.userData.body.rotation.y = t * .5;
      const dir = (yy) => {
        const e = helio('E', yy), q = helio('S', yy);
        const ex = RE * Math.cos(e.lon * RAD), ez = -RE * Math.sin(e.lon * RAD), qx = RS * Math.cos(q.lon * RAD), qz = -RS * Math.sin(q.lon * RAD);
        const dx = qx - ex, dz = qz - ez, L = Math.hypot(dx, dz) || 1;
        // ray from Earth through Saturn to the ring of radius RZ
        const ux = dx / L, uz = dz / L, b = ex * ux + ez * uz, cc = ex * ex + ez * ez - RZ * RZ, tt = -b + Math.sqrt(b * b - cc);
        return V3(ex + ux * tt, 0, ez + uz * tt);
      };
      const hit = dir(y);
      sight.geometry.setPositions([E.x, .4, E.z, hit.x, .02, hit.z]);
      mark.geometry.attributes.position.setXYZ(0, hit.x, .1, hit.z); mark.geometry.attributes.position.needsUpdate = true;
      const y0 = X.y0, f = [];
      for (let i = 0; i < TN; i++) {
        const yy = lerp(y0, Math.max(y, y0 + .001), i / (TN - 1)); const p = dir(yy);
        const out = 1 - (yy - y0) * .34;       // later samples sit further in, so the loop opens up
        f.push(p.x * out, .05, p.z * out);
      }
      trail.geometry.setPositions(f);
      trail.visible = y > y0 + .01;
      const az = X.az, rr = X.rr, hh = X.hh;
      c.position.set(X.lx + rr * Math.sin(az + (t - X.t0) * .015), hh, X.lz + rr * Math.cos(az + (t - X.t0) * .015));
      c.lookAt(X.lx, 0, X.lz);
      this.E = earth.position.clone(); this.Sp = sat.position.clone();
    },
    overlay(g, t, X) {
      const a = ease(ramp(t, X.t0 + .2, X.t0 + .7));
      let p = project(c, this.E); tag(g, p.x, p.y, NAMES.E, { a, dy: -48, size: 25 });
      p = project(c, this.Sp); tag(g, p.x, p.y, NAMES.S, { a, dy: -62, size: 25 });
      if (X.tagAt != null) { const b = ease(ramp(t, X.tagAt, X.tagAt + .4)); if (b > 0) plaque(g, T_('в прошлый раз: 1896', 'last time: 1896'), W / 2, 92, { a: b }); }
    },
  };
}

// ---------- the 2027 eclipse on a hand-drawn globe ----------
const ECL_PATH = [[37.0, -40], [37.2, -30], [37.0, -20], [36.5, -12], [36.1, -6], [35.8, -3], [35.3, 0], [34.8, 5], [34.0, 10], [32.8, 14], [31.5, 18], [30.2, 22], [28.6, 26], [27.0, 30], [25.7, 32.65], [24.2, 35.2], [22.4, 38.2], [20.2, 40.8], [17.5, 43.6], [14.5, 46.4], [11.6, 49.5], [8, 54]];
function buildEclipse() {
  const s = world('#0b1d23', .4); const c = cam(30);
  starfield(s, 240, 61, 1500, 60);
  const RE = 2;
  const earth = planet('earth', RE, { outline: .008 }); earth.userData.body.material.gradientMap = GRAD_SOFT; s.add(earth);
  const tilt = new THREE.Group(); s.add(tilt); tilt.add(earth);
  // a high-resolution patch over the path
  const win = { lon0: -48, lon1: 72, lat0: -8, lat1: 58 };
  const patchTex = ctex(4096, Math.round(4096 * (win.lat1 - win.lat0) / (win.lon1 - win.lon0)), (g, w, h, cv) => paintEarth(cv, win));
  const patch = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.0008, 160, 90, (win.lon0 + 180 + 90 - 90) * RAD - Math.PI / 2 * 0, (win.lon1 - win.lon0) * RAD, (90 - win.lat1) * RAD, (win.lat1 - win.lat0) * RAD), new THREE.MeshToonMaterial({ map: patchTex, gradientMap: GRAD_SOFT }));
  patch.rotation.y = -Math.PI / 2 * 2 + 0;
  earth.add(patch);
  // geographic point in the Earth's frame (three's sphere uv: u=0 at -x... lon -180)
  const geo = (lat, lon, r = RE) => { const phi = (lon + 180) * RAD, th = (90 - lat) * RAD; return V3(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th)); };
  patch.rotation.y = 0;
  patch.geometry.dispose();
  patch.geometry = new THREE.SphereGeometry(RE * 1.0008, 160, 90, (win.lon0 + 180) * RAD, (win.lon1 - win.lon0) * RAD, (90 - win.lat1) * RAD, (win.lat1 - win.lat0) * RAD);
  const pathPts = ECL_PATH.map(([la, lo]) => geo(la, lo, RE * 1.004));
  const smooth = new THREE.CatmullRomCurve3(pathPts).getPoints(260);
  const trackAll = fat(smooth, { color: '#f0c95a', width: 3, dash: .035, gap: .028, boost: 1.1 }); earth.add(trackAll);
  // shadow caps: flat rings of darkness
  const caps = [[.05, .95], [.12, .42], [.21, .2]].map(([ang, op]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.006, 64, 24, 0, TAU, 0, ang), new THREE.MeshBasicMaterial({ color: COL('#050a10'), transparent: true, opacity: op, depthWrite: false }));
    return m;
  });
  const capGroup = new THREE.Group(); caps.forEach((m) => capGroup.add(m)); earth.add(capGroup);
  const corona = points([V3()], 34, STAR8, '#fff4d8', { alphaTest: .2 }); earth.add(corona);
  // Sun and Moon lined up for the opening of the shot
  const moon = planet('moon', .52, { outline: .02 }); s.add(moon);
  s.userData.sun.position.set(-9, 3.5, 7);
  s.children.filter((q) => q.isHemisphereLight).forEach((q) => { q.intensity = .35; });
  const sunS = points([V3(-46, 15, -38)], 220, STAR8, '#ffe39a', { alphaTest: .2 }); sunS.material.color.multiplyScalar(2); s.add(sunS);
  const sunG = points([V3(-46, 15, -38)], 520, SOFT, '#f2bb4e', { alphaTest: 0, add: true, opacity: .8 }); s.add(sunG);
  const pinPts = { sp: geo(37.3, -4.6, RE * 1.01), af: geo(32.2, 12.5, RE * 1.01), lux: geo(25.7, 32.65, RE * 1.01) };
  const pts = [pinPts.sp, pinPts.af, pinPts.lux];
  const pins = points(pts, 26, STAR8, '#ffe9a8', { alphaTest: .2 }); earth.add(pins);
  const spin = new THREE.Group();
  return {
    scene: s, camera: c,
    update(t, X) {
      const f = X.f;   // 0..1 along the path
      const idx = clamp(f) * (smooth.length - 1), i0 = Math.floor(idx), i1 = Math.min(smooth.length - 1, i0 + 1);
      const pos = smooth[i0].clone().lerp(smooth[i1], idx - i0);
      // caps point at the current shadow position (caps' pole is +Y)
      const n = pos.clone().normalize();
      capGroup.quaternion.setFromUnitVectors(V3(0, 1, 0), n);
      corona.geometry.attributes.position.setXYZ(0, pos.x, pos.y, pos.z); corona.geometry.attributes.position.needsUpdate = true;
      const showA = ease(ramp(t, X.b.start - .2, X.b.start + .6));
      caps.forEach((m, i) => { m.material.opacity = [.95, .42, .2][i] * showA; });
      corona.visible = showA > .5;
      // the Earth is turned so the middle of the path faces the viewer
      const lookLat = lerp(34, 26, clamp(f * 1.6)), lookLon = lerp(-20, 36, clamp(f * 1.25));
      const target = geo(lookLat, lookLon).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(target, V3(0, 0, 1));
      earth.quaternion.copy(q);
      // moon passes in front early on and leaves
      const m = ease(ramp(t, X.b.start - .4, CUE.ecl + 1.6));
      moon.position.set(lerp(-5.2, 4.6, m), lerp(1.15, 1.5, m), lerp(4.4, 5.4, m));
      moon.userData.body.rotation.y = t * .1;
      // camera closes in
      const u = ease(ramp(t, X.b.start - .4, CUE.ecl + 2.2));
      const zz = lerp(9.5, 4.6, u);
      c.position.set(lerp(-1, .1, u), lerp(.6, .1, u), zz); c.lookAt(0, 0, 0);
      c.fov = lerp(32, 30, u); c.updateProjectionMatrix();
      this.earthQ = q;
    },
    overlay(g, t, X) {
      const wp = (v) => project(c, v.clone().applyQuaternion(this.earthQ));
      const a1 = ease(ramp(t, CUE.sp - .05, CUE.sp + .3)), a2 = ease(ramp(t, CUE.af - .05, CUE.af + .3)), a3 = ease(ramp(t, CUE.lux - .05, CUE.lux + .3));
      plaque(g, T_('2 августа 2027', '2 August 2027'), W / 2, 92, { a: ease(ramp(t, CUE.ecl - .1, CUE.ecl + .4)) });
      if (a1 > 0) { const p = wp(pinPts.sp); tag(g, p.x, p.y, T_('Испания', 'Spain'), { a: a1, dy: -74, dx: -30 }); }
      if (a2 > 0) { const p = wp(pinPts.af); tag(g, p.x, p.y, T_('Северная Африка', 'North Africa'), { a: a2, dy: 92, dx: -40 }); }
      if (a3 > 0) { const p = wp(pinPts.lux); tag(g, p.x, p.y, T_('Луксор · 6 мин 23 с', 'Luxor · 6 min 23 s'), { a: a3, dy: -80, dx: 80, fill: C.gold2 }); }
    },
  };
}

// ---------- the staircase of time: brass steps, one per year; planet tracks wind around them ----------
function buildHelix() {
  const s = world('#0e2329', .7); const c = cam(40);
  starfield(s, 420, 71, 2200, 90);
  const Y0 = 2026, Y1 = 2100, K = .42;
  const yOf = (yr) => (yr - Y0) * K;
  const RADII = { J: 4.2, S: 5.2, U: 6.2, N: 7.1, P: 8.0 };
  const path = (k, yr) => { const lon = lonAt(k, yearToMs(yr)), r = RADII[k]; return V3(r * Math.cos(lon * RAD), yOf(yr), -r * Math.sin(lon * RAD)); };
  for (const k of ['J', 'S', 'U', 'N', 'P']) {
    const pts = []; for (let yr = Y0; yr <= Y1; yr += 0.06) pts.push(path(k, yr));
    s.add(fat(pts, { color: PCOL[k], width: k === 'J' || k === 'S' ? 3.2 : 2, opacity: k === 'J' || k === 'S' ? .95 : .5 }));
  }
  // the column
  const colH = yOf(Y1) + 3;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, colH + 6, 24), BRASS_D); column.position.y = colH / 2 - 3; s.add(column);
  // one step for every year, turning once in twenty years, the Jupiter and Saturn beat
  const stepAngle = (yr) => (yr - Y0) * 18 * RAD;
  const wedge = new THREE.Shape(); wedge.moveTo(.3, -.16); wedge.lineTo(3.3, -.62); wedge.lineTo(3.3, .62); wedge.lineTo(.3, .16); wedge.closePath();
  const stepGeo = new THREE.ExtrudeGeometry(wedge, { depth: .07, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 1 }); stepGeo.rotateX(-Math.PI / 2);
  const stepHi = brass('#e6c066', .3), stepLo = brass('#a97c2c', .46), stepAlt = brass('#8f6420', .5);
  const steps = new Map();
  for (let yr = Y0; yr <= Y1; yr++) {
    const m = new THREE.Mesh(stepGeo, yr % 10 === 0 ? stepHi : (yr % 2 ? stepAlt : stepLo));
    m.position.set(0, yOf(yr), 0); m.rotation.y = stepAngle(yr);
    s.add(m); steps.set(yr, m);
  }
  // a rail along the outer ends of the steps
  const railPts = []; for (let yr = Y0; yr <= Y1; yr += .2) { const a = stepAngle(yr); railPts.push(V3(3.45 * Math.cos(a), yOf(yr) + .75, -3.45 * Math.sin(a))); }
  s.add(fat(railPts, { color: '#c9963a', width: 3 }));
  for (let yr = Y0; yr <= Y1; yr += 1) { const a = stepAngle(yr); const post = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .75, 8), BRASS); post.position.set(3.2 * Math.cos(a), yOf(yr) + .38, -3.2 * Math.sin(a)); s.add(post); }
  // the base dial
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.6, .4, 180), BRASS_D); dial.position.y = -.5; s.add(dial);
  const top = new THREE.Mesh(new THREE.CircleGeometry(9.15, 180), new THREE.MeshBasicMaterial({ color: COL('#16313a') })); top.rotation.x = -Math.PI / 2; top.position.y = -.29; s.add(top);
  const dialRim = new THREE.Mesh(new THREE.TorusGeometry(9.2, .07, 12, 240), BRASS_L); dialRim.rotation.x = Math.PI / 2; dialRim.position.y = -.28; s.add(dialRim);
  // planets riding the tracks
  const riders = { J: planet('jupiter', .46, { outline: .03 }), S: planet('saturn', .38, { outline: .03, ringTilt: 18 }), U: planet('uranus', .28, { outline: .03 }), N: planet('neptune', .28, { outline: .03 }), P: planet('pluto', .18, { outline: .04 }) };
  for (const k in riders) s.add(riders[k]);
  // the meetings: a bright bar from the pair to the step of that year
  const STEPS = [
    { y: 2032.49, a: 'S', b: 'U', cue: 'h32', text: T_('2032 · Сатурн и Уран', '2032 · Saturn and Uranus') },
    { y: 2040.83, a: 'J', b: 'S', cue: 'h40', text: T_('2040 · Весы', '2040 · Libra') },
    { y: 2060.6, a: 'J', b: 'S', cue: 'h40', d: 1.15, text: T_('2060 · Близнецы', '2060 · Gemini') },
    { y: 2080.3, a: 'J', b: 'S', cue: 'h40', d: 2.3, text: T_('2080 · Водолей', '2080 · Aquarius') },
  ];
  const conj = DATA.conj.filter((q) => q.p === 'JS' && q.y > 2030 && q.y < 2099);
  STEPS.forEach((st) => { if (st.a === 'J') { const q = conj.reduce((m, x) => (Math.abs(x.y - st.y) < Math.abs(m.y - st.y) ? x : m)); st.y = q.y; } });
  const stepObjs = STEPS.map((st) => {
    const g = new THREE.Group(); const y = yOf(st.y);
    const A = path(st.a, st.y), B = path(st.b, st.y), hub = V3(0, y, 0);
    g.add(fat([hub, A], { color: '#f0c95a', width: 4, boost: 1.4 }), fat([hub, B], { color: '#f0c95a', width: 4, boost: 1.4 }));
    g.add(points([A.clone().lerp(B, .5)], 70, STAR8, '#ffe9a8', { alphaTest: .2 }));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .05, 64), stepHi); disc.position.copy(hub); g.add(disc);
    g.visible = false; s.add(g);
    return { g, disc, A, B, y, st };
  });
  // far above: the slow hand reaches the border of Aquarius
  const farY = 150;
  s.add(fat([V3(0, yOf(Y1) + 1, 0), V3(0, farY, 0)], { color: '#e2b85c', width: 2.8, dash: 1.4, gap: 1.1 }));
  const aqr = DATA.constellations.Aqr;
  const topStar = points([V3(0, farY, 0)], 84, STAR8, '#ffe9a8', { alphaTest: .2 }); topStar.material.color.multiplyScalar(1.4); s.add(topStar);
  const wire = aqr.s.map(([l, b]) => V3((l - 335) * 1.5, farY + 16 + b * 1.5, -6));
  aqr.e.forEach((e) => s.add(fat([wire[e[0]], wire[e[1]]], { color: '#7fe0d8', width: 3 })));
  s.add(points(wire, 30, STAR8, '#dff6f2', { alphaTest: .25 }));
  return {
    scene: s, camera: c,
    update(t, X) {
      stepObjs.forEach((o) => { const c0 = CUE[o.st.cue] + (o.st.d || 0); const k = backO(ramp(t, c0 - .25, c0 + .25)); o.g.visible = k > .01; o.disc.scale.set(Math.max(k, .01), 1, Math.max(k, .01)); });
      const yr = X.camYear;
      for (const k in riders) { riders[k].position.copy(path(k, Math.min(yr + .4, Y1))); riders[k].userData.body.rotation.y = t * .7; }
      // the camera rides up beside the stairs, then swings away and looks up to the far border
      const up = 0;
      const yc = yOf(yr) + 3.4;
      const az = 0.5 + (t - X.b.start) * .14;
      const rr = lerp(15.5, 112, up);
      c.position.set(rr * Math.cos(az), lerp(yc, 20, up), rr * Math.sin(az));
      c.lookAt(0, lerp(yOf(yr) + 1.2, 72, up), 0);
      c.fov = lerp(40, 62, up); c.updateProjectionMatrix();
    },
    overlay(g, t, X) {
      plaque(g, X.camLabel, W / 2, 92, { a: X.labelA });
      stepObjs.forEach((o) => {
        const c0 = CUE[o.st.cue] + (o.st.d || 0), next = o.st.cue === 'h32' ? CUE.h40 - .2 : (o.st.d === 2.3 ? CUE.h2597 - .5 : c0 + 1.1);
        const a = ease(ramp(t, c0 - .05, c0 + .2)) * (1 - ease(ramp(t, next, next + .2)));
        if (a <= 0) return;
        tag(g, W / 2, H - 140, o.st.text, { a, dy: 0, stemless: true, size: 36, fill: C.gold2 });
      });
    },
  };
}

// ---------- the Crab: filaments round a blue heart ----------
function buildCrab() {
  const s = world('#081a20', .2); const c = cam(38);
  starfield(s, 200, 81, 2200, 90);
  const R = rng(1054);
  const nFil = 3200, perFil = 46, nMist = 70000;
  const N = nFil * perFil + nMist;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  const pal = ['#d9542a', '#e8743a', '#f2a24a', '#c23a2a', '#e8c28a', '#d9779a'].map(COL);
  let n = 0;
  const hash3 = (x, y, z) => { const s0 = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s0 - Math.floor(s0); };
  const vnoise = (x, y, z) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = (u) => u * u * (3 - 2 * u), u = f(x - xi), v = f(y - yi), w = f(z - zi); const h = (a, b, cc) => hash3(xi + a, yi + b, zi + cc); return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v), lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v), w) * 2 - 1; };
  for (let f = 0; f < nFil; f++) {
    const u = R() * 2 - 1, a = R() * TAU, q = Math.sqrt(1 - u * u);
    let d = V3(q * Math.cos(a), u, q * Math.sin(a));
    let rr = .55 + Math.pow(R(), .6) * .6;
    let p = V3(d.x * rr * 1.25, d.y * rr * .9, d.z * rr * .95);
    const color = pal[Math.floor(R() * pal.length)];
    const bright = .55 + R() * .7;
    for (let i = 0; i < perFil; i++) {
      const sc = 3.4, e = .02;
      const nx = vnoise(p.x * sc, p.y * sc + 5, p.z * sc), ny = vnoise(p.x * sc + 11, p.y * sc, p.z * sc + 3), nz = vnoise(p.x * sc + 7, p.y * sc + 2, p.z * sc);
      const v = V3(nx, ny, nz).multiplyScalar(.8).add(p.clone().normalize().multiplyScalar(.28)).normalize();
      p.addScaledVector(v, .0085);
      pos.set([p.x, p.y, p.z], n * 3);
      const w = bright * .62 * (.45 + .55 * Math.sin(i / perFil * Math.PI));
      col.set([color.r * w, color.g * w, color.b * w], n * 3);
      size[n] = 2.0 + R() * 2.2; n++;
    }
  }
  const blue = COL('#7fd0e8'), white = COL('#dff6ff');
  for (let i = 0; i < nMist; i++) {
    const u = R() * 2 - 1, a = R() * TAU, q = Math.sqrt(1 - u * u), rr = Math.pow(R(), 1.1) * .95;
    pos.set([q * Math.cos(a) * rr * 1.2, u * rr * .85, q * Math.sin(a) * rr * .9], n * 3);
    const w = .018 + .06 * (1 - rr);
    const C0 = rr < .2 ? white : blue;
    col.set([C0.r * w, C0.g * w, C0.b * w], n * 3);
    size[n] = 3 + R() * 7; n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.BufferAttribute(col, 3)); g.setAttribute('aS', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uK: { value: 1 } },
    vertexShader: 'attribute vec3 aC;attribute float aS;varying vec3 vC;uniform float uK;void main(){vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aS*uK*(3.2/-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.15,d);gl_FragColor=vec4(vC*a*1.25,a);}',
  });
  const cloud = new THREE.Points(g, m); cloud.frustumCulled = false; s.add(cloud);
  const pulsar = points([V3()], 40, STAR8, '#e8f8ff', { alphaTest: .2 }); pulsar.material.color.multiplyScalar(1.6); s.add(pulsar);
  const halo = points([V3()], 240, SOFT, '#7fd0e8', { alphaTest: 0, add: true, opacity: .12 }); s.add(halo);
  return {
    scene: s, camera: c,
    update(t, X) {
      const u = (t - X.t0);
      const k = 1 + u * .012;
      cloud.scale.setScalar(k);
      cloud.rotation.y = .4 + u * .022; cloud.rotation.x = .25;
      m.uniforms.uK.value = 1.6;
      const zz = lerp(5.3, 3.5, ease(ramp(u, 0, X.dur)));
      c.position.set(Math.sin(u * .05) * .3, .15, zz); c.lookAt(0, 0, 0);
    },
    overlay(g, t, X) {
      const a = ease(ramp(t, CUE.crab - .1, CUE.crab + .4));
      if (a > 0) plaque(g, T_('Крабовидная туманность', 'The Crab Nebula'), W / 2, 92, { a });
      const b = ease(ramp(t, CUE.crab + 1.5, CUE.crab + 2));
      if (b > 0) tag(g, W / 2 + 480, H - 150, T_('1 500 км/с', '1,500 km/s'), { a: b, dy: 0, stemless: true, size: 28 });
    },
  };
}

// ---------- registry ----------
const BUILD = { axis: buildAxis, zodiac: buildZodiac, orrery: buildOrrery, conj: buildConj, signs: buildSigns, wheel: buildWheel, lanes: buildLanes, eclipse: buildEclipse, helix: buildHelix, crab: buildCrab };
const CACHE = {};
function shot(name) { if (!CACHE[name]) CACHE[name] = BUILD[name](); return CACHE[name]; }

export const SPACE = {
  // draws one 3D frame into the 2D context g
  draw(g, name, t, X) {
    const S = shot(name);
    S.update(t, X);
    renderPass.scene = S.scene; renderPass.camera = S.camera;
    bloom.strength = X.bloom == null ? 0.22 : X.bloom;
    composer.render();
    g.drawImage(renderer.domElement, 0, 0);
    if (S.overlay) S.overlay(g, t, X);
  },
  // tools shared with the timeline
  lonAt, dateMs, yearToMs, msToYear, prec, MS, SIGNS, NAMES, dateText, yearText,
};

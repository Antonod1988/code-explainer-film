// Only the player reads clocks; FILM.frame still receives a deterministic, quantized time.
const UI = {
  play: 'Пуск', pause: 'Пауза', mute: 'Звук', unmute: 'Без звука',
  mix: 'микс', voice: 'только голос', silent: 'без звука', loading: 'загрузка звука…',
  save: 'Сохранить PNG', timeline: 'Шкала времени',
};
const timecode = (t) => {
  const n = Math.floor(Math.max(0, t) * 100 + 1e-6);
  return `${Math.floor(n / 6000)}:${String(Math.floor(n / 100) % 60).padStart(2, '0')}.${String(n % 100).padStart(2, '0')}`;
};

export async function preview({ FILM, canvas, ctx, fps }) {
  const tl = TIMING[LANG], duration = FILM.DUR;
  const beats = tl.beats || [];
  const local = (value) => typeof value === 'string' ? value : (value?.[LANG] || value?.en || '');
  const style = document.createElement('style');
  style.textContent = `
    html,body{height:100%;overflow:hidden;color:#ddd;font:14px/1.5 system-ui,sans-serif}
    body{display:flex;flex-direction:column;background:#111}
    #stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
    #stage canvas{display:block;flex:none;width:auto;height:auto}
    #controls{flex:none;background:#202124;padding:10px 16px;max-height:42vh;overflow:auto}
    #controls button{background:#34363a;color:#eee;border:1px solid #666;border-radius:5px;padding:6px 12px;cursor:pointer}
    #buttons{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    #strip{width:100%;height:64px;touch-action:none;cursor:crosshair;margin-top:6px}
    #narration{max-height:5em;overflow:auto;margin-top:5px;color:#ccc;white-space:pre-wrap}
    #narration mark{background:#e8c777;color:#151515;border-radius:2px}
    #metrics{position:fixed;top:8px;right:10px;background:#111b;padding:2px 6px;font:12px monospace;pointer-events:none}
  `;
  document.head.appendChild(style);
  const stage = document.createElement('div'); stage.id = 'stage';
  document.body.appendChild(stage); stage.appendChild(canvas);
  const controls = document.createElement('div'); controls.id = 'controls';
  controls.innerHTML = `<div id="buttons"><button id="play"></button><button id="mute"></button><button id="save"></button><span id="clock"></span><span id="source"></span></div><canvas id="strip" tabindex="0"></canvas><div id="beat"></div><div id="narration"></div>`;
  document.body.appendChild(controls);
  const find = (id) => controls.querySelector('#' + id);
  const playButton = find('play'), muteButton = find('mute'), strip = find('strip');
  const clock = find('clock'), sourceLabel = find('source'), beatLabel = find('beat'), narration = find('narration');
  strip.setAttribute('aria-label', UI.timeline);
  const metrics = document.createElement('div'); metrics.id = 'metrics'; document.body.appendChild(metrics);
  find('save').textContent = UI.save;
  sourceLabel.textContent = UI.loading;
  let scriptBeats = {};
  fetch('../script/script.json').then((r) => r.ok ? r.json() : null).then((s) => {
    scriptBeats = Object.fromEntries((s?.beats || []).map((b) => [b.id, b]));
    shownBeat = null; update();
  }).catch(() => {});

  let audio = null, gain = null, mix = null, takes = [], sources = [], muted = false;
  let playing = false, t = 0, base = 0, anchor = 0, request = 0, generation = 0;
  let shownBeat = null, wordNodes = [], lastWord = -1, cues = [];
  let drawCount = 0, sampleStart = performance.now(), achieved = 0, lastFrame = null;
  for (const b of beats) for (const [name, at] of Object.entries(b.cues || {})) cues.push({ name, at });

  const ready = (async () => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio = new Audio(); gain = audio.createGain(); gain.connect(audio.destination);
      const decode = async (url) => {
        try {
          const r = await fetch(url);
          return r.ok ? await audio.decodeAudioData(await r.arrayBuffer()) : null;
        } catch (e) { return null; }
      };
      mix = await decode(`../audio/mix/${encodeURIComponent(LANG)}.wav`);
      if (!mix) {
        takes = await Promise.all(beats.map(async (b) => ({ start: b.start,
          buffer: await decode(`../audio/voice/${encodeURIComponent(LANG)}/${encodeURIComponent(b.id)}.mp3`) })));
        takes = takes.filter((b) => b.buffer);
      }
    } catch (e) { audio = null; }
    finally { sourceLabel.textContent = mix ? UI.mix : takes.length ? UI.voice : UI.silent; }
  })();
  const audible = () => audio && (mix || takes.length);
  const now = () => audible() ? audio.currentTime : performance.now() / 1000;
  const current = () => playing ? Math.min(duration, base + now() - anchor) : t;
  function stopSources() {
    for (const source of sources) { try { source.stop(); } catch (e) { /* already ended */ } source.disconnect(); }
    sources = [];
  }
  function schedule() {
    stopSources();
    if (!audible()) return;
    const clips = mix ? [{ start: 0, buffer: mix }] : takes;
    for (const clip of clips) {
      const offset = Math.max(0, base - clip.start);
      if (offset >= clip.buffer.duration) continue;
      const source = audio.createBufferSource(); source.buffer = clip.buffer; source.connect(gain);
      source.start(anchor + Math.max(0, clip.start - base), offset);
      sources.push(source);
    }
  }
  // resume() is invoked in the input event, before awaiting any fetch/decode work.
  function unlock() { return audio ? audio.resume().catch(() => {}) : Promise.resolve(); }
  async function play() {
    const token = ++generation;
    const resumed = unlock();
    await ready; await resumed;
    if (token !== generation || playing) return;
    if (t >= duration) t = 0;
    playing = true; base = t; anchor = now();
    sampleStart = performance.now(); drawCount = 0;
    schedule(); update(); request = requestAnimationFrame(loop);
  }
  function pause() {
    ++generation;
    t = current(); playing = false;
    cancelAnimationFrame(request); stopSources(); draw();
  }
  function seek(value) {
    ++generation;
    t = Math.max(0, Math.min(duration, value));
    if (playing) { base = t; anchor = now(); schedule(); }
    draw();
  }
  function toggleMute() {
    muted = !muted;
    if (gain) gain.gain.value = muted ? 0 : 1;
    update();
  }
  function save() {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `${LANG}_${t.toFixed(3)}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }
  function drawStrip() {
    const g = strip.getContext('2d'), w = strip.width, h = strip.height, scale = w / duration;
    g.fillStyle = '#161719'; g.fillRect(0, 0, w, h);
    g.font = `${12 * devicePixelRatio}px system-ui`; g.textBaseline = 'middle';
    beats.forEach((b, i) => {
      const x = b.start * scale, width = b.dur * scale;
      g.fillStyle = i % 2 ? '#465460' : '#35444d'; g.fillRect(x, h * .22, width, h * .6);
      g.fillStyle = '#ddd';
      if (width > g.measureText(b.id).width + 8) g.fillText(b.id, x + 4, h * .52);
    });
    g.strokeStyle = '#b9ab7d'; g.lineWidth = devicePixelRatio;
    for (const cue of cues) { const x = cue.at * scale; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * .25); g.stroke(); }
    g.strokeStyle = '#f5cd70'; g.lineWidth = 2 * devicePixelRatio;
    g.beginPath(); g.moveTo(t * scale, 0); g.lineTo(t * scale, h); g.stroke();
  }
  function update() {
    playButton.textContent = playing ? UI.pause : UI.play;
    muteButton.textContent = muted ? UI.unmute : UI.mute;
    clock.textContent = `${timecode(t)} / ${timecode(duration)}`;
    const b = [...beats].reverse().find((b) => t >= b.start);
    if (shownBeat !== b) {
      shownBeat = b; lastWord = -1; wordNodes = []; narration.replaceChildren();
      const sb = scriptBeats[b?.id];
      beatLabel.textContent = b ? `${b.id} · ${b.shot || ''} · ${local(sb?.title || b.title)}` : '';
      if (b) {
        const text = (sb?.[LANG] || (b.words || []).map((w) => w[2]).join(' ')).replace(/\{\w+\}/g, '');
        let pos = 0;
        (b.words || []).forEach((word, i) => {
          const at = text.toLowerCase().indexOf(word[2].toLowerCase().trim(), pos);
          if (at < 0) return;
          narration.append(document.createTextNode(text.slice(pos, at)));
          const span = document.createElement('span'); span.textContent = text.slice(at, at + word[2].trim().length);
          narration.append(span); wordNodes[i] = span; pos = at + span.textContent.length;
        });
        narration.append(document.createTextNode(text.slice(pos)));
      }
    }
    const index = b ? (b.words || []).findIndex((w) => t >= w[0] && t < w[1]) : -1;
    if (index !== lastWord) {
      if (wordNodes[lastWord]) { const old = wordNodes[lastWord]; const span = document.createElement('span'); span.textContent = old.textContent; old.replaceWith(span); wordNodes[lastWord] = span; }
      if (wordNodes[index]) { const old = wordNodes[index]; const mark = document.createElement('mark'); mark.textContent = old.textContent; old.replaceWith(mark); wordNodes[index] = mark; }
      lastWord = index;
    }
    drawStrip();
  }
  function draw() {
    const frame = Math.floor(t * fps) / fps;
    if (!playing && frame === lastFrame) { update(); return; }
    const start = performance.now();
    ctx.save(); try { FILM.frame(ctx, frame); } finally { ctx.restore(); }
    lastFrame = frame;
    const ms = performance.now() - start;
    drawCount++;
    const elapsed = performance.now() - sampleStart;
    if (elapsed >= 1000) { achieved = drawCount * 1000 / elapsed; drawCount = 0; sampleStart = performance.now(); }
    metrics.textContent = `${ms.toFixed(1)} ms · ${playing ? achieved.toFixed(1) : '0.0'} fps`;
    update();
  }
  function loop() {
    if (!playing) return;
    t = current(); draw();
    if (t >= duration) pause(); else request = requestAnimationFrame(loop);
  }
  function resize() {
    const scale = Math.min(stage.clientWidth / canvas.width, stage.clientHeight / canvas.height);
    canvas.style.width = `${canvas.width * scale}px`; canvas.style.height = `${canvas.height * scale}px`;
    strip.width = Math.max(1, Math.round(strip.clientWidth * devicePixelRatio)); strip.height = 64 * devicePixelRatio;
    drawStrip();
  }
  new ResizeObserver(resize).observe(stage);
  addEventListener('resize', resize);
  playButton.onclick = () => { playing ? pause() : play(); };
  muteButton.onclick = toggleMute; find('save').onclick = save;
  // Any first gesture unlocks sound, including seeking or saving a still.
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });
  let dragging = false, resumeDrag = false;
  const pointerTime = (event) => (event.clientX - strip.getBoundingClientRect().left) / strip.clientWidth * duration;
  strip.onpointerdown = (event) => {
    dragging = true; resumeDrag = playing; pause(); strip.setPointerCapture(event.pointerId); seek(pointerTime(event));
  };
  strip.onpointermove = (event) => {
    if (dragging) seek(pointerTime(event));
    const at = pointerTime(event), near = cues.reduce((best, c) => Math.abs(c.at - at) < Math.abs((best?.at ?? Infinity) - at) ? c : best, null);
    strip.title = near && Math.abs(near.at - at) * strip.clientWidth / duration < 8 ? `${near.name} · ${timecode(near.at)}` : timecode(at);
  };
  const endDrag = () => { if (!dragging) return; dragging = false; if (resumeDrag) play(); };
  strip.onpointerup = endDrag; strip.onpointercancel = endDrag;
  addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (![' ', 'arrowleft', 'arrowright', ',', '.', '[', ']', 'home', 'end', 'm', 's'].includes(key)) return;
    event.preventDefault();
    if (key === ' ') { playing ? pause() : play(); return; }
    if (key === 'm') { toggleMute(); return; }
    if (key === 's') { save(); return; }
    const at = current();
    if (key === ',' || key === '.') { pause(); seek((Math.floor(at * fps + 1e-6) + (key === ',' ? -1 : 1)) / fps); }
    if (key === 'arrowleft' || key === 'arrowright') seek(at + (key === 'arrowleft' ? -1 : 1) * (event.shiftKey ? 5 : 1));
    if (key === 'home') seek(0);
    if (key === 'end') seek(duration);
    if (key === '[') seek([...beats].reverse().find((b) => b.start < at - 1e-6)?.start ?? 0);
    if (key === ']') seek(beats.find((b) => b.start > at + 1e-6)?.start ?? duration);
  });
  resize(); draw();
}

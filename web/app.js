// Interface da versão web: três fontes de música, estado da dança, galeria e controles.
//  - Microfone: ouve o som ambiente (a balada) e detecta a batida em tempo real.
//  - Minhas músicas: toca arquivos do aparelho; cada música é analisada inteira antes,
//    então a dança segue uma grade de batidas exata, sem o atraso do microfone.
//  - YouTube ou SoundCloud: o player oficial toca dentro da página e o personagem ouve pelo microfone.
(function () {
  'use strict';
  const { BeatDetector } = window.GuntherBeat;
  const { computeScene, drawScene, characters } = window.GuntherDancer;
  const { analyzeTrack, downmix } = window.GuntherTrack;
  const { parseMusicLink } = window.GuntherLinks;
  const i18n = window.GuntherI18n;
  const t = i18n.t;
  // Nome e descrição de cada personagem no idioma atual.
  const charLabel = (c) => t('char.' + c.id + '.name', null, c.name);
  const charDesc = (c) => t('char.' + c.id + '.desc', null, c.desc || '');

  const $ = (id) => document.getElementById(id);
  const canvas = $('stage');
  const ctx = canvas.getContext('2d');
  const footer = document.querySelector('.footer');
  const startOverlay = $('start-overlay');
  const errorBox = $('error');
  const bpmText = $('bpm');
  const syncDot = $('sync-dot');
  const syncLabel = $('sync-label');
  const bars = { bass: $('bar-bass'), mid: $('bar-mid'), high: $('bar-high') };
  const stopButton = $('pause-button');
  const settingsPanel = $('settings');
  const offsetInput = $('offset');
  const offsetValue = $('offset-value');
  const fullscreenButton = $('fullscreen-button');
  const charName = $('char-name');
  const startCharName = $('start-char-name');
  const gallery = $('gallery');
  const galleryGrid = $('gallery-grid');
  const player = $('player');
  const fileInput = $('file-input');
  const linkBox = $('linkbox');

  const now = () => performance.now() / 1000;

  const state = {
    level: 0, bass: 0, mid: 0, high: 0,
    bpm: 0, hasBeat: false, beatPeriod: 0.48,
    lastBeatTime: now(), beatCount: 0, confidence: 0,
    isSilent: true, lastOnsetTime: -10,
  };
  let displayedBpm = 0;
  let mode = null; // 'mic' | 'file' | 'link' | null
  let wakeLock = null;

  // ---------------------------------------------------------------- ajustes

  // Ajuste de sincronia (ms), salvo no navegador. Positivo adianta o boneco.
  let userOffsetMs = Number(localStorage.getItem('gunther-offset') || 0);
  offsetInput.value = userOffsetMs;
  const showOffset = () => { offsetValue.textContent = (userOffsetMs > 0 ? '+' : '') + userOffsetMs + ' ms'; };
  showOffset();
  offsetInput.addEventListener('input', () => {
    userOffsetMs = Number(offsetInput.value);
    localStorage.setItem('gunther-offset', String(userOffsetMs));
    showOffset();
  });

  // ---------------------------------------------------------------- galeria e personagens

  const cards = characters.map((c, i) => {
    const button = document.createElement('button');
    button.className = 'card';
    button.setAttribute('aria-pressed', 'false');
    const thumb = document.createElement('canvas');
    const title = document.createElement('strong');
    const desc = document.createElement('span');
    button.append(thumb, title, desc);
    button.addEventListener('click', () => { setCharacter(i); closeGallery(); });
    galleryGrid.appendChild(button);
    return { button, thumb, title, desc, ctx: thumb.getContext('2d'), character: c };
  });

  function openGallery() {
    gallery.hidden = false;
    settingsPanel.hidden = true;
    const current = cards[charIndex];
    if (current) current.button.focus({ preventScroll: true });
  }
  function closeGallery() { gallery.hidden = true; }
  $('gallery-button').addEventListener('click', openGallery);
  $('start-gallery-button').addEventListener('click', openGallery);
  charName.addEventListener('click', openGallery);
  $('gallery-close').addEventListener('click', closeGallery);
  gallery.addEventListener('click', (e) => { if (e.target === gallery) closeGallery(); });

  // Sem música, as miniaturas dançam num ritmo de demonstração a 120 BPM.
  function demoState(t) {
    const period = 0.5;
    const whole = Math.floor(t / period);
    const pulse = 0.5 * (1 + Math.cos(2 * Math.PI * (t / period - whole)));
    return {
      level: 0.65, bass: 0.4 + 0.5 * pulse, mid: 0.5, high: 0.4, bpm: 120,
      hasBeat: true, beatPeriod: period, lastBeatTime: whole * period, beatCount: whole,
      confidence: 1, isSilent: false, lastOnsetTime: whole * period,
    };
  }

  const isLive = () => !!mode && state.hasBeat && !state.isSilent;

  function drawThumbnails(dpr, lead) {
    const t = now();
    const live = isLive();
    const src = live ? state : demoState(t);
    for (const card of cards) {
      const w = card.thumb.clientWidth, h = card.thumb.clientHeight;
      if (!w || !h) continue;
      const pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
      if (card.thumb.width !== pw || card.thumb.height !== ph) { card.thumb.width = pw; card.thumb.height = ph; }
      card.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scene = computeScene(src, t, performance.now() / 1000, live ? lead : 0, card.character.moveCount);
      drawScene(card.ctx, w, h, scene, card.character);
    }
  }

  let charIndex = 0;
  function setCharacter(i) {
    charIndex = ((i % characters.length) + characters.length) % characters.length;
    charName.textContent = charLabel(characters[charIndex]);
    startCharName.textContent = charLabel(characters[charIndex]);
    cards.forEach((card, j) => card.button.setAttribute('aria-pressed', String(j === charIndex)));
    localStorage.setItem('gunther-character', characters[charIndex].id);
  }
  setCharacter(Math.max(0, characters.findIndex((c) => c.id === localStorage.getItem('gunther-character'))));
  $('prev-char').addEventListener('click', () => setCharacter(charIndex - 1));
  $('next-char').addEventListener('click', () => setCharacter(charIndex + 1));
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape' && !gallery.hidden) { closeGallery(); return; }
    if (!gallery.hidden) return;
    if (e.key === 'ArrowLeft') setCharacter(charIndex - 1);
    if (e.key === 'ArrowRight') setCharacter(charIndex + 1);
    if (e.key === ' ' && mode === 'file') { e.preventDefault(); togglePlay(); }
  });
  let touchX = null;
  canvas.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (dx < -50) setCharacter(charIndex + 1);
    if (dx > 50) setCharacter(charIndex - 1);
  }, { passive: true });

  // ---------------------------------------------------------------- palco

  let stageHeight = window.innerHeight;
  let stageTop = 0;
  function measureStage() {
    // O chão fica logo acima dos controles e o personagem abaixo do painel do link:
    // ele nunca fica escondido atrás do player.
    const top = footer.getBoundingClientRect().top;
    stageHeight = Math.max(240, Math.min(window.innerHeight, (top - 10) / 0.78));
    stageTop = linkBox.hidden ? 0 : linkBox.getBoundingClientRect().bottom + 8;
    // O painel de ajustes abre logo acima dos controles, sem cobrir o player.
    settingsPanel.style.bottom = Math.max(16, window.innerHeight - top + 8) + 'px';
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    measureStage();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(measureStage);
    ro.observe(footer);
    ro.observe(linkBox);
  }
  resize();

  // ---------------------------------------------------------------- HUD

  function updateHud() {
    if (state.bpm > 0 && Math.abs(state.bpm - displayedBpm) >= 0.8) displayedBpm = state.bpm;
    const text = state.bpm > 0 && !state.isSilent && mode ? String(Math.round(displayedBpm)) : '—';
    if (bpmText.textContent !== text) bpmText.textContent = text;

    let quality, label;
    let key;
    if (!mode) { quality = 'off'; key = 'sync.paused'; }
    else if (mode === 'file') {
      const entry = queue[current];
      if (!entry) { quality = 'off'; key = 'sync.chooseMusic'; }
      else if (!entry.result) { quality = 'searching'; key = entry.error ? 'sync.analyzeFailed' : 'sync.analyzing'; }
      else if (audio.paused) { quality = 'off'; key = 'sync.paused'; }
      else if (state.isSilent || !state.hasBeat) { quality = 'searching'; key = 'sync.waitingBeat'; }
      else { quality = 'locked'; key = 'sync.locked'; }
    } else if (!state.hasBeat || state.isSilent) { quality = 'searching'; key = state.isSilent ? 'sync.listening' : 'sync.searching'; }
    else if (state.confidence > 0.55) { quality = 'locked'; key = 'sync.locked'; }
    else { quality = 'locking'; key = 'sync.locking'; }
    label = t(key);
    if (syncDot.dataset.quality !== quality) syncDot.dataset.quality = quality;
    if (syncLabel.textContent !== label) syncLabel.textContent = label;

    bars.bass.style.height = Math.max(8, state.bass * 100) + '%';
    bars.mid.style.height = Math.max(8, state.mid * 100) + '%';
    bars.high.style.height = Math.max(8, state.high * 100) + '%';
  }

  function frame() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = now();
    if (mode === 'file') updateFileState(t);
    // Adiantamento: no microfone compensa a captura; nos arquivos só o tempo de desenhar o quadro.
    const lead = (mode === 'file' ? 0.02 : 0.06 + (mic.context ? (mic.context.baseLatency || 0) : 0)) + userOffsetMs / 1000;
    const character = characters[charIndex];
    const scene = computeScene(state, t, performance.now() / 1000, lead, character.moveCount);
    drawScene(ctx, window.innerWidth, window.innerHeight, scene, character, stageHeight, stageTop);
    if (!gallery.hidden) drawThumbnails(dpr, lead);
    updateHud();
    if (mode === 'file') updatePlayerProgress();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function resetState() {
    state.hasBeat = false; state.isSilent = true; state.bpm = 0; state.confidence = 0;
    state.level = 0; state.bass = 0; state.mid = 0; state.high = 0;
  }

  async function keepScreenOn() {
    try {
      if (navigator.wakeLock && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (_) { /* sem wake lock, tudo bem */ }
  }

  function setAudioSession(type) {
    // Safari: "playback" toca mesmo com a chave de silencioso; "play-and-record" quando o microfone está aberto.
    try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (_) { /* ignora */ }
  }

  // ---------------------------------------------------------------- fonte 1: microfone

  const mic = { context: null, stream: null, detector: null };

  function applySnapshot(s) {
    if (mode !== 'mic' && mode !== 'link') return;
    state.level = s.level; state.bass = s.bass; state.mid = s.mid; state.high = s.high;
    state.bpm = s.bpm; state.hasBeat = s.hasBeat; state.beatPeriod = s.beatPeriod;
    state.lastBeatTime = s.lastBeatTime; state.beatCount = s.beatCount;
    state.confidence = s.confidence; state.isSilent = s.isSilent;
    if (s.onset) state.lastOnsetTime = s.time;
  }

  async function startMic() {
    if (mic.stream) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError(t('error.noMic'));
      return false;
    }
    try {
      setAudioSession('play-and-record');
      const AC = window.AudioContext || window.webkitAudioContext;
      mic.context = new AC();
      if (mic.context.state === 'suspended') await mic.context.resume();
      mic.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      const det = new BeatDetector(mic.context.sampleRate);
      det.onSnapshot = applySnapshot;
      mic.detector = det;
      const source = mic.context.createMediaStreamSource(mic.stream);
      const sink = mic.context.createGain();
      sink.gain.value = 0;
      let node = null;
      if (mic.context.audioWorklet) {
        try {
          await mic.context.audioWorklet.addModule('worklet.js');
          node = new AudioWorkletNode(mic.context, 'gunther-capture');
          node.port.onmessage = (e) => det.process(e.data, now());
        } catch (_) { node = null; }
      }
      if (!node) {
        // Caminho antigo, para navegadores sem AudioWorklet.
        node = mic.context.createScriptProcessor(1024, 1, 1);
        node.onaudioprocess = (e) => det.process(e.inputBuffer.getChannelData(0), now());
      }
      source.connect(node);
      node.connect(sink);
      sink.connect(mic.context.destination);
      return true;
    } catch (err) {
      const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      showError(denied ? t('error.micDenied') : t('error.micFailed', { msg: err && err.message ? err.message : String(err) }));
      stopMic();
      return false;
    }
  }

  function stopMic() {
    if (mic.stream) mic.stream.getTracks().forEach((t) => t.stop());
    if (mic.context) mic.context.close().catch(() => {});
    mic.stream = null; mic.context = null; mic.detector = null;
  }

  // ---------------------------------------------------------------- fonte 2: minhas músicas

  const audio = new Audio();
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  const queue = []; // { file, name, url, result, error, progress, promise }
  let current = -1;
  let analysisChain = Promise.resolve();
  // Relógio da música: o currentTime do <audio> anda aos pulos em alguns navegadores,
  // então extrapolamos a partir de uma âncora e só corrigimos quando ele desvia.
  const clock = { song: 0, perf: 0, lastRaw: -1 };

  const fmt = (t) => {
    if (!isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  async function decodeFile(file) {
    const data = await file.arrayBuffer();
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    let lastErr;
    // 22 kHz basta para achar batidas e gasta metade da memória.
    for (const rate of [22050, 44100, 48000]) {
      try {
        const octx = new OAC(1, 1, rate);
        return await octx.decodeAudioData(data.slice(0));
      } catch (err) { lastErr = err; }
    }
    throw lastErr;
  }

  // Analisa uma música por vez, para não gastar memória demais no celular.
  function analyze(entry) {
    if (!entry.promise) {
      entry.promise = analysisChain = analysisChain.catch(() => {}).then(async () => {
        try {
          const decoded = await decodeFile(entry.file);
          const channels = [];
          for (let c = 0; c < decoded.numberOfChannels; c++) channels.push(decoded.getChannelData(c));
          entry.result = await analyzeTrack(downmix(channels), decoded.sampleRate, (p) => {
            entry.progress = p;
            if (entry === queue[current]) renderPlayer();
          });
        } catch (err) {
          entry.error = err;
        }
        renderPlayer();
        // Já deixa a próxima pronta.
        const next = queue[queue.indexOf(entry) + 1];
        if (next && entry === queue[current]) analyze(next);
      });
    }
    return entry.promise;
  }

  function addFiles(files) {
    const list = Array.from(files || []).filter((f) => f && (f.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i.test(f.name)));
    for (const file of list) {
      queue.push({ file, name: file.name.replace(/\.[^.]+$/, ''), url: null, result: null, error: null, progress: 0, promise: null });
    }
    return list.length;
  }

  function playIndex(i, autoplay = true) {
    if (i < 0 || i >= queue.length) return;
    current = i;
    const entry = queue[i];
    if (!entry.url) entry.url = URL.createObjectURL(entry.file);
    audio.src = entry.url;
    audio.currentTime = 0;
    clock.song = 0; clock.perf = now(); clock.lastRaw = -1;
    resetState();
    analyze(entry);
    // A música começa na hora; o personagem entra na dança assim que a análise termina.
    if (autoplay) audio.play().catch(() => renderPlayer());
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: entry.name, artist: 'Gunther Dance' }); } catch (_) { /* ignora */ }
    }
    renderPlayer();
  }

  function togglePlay() {
    if (current < 0 && queue.length) { playIndex(0); return; }
    if (current < 0) { fileInput.click(); return; }
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  }

  function songTime(t) {
    const raw = audio.currentTime;
    if (audio.paused || audio.seeking) {
      clock.song = raw; clock.perf = t; clock.lastRaw = raw;
      return raw;
    }
    const rate = audio.playbackRate || 1;
    const predicted = clock.song + (t - clock.perf) * rate;
    if (raw !== clock.lastRaw) {
      clock.lastRaw = raw;
      const err = raw - predicted;
      if (Math.abs(err) > 0.08) { clock.song = raw; clock.perf = t; return raw; }
      clock.song += err * 0.1; // corrige devagar, sem tranco
    }
    return clock.song + (t - clock.perf) * rate;
  }

  function upperBound(arr, x) {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= x) lo = mid + 1; else hi = mid; }
    return lo;
  }

  // A cada quadro, monta o estado da dança a partir da grade de batidas da música.
  function updateFileState(t) {
    const entry = queue[current];
    const r = entry && entry.result;
    if (!r) { resetState(); return; }
    const st = songTime(t);
    const f = Math.min(r.level.length - 1, Math.max(0, Math.round((st - r.frameOffset) * r.frameRate)));
    state.level = r.level[f] || 0;
    state.bass = r.bass[f] || 0;
    state.mid = r.mid[f] || 0;
    state.high = r.high[f] || 0;
    state.isSilent = audio.paused || !!r.silent[f];
    state.confidence = 1;
    const beats = r.beats;
    const i = upperBound(beats, st) - 1;
    if (audio.paused || i < 0 || beats.length < 2) {
      state.hasBeat = false;
      state.bpm = r.bpm;
      return;
    }
    const period = i + 1 < beats.length ? beats[i + 1] - beats[i] : beats[i] - beats[i - 1];
    state.hasBeat = true;
    state.beatPeriod = period;
    state.beatCount = i;
    state.lastBeatTime = t - (st - beats[i]);
    state.bpm = 60 / period;
    const o = upperBound(r.onsets, st) - 1;
    state.lastOnsetTime = o >= 0 ? t - (st - r.onsets[o]) : -10;
  }

  // Interface do player.
  const plTitle = $('pl-title'), plStatus = $('pl-status'), plPlay = $('pl-play');
  const plSeek = $('pl-seek'), plCur = $('pl-cur'), plDur = $('pl-dur'), plQueue = $('pl-queue');
  let seeking = false;

  function renderPlayer() {
    const entry = queue[current];
    plTitle.textContent = entry ? entry.name : t('player.none');
    let status = '';
    if (!entry) status = t('player.empty');
    else if (entry.error) status = t('player.badFile');
    else if (!entry.result) status = t('player.analyzing', { p: Math.round((entry.progress || 0) * 100) });
    else status = t('player.info', { bpm: Math.round(entry.result.bpm), i: current + 1, n: queue.length });
    plStatus.textContent = status;
    plPlay.textContent = audio.paused ? '▶' : '⏸';
    plPlay.setAttribute('aria-label', t(audio.paused ? 'player.play' : 'player.pause'));
    plPlay.title = plPlay.getAttribute('aria-label');
    $('pl-prev').disabled = current <= 0;
    $('pl-next').disabled = current < 0 || current >= queue.length - 1;
    // Lista.
    plQueue.replaceChildren(...queue.map((q, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.textContent = q.name;
      if (i === current) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => playIndex(i));
      li.appendChild(b);
      return li;
    }));
  }

  function updatePlayerProgress() {
    const d = audio.duration;
    if (!seeking) plSeek.value = isFinite(d) && d > 0 ? String(Math.round((audio.currentTime / d) * 1000)) : '0';
    const cur = fmt(audio.currentTime), dur = fmt(d);
    if (plCur.textContent !== cur) plCur.textContent = cur;
    if (plDur.textContent !== dur) plDur.textContent = dur;
  }

  plPlay.addEventListener('click', togglePlay);
  $('pl-prev').addEventListener('click', () => {
    if (audio.currentTime > 3 || current <= 0) audio.currentTime = 0; else playIndex(current - 1);
  });
  $('pl-next').addEventListener('click', () => playIndex(current + 1));
  $('pl-add').addEventListener('click', () => fileInput.click());
  $('pl-list').addEventListener('click', () => { plQueue.hidden = !plQueue.hidden; });
  plSeek.addEventListener('input', () => {
    seeking = true;
    if (isFinite(audio.duration)) plCur.textContent = fmt((Number(plSeek.value) / 1000) * audio.duration);
  });
  plSeek.addEventListener('change', () => {
    if (isFinite(audio.duration)) audio.currentTime = (Number(plSeek.value) / 1000) * audio.duration;
    seeking = false;
  });
  for (const ev of ['play', 'pause', 'playing']) audio.addEventListener(ev, () => { clock.lastRaw = -1; renderPlayer(); });
  audio.addEventListener('seeked', () => { clock.song = audio.currentTime; clock.perf = now(); });
  audio.addEventListener('ended', () => { if (current < queue.length - 1) playIndex(current + 1); else renderPlayer(); });
  audio.addEventListener('error', () => {
    const entry = queue[current];
    if (entry && !entry.error) { entry.error = new Error('formato'); renderPlayer(); }
  });
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    const handlers = { play: () => audio.play(), pause: () => audio.pause(),
      nexttrack: () => playIndex(current + 1), previoustrack: () => playIndex(current - 1) };
    for (const [k, fn] of Object.entries(handlers)) { try { ms.setActionHandler(k, fn); } catch (_) { /* ignora */ } }
  }

  fileInput.addEventListener('change', () => {
    const firstNew = queue.length;
    const added = addFiles(fileInput.files);
    fileInput.value = '';
    if (!added) return;
    enterMode('file');
    if (current < 0 || audio.paused) playIndex(firstNew);
    else { renderPlayer(); analyze(queue[firstNew]); }
  });

  // ---------------------------------------------------------------- fonte 3: link do YouTube ou SoundCloud

  const linkInput = $('link-input'), linkEmbed = $('link-embed'), linkHint = $('link-hint');
  const linkCollapse = $('link-collapse');
  let linkHintKey = 'link.hint';
  function renderLinkTexts() {
    linkHint.textContent = t(linkHintKey);
    linkHint.classList.toggle('warn', linkHintKey === 'link.unknown');
    linkCollapse.textContent = t(linkBox.classList.contains('collapsed') ? 'link.show' : 'link.hide');
    const frame = linkEmbed.querySelector('iframe');
    if (frame) frame.title = t(linkEmbed.dataset.kind === 'soundcloud' ? 'link.scTitle' : 'link.ytTitle');
  }

  $('link-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const parsed = parseMusicLink(linkInput.value);
    if (!parsed) {
      linkHintKey = 'link.unknown';
      renderLinkTexts();
      return;
    }
    linkHintKey = 'link.hint';
    const iframe = document.createElement('iframe');
    iframe.src = parsed.embedUrl;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('allowfullscreen', '');
    linkEmbed.dataset.kind = parsed.kind;
    linkEmbed.replaceChildren(iframe);
    linkBox.classList.remove('collapsed');
    renderLinkTexts();
    requestAnimationFrame(measureStage);
    await startMic();
  });
  linkCollapse.addEventListener('click', () => {
    linkBox.classList.toggle('collapsed');
    renderLinkTexts();
    requestAnimationFrame(measureStage);
  });

  // ---------------------------------------------------------------- troca de fonte

  function enterMode(next) {
    if (mode === next) return;
    leaveMode();
    mode = next;
    errorBox.hidden = true;
    startOverlay.hidden = true;
    document.body.classList.remove('idle');
    document.body.dataset.mode = next;
    player.hidden = next !== 'file';
    linkBox.hidden = next !== 'link';
    stopButton.hidden = false;
    if (next === 'file') { setAudioSession('playback'); renderPlayer(); }
    resetState();
    keepScreenOn();
    requestAnimationFrame(measureStage);
  }

  function leaveMode() {
    if (mode === 'mic' || mode === 'link') stopMic();
    if (mode === 'file') audio.pause();
    if (mode === 'link') linkEmbed.replaceChildren();
    mode = null;
    delete document.body.dataset.mode;
    player.hidden = true;
    linkBox.hidden = true;
    resetState();
  }

  function showSourcePicker() {
    leaveMode();
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    stopButton.hidden = true;
    startOverlay.hidden = false;
    document.body.classList.add('idle');
    requestAnimationFrame(measureStage);
  }

  $('start-button').addEventListener('click', async () => {
    errorBox.hidden = true;
    if (await startMic()) enterMode('mic');
  });
  $('src-file').addEventListener('click', () => {
    if (queue.length) { enterMode('file'); return; }
    fileInput.click();
  });
  $('src-link').addEventListener('click', () => {
    enterMode('link');
    linkInput.focus();
  });
  // enterMode('link') desliga o microfone de uma fonte anterior; ele volta ao tocar um link.
  stopButton.addEventListener('click', showSourcePicker);

  $('settings-button').addEventListener('click', () => { settingsPanel.hidden = !settingsPanel.hidden; });
  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  fullscreenButton.addEventListener('click', toggleFullscreen);
  $('settings-fullscreen').addEventListener('click', () => { settingsPanel.hidden = true; toggleFullscreen(); });
  // No iPhone o Safari não tem tela cheia para páginas: o botão nem aparece.
  if (!document.documentElement.requestFullscreen) fullscreenButton.hidden = true;
  else document.body.classList.add('can-fullscreen');

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && mode) {
      if (mic.context && mic.context.state === 'suspended') await mic.context.resume();
      keepScreenOn();
    }
  });

  // ---------------------------------------------------------------- idioma

  const langSelects = [$('lang-select'), $('start-lang')];
  for (const sel of langSelects) {
    for (const { code, name } of i18n.languages()) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = (sel.id === 'start-lang' ? '🌐 ' : '') + name;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => i18n.setLang(sel.value));
  }
  function renderLanguage() {
    langSelects.forEach((sel) => { sel.value = i18n.getLang(); });
    cards.forEach((card) => {
      card.title.textContent = charLabel(card.character);
      card.desc.textContent = charDesc(card.character);
    });
    setCharacter(charIndex);
    renderPlayer();
    renderLinkTexts();
    requestAnimationFrame(measureStage);
  }
  i18n.onChange(renderLanguage);
  i18n.apply();
  renderLanguage();

  // Ganchos para testes automatizados.
  window.__gunther = {
    state, setCharacter, characters, openGallery, closeGallery,
    current: () => characters[charIndex].id,
    mode: () => mode, isRunning: () => !!mode,
    start: () => $('start-button').click(), stop: showSourcePicker,
    audio, queue: () => queue, track: () => queue[current] || null, songTime: () => songTime(now()),
    setLang: i18n.setLang, lang: i18n.getLang,
  };
})();

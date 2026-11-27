// Captura do microfone, estado e interface da versão web do Gunther.
(function () {
  'use strict';
  const { BeatDetector } = window.GuntherBeat;
  const { computeScene, drawScene, characters } = window.GuntherDancer;

  const $ = (id) => document.getElementById(id);
  const canvas = $('stage');
  const ctx = canvas.getContext('2d');
  const startOverlay = $('start-overlay');
  const startButton = $('start-button');
  const errorBox = $('error');
  const bpmText = $('bpm');
  const syncDot = $('sync-dot');
  const syncLabel = $('sync-label');
  const bars = { bass: $('bar-bass'), mid: $('bar-mid'), high: $('bar-high') };
  const pauseButton = $('pause-button');
  const settingsButton = $('settings-button');
  const settingsPanel = $('settings');
  const offsetInput = $('offset');
  const offsetValue = $('offset-value');
  const fullscreenButton = $('fullscreen-button');
  const charName = $('char-name');

  const now = () => performance.now() / 1000;

  const state = {
    level: 0, bass: 0, mid: 0, high: 0,
    bpm: 0, hasBeat: false, beatPeriod: 0.48,
    lastBeatTime: now(), beatCount: 0, confidence: 0,
    isSilent: true, lastOnsetTime: -10,
  };
  let displayedBpm = 0;
  let running = false;
  let audioContext = null;
  let stream = null;
  let detector = null;
  let wakeLock = null;

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

  // Personagem escolhido, salvo no navegador.
  let charIndex = 0;
  function setCharacter(i) {
    charIndex = ((i % characters.length) + characters.length) % characters.length;
    charName.textContent = characters[charIndex].name;
    localStorage.setItem('gunther-character', characters[charIndex].id);
  }
  setCharacter(Math.max(0, characters.findIndex((c) => c.id === localStorage.getItem('gunther-character'))));
  $('prev-char').addEventListener('click', () => setCharacter(charIndex - 1));
  $('next-char').addEventListener('click', () => setCharacter(charIndex + 1));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') setCharacter(charIndex - 1);
    if (e.key === 'ArrowRight') setCharacter(charIndex + 1);
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

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  function applySnapshot(s) {
    state.level = s.level; state.bass = s.bass; state.mid = s.mid; state.high = s.high;
    state.bpm = s.bpm; state.hasBeat = s.hasBeat; state.beatPeriod = s.beatPeriod;
    state.lastBeatTime = s.lastBeatTime; state.beatCount = s.beatCount;
    state.confidence = s.confidence; state.isSilent = s.isSilent;
    if (s.onset) state.lastOnsetTime = s.time;
  }

  function updateHud() {
    if (state.bpm > 0 && Math.abs(state.bpm - displayedBpm) >= 0.8) displayedBpm = state.bpm;
    const text = state.bpm > 0 && !state.isSilent && running ? String(Math.round(displayedBpm)) : '—';
    if (bpmText.textContent !== text) bpmText.textContent = text;

    let quality, label;
    if (!running) { quality = 'off'; label = 'Pausado'; }
    else if (!state.hasBeat || state.isSilent) { quality = 'searching'; label = state.isSilent ? 'Ouvindo...' : 'Procurando o ritmo'; }
    else if (state.confidence > 0.55) { quality = 'locked'; label = 'No ritmo!'; }
    else { quality = 'locking'; label = 'Pegando o ritmo'; }
    if (syncDot.dataset.quality !== quality) syncDot.dataset.quality = quality;
    if (syncLabel.textContent !== label) syncLabel.textContent = label;

    bars.bass.style.height = Math.max(8, state.bass * 100) + '%';
    bars.mid.style.height = Math.max(8, state.mid * 100) + '%';
    bars.high.style.height = Math.max(8, state.high * 100) + '%';
  }

  function frame() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const baseLead = 0.06 + (audioContext ? (audioContext.baseLatency || 0) : 0);
    const character = characters[charIndex];
    const scene = computeScene(state, now(), performance.now() / 1000, baseLead + userOffsetMs / 1000, character.moveCount);
    drawScene(ctx, window.innerWidth, window.innerHeight, scene, character);
    updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  async function start() {
    errorBox.hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Este navegador não dá acesso ao microfone. No iPhone, use o Safari ou atualize o iOS.');
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioContext = audioContext || new AC();
      if (audioContext.state === 'suspended') await audioContext.resume();

      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });

      detector = new BeatDetector(audioContext.sampleRate);
      detector.onSnapshot = applySnapshot;
      const det = detector;
      const source = audioContext.createMediaStreamSource(stream);
      const sink = audioContext.createGain();
      sink.gain.value = 0;

      let node = null;
      if (audioContext.audioWorklet) {
        try {
          await audioContext.audioWorklet.addModule('worklet.js');
          node = new AudioWorkletNode(audioContext, 'gunther-capture');
          node.port.onmessage = (e) => det.process(e.data, now());
        } catch (err) {
          node = null;
        }
      }
      if (!node) {
        // Caminho antigo, para navegadores sem AudioWorklet.
        node = audioContext.createScriptProcessor(1024, 1, 1);
        node.onaudioprocess = (e) => det.process(e.inputBuffer.getChannelData(0), now());
      }
      source.connect(node);
      node.connect(sink);
      sink.connect(audioContext.destination);

      running = true;
      startOverlay.hidden = true;
      pauseButton.hidden = false;
      try {
        if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
      } catch (_) { /* sem wake lock, tudo bem */ }
    } catch (err) {
      const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      showError(denied
        ? 'Sem permissão para o microfone. Libere o microfone para este site nos ajustes do navegador e tente de novo.'
        : 'Não consegui abrir o microfone: ' + (err && err.message ? err.message : err));
      stop(false);
    }
  }

  function stop(showStart = true) {
    running = false;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    detector = null;
    state.hasBeat = false; state.isSilent = true; state.bpm = 0;
    state.level = 0; state.bass = 0; state.mid = 0; state.high = 0;
    pauseButton.hidden = true;
    if (showStart) startOverlay.hidden = false;
  }

  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', () => stop(true));
  settingsButton.addEventListener('click', () => { settingsPanel.hidden = !settingsPanel.hidden; });
  fullscreenButton.addEventListener('click', () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  });
  if (!document.documentElement.requestFullscreen) fullscreenButton.hidden = true;

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      if (running && audioContext && audioContext.state === 'suspended') await audioContext.resume();
      if (running && navigator.wakeLock && !wakeLock) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) { /* ignora */ }
      }
    }
  });

  // Ganchos para testes automatizados.
  window.__gunther = { state, start, stop, isRunning: () => running, setCharacter, characters };
})();

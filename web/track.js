// Análise completa de uma música antes de tocar: grade de batidas, BPM e envelopes de volume.
// Diferente do microfone, aqui o áudio inteiro está disponível, então dá para achar
// todas as batidas de uma vez (programação dinâmica, como no beat tracker de Ellis, 2007).
(function (root) {
  'use strict';
  const { SpectrumAnalyzer } = root.GuntherBeat || require('./beat.js');

  const yieldToUi = () => new Promise((r) => setTimeout(r, 0));

  // Mistura os canais em mono.
  function downmix(channels) {
    const n = channels[0].length;
    if (channels.length === 1) return channels[0];
    const out = new Float32Array(n);
    for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i];
    const k = 1 / channels.length;
    for (let i = 0; i < n; i++) out[i] *= k;
    return out;
  }

  function percentile(arr, p) {
    const s = Float32Array.from(arr).sort();
    return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];
  }

  // samples: Float32Array mono. Devolve { beats, onsets, bpm, frameRate, level, bass, mid, high, silent, duration }.
  async function analyzeTrack(samples, sampleRate, onProgress) {
    const fftSize = Math.pow(2, Math.round(Math.log2(sampleRate * 0.046)));
    const hop = Math.round(sampleRate / 86);
    const frameRate = sampleRate / hop;
    const half = fftSize / 2;
    const nFrames = Math.max(0, Math.floor((samples.length - fftSize) / hop) + 1);
    const spectrum = new SpectrumAnalyzer(fftSize);
    const binHz = sampleRate / fftSize;
    const bin = (hz) => Math.min(half, Math.max(1, Math.floor(hz / binHz)));
    const bands = [[bin(30), Math.max(bin(30) + 1, bin(160))]];
    bands.push([bands[0][1], Math.max(bands[0][1] + 1, bin(2000))]);
    bands.push([bands[1][1], Math.max(bands[1][1] + 1, bin(9000))]);

    const odf = new Float32Array(nFrames);
    const rms = new Float32Array(nFrames);
    const energy = [new Float32Array(nFrames), new Float32Array(nFrames), new Float32Array(nFrames)];
    let prev = new Float32Array(half), cur = new Float32Array(half);
    const win = new Float32Array(fftSize);

    for (let f = 0; f < nFrames; f++) {
      const start = f * hop;
      win.set(samples.subarray(start, start + fftSize));
      const power = spectrum.analyze(win);
      for (let k = 0; k < half; k++) cur[k] = Math.log1p(Math.sqrt(power[k]));
      let value = 0;
      for (let b = 0; b < 3; b++) {
        const [lo, hi] = bands[b];
        let flux = 0, e = 0;
        for (let k = lo; k < hi; k++) {
          const d = cur[k] - prev[k];
          if (d > 0) flux += d;
          e += power[k];
        }
        energy[b][f] = e;
        value += (flux / Math.max(1, hi - lo)) * [1, 0.5, 0.25][b];
      }
      odf[f] = f === 0 ? 0 : value;
      let sq = 0;
      const c = start + (fftSize - hop) / 2;
      for (let i = c; i < c + hop; i++) sq += samples[i] * samples[i];
      rms[f] = Math.sqrt(sq / hop);
      const tmp = prev; prev = cur; cur = tmp;
      if (f % 3000 === 2999) {
        if (onProgress) onProgress(0.8 * f / nFrames);
        await yieldToUi();
      }
    }

    // Função de onset: tira a média local (meio segundo de cada lado), corta negativos e normaliza.
    const radius = Math.round(frameRate * 0.5);
    const O = new Float32Array(nFrames);
    let acc = 0, count = 0;
    for (let i = 0; i < Math.min(nFrames, radius); i++) { acc += odf[i]; count++; }
    for (let f = 0; f < nFrames; f++) {
      const add = f + radius, rem = f - radius - 1;
      if (add < nFrames) { acc += odf[add]; count++; }
      if (rem >= 0) { acc -= odf[rem]; count--; }
      O[f] = Math.max(0, odf[f] - acc / count);
    }
    let mean = 0;
    for (let f = 0; f < nFrames; f++) mean += O[f];
    mean /= Math.max(1, nFrames);
    let v = 0;
    for (let f = 0; f < nFrames; f++) v += (O[f] - mean) ** 2;
    const std = Math.sqrt(v / Math.max(1, nFrames)) || 1;
    for (let f = 0; f < nFrames; f++) O[f] /= std;
    if (onProgress) onProgress(0.85);
    await yieldToUi();

    // Tempo: autocorrelação da função de onset na música inteira, com preferência suave por ~125 BPM.
    const lagMin = Math.max(2, Math.floor((frameRate * 60) / 200));
    const lagMax = Math.min(Math.floor(nFrames / 2), Math.ceil((frameRate * 60) / 60));
    let period = frameRate * 60 / 125;
    if (lagMax > lagMin + 2) {
      const ac = new Float32Array(lagMax * 2 + 2);
      const om = mean / std;
      for (let lag = lagMin; lag <= Math.min(2 * lagMax, nFrames - 1); lag++) {
        let s = 0;
        for (let i = 0; i + lag < nFrames; i++) s += (O[i] - om) * (O[i + lag] - om);
        ac[lag] = s / (nFrames - lag);
      }
      let best = -Infinity, bestLag = 0;
      for (let lag = lagMin; lag <= lagMax; lag++) {
        const bpm = (60 * frameRate) / lag;
        const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 125) / 0.55, 2));
        let score = ac[lag];
        if (2 * lag < ac.length) score += 0.4 * ac[2 * lag];
        score *= prior;
        if (score > best) { best = score; bestLag = lag; }
      }
      if (bestLag > 0) {
        period = bestLag;
        if (bestLag > lagMin && bestLag < lagMax) {
          const y0 = ac[bestLag - 1], y1 = ac[bestLag], y2 = ac[bestLag + 1];
          const den = y0 - 2 * y1 + y2;
          if (Math.abs(den) > 1e-12) period += Math.min(0.5, Math.max(-0.5, (0.5 * (y0 - y2)) / den));
        }
      }
    }
    if (onProgress) onProgress(0.9);
    await yieldToUi();

    // Programação dinâmica: cada batida soma a força do onset e é penalizada
    // quando o intervalo para a anterior foge do período do tempo.
    const tightness = 100;
    const C = new Float32Array(nFrames);
    const back = new Int32Array(nFrames).fill(-1);
    const pMin = Math.round(period / 2), pMax = Math.round(period * 2);
    for (let t = 0; t < nFrames; t++) {
      let best = -Infinity, arg = -1;
      for (let p = t - pMax; p <= t - pMin; p++) {
        if (p < 0) continue;
        const d = Math.log((t - p) / period);
        const score = C[p] - tightness * d * d;
        if (score > best) { best = score; arg = p; }
      }
      C[t] = O[t] + (arg >= 0 ? best : 0);
      back[t] = arg;
    }
    let last = -1, bestEnd = -Infinity;
    for (let t = Math.max(0, nFrames - Math.round(period)); t < nFrames; t++) {
      if (C[t] > bestEnd) { bestEnd = C[t]; last = t; }
    }
    const beatFrames = [];
    for (let t = last; t >= 0; t = back[t]) beatFrames.push(t);
    beatFrames.reverse();

    // Refina cada batida com interpolação parabólica no pico do onset e converte para segundos.
    // O fluxo espectral de um quadro reage ao kick um pouco antes do centro da janela;
    // ONSET_BIAS (medido nos testes) corrige esse adiantamento.
    const ONSET_BIAS = 0.008;
    const frameTime = (f) => (f * hop + fftSize / 2) / sampleRate + ONSET_BIAS;
    const refine = (f) => {
      if (f <= 0 || f >= nFrames - 1) return f;
      const y0 = O[f - 1], y1 = O[f], y2 = O[f + 1];
      const den = y0 - 2 * y1 + y2;
      return Math.abs(den) > 1e-9 ? f + Math.min(0.5, Math.max(-0.5, (0.5 * (y0 - y2)) / den)) : f;
    };
    const beats = Float64Array.from(beatFrames.map((f) => frameTime(refine(f))));

    // Onsets fortes (para o brilho no kick e os olhos de estrela do Oddity).
    const onsets = [];
    const minGap = Math.round(frameRate * 0.1);
    let lastOnset = -minGap;
    for (let f = 1; f < nFrames - 1; f++) {
      if (O[f] > 2 && O[f] >= O[f - 1] && O[f] > O[f + 1] && f - lastOnset >= minGap) {
        onsets.push(frameTime(refine(f)));
        lastOnset = f;
      }
    }

    // Envelopes de volume por banda, normalizados pelo trecho mais alto da música.
    const level = new Float32Array(nFrames);
    const silent = new Uint8Array(nFrames);
    const loud = percentile(rms, 0.95) || 1e-6;
    const bandsOut = energy.map((e) => {
      const ref = percentile(e, 0.98) || 1e-12;
      const out = new Float32Array(nFrames);
      let y = 0;
      for (let f = 0; f < nFrames; f++) {
        y = Math.max(Math.min(1, Math.sqrt(e[f] / ref)), y * 0.95);
        out[f] = y;
      }
      return out;
    });
    let quietRun = 0, y = 0;
    for (let f = 0; f < nFrames; f++) {
      const db = 20 * Math.log10(Math.max(rms[f], 1e-7) / loud);
      y = Math.max(Math.min(1, Math.max(0, (db + 30) / 30)), y * 0.95);
      level[f] = y;
      quietRun = rms[f] < Math.max(1e-4, loud * 0.01) ? quietRun + 1 : 0;
      silent[f] = quietRun > frameRate ? 1 : 0;
    }
    // Quem ficou em silêncio por mais de um segundo marca também o começo desse trecho.
    for (let f = nFrames - 1, run = 0; f >= 0; f--) {
      run = rms[f] < Math.max(1e-4, loud * 0.01) ? run + 1 : 0;
      if (run > frameRate) silent[f] = 1;
    }

    let ibis = [];
    for (let i = 1; i < beats.length; i++) ibis.push(beats[i] - beats[i - 1]);
    ibis.sort((a, b) => a - b);
    const medianIbi = ibis.length ? ibis[Math.floor(ibis.length / 2)] : period / frameRate;
    if (onProgress) onProgress(1);

    return {
      beats, onsets: Float64Array.from(onsets), bpm: 60 / medianIbi, frameRate,
      frameOffset: fftSize / 2 / sampleRate, level, bass: bandsOut[0], mid: bandsOut[1], high: bandsOut[2], silent,
      duration: samples.length / sampleRate,
    };
  }

  const api = { analyzeTrack, downmix };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GuntherTrack = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

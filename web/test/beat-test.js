// Teste offline do detector: sintetiza bumbo + chimbal em um BPM conhecido
// e verifica o BPM estimado e o alinhamento das batidas.
'use strict';
const { BeatDetector } = require('../beat.js');

function synth(bpm, seconds, sampleRate, { hats = true, noise = 0.01, offset = 0.3 } = {}) {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  const period = 60 / bpm;
  // Bumbo: seno de 55 Hz com decaimento rápido.
  for (let t0 = offset; t0 < seconds; t0 += period) {
    const start = Math.floor(t0 * sampleRate);
    for (let i = 0; i < sampleRate * 0.25 && start + i < n; i++) {
      const t = i / sampleRate;
      out[start + i] += 0.8 * Math.exp(-t * 18) * Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-t * 40)) * t);
    }
  }
  // Chimbal nas colcheias: ruído curto.
  if (hats) {
    for (let t0 = offset + period / 2; t0 < seconds; t0 += period / 2) {
      const start = Math.floor(t0 * sampleRate);
      for (let i = 0; i < sampleRate * 0.04 && start + i < n; i++) {
        out[start + i] += 0.12 * Math.exp(-(i / sampleRate) * 90) * (Math.random() * 2 - 1);
      }
    }
  }
  for (let i = 0; i < n; i++) out[i] += noise * (Math.random() * 2 - 1);
  return out;
}

function run(bpm, sampleRate) {
  const det = new BeatDetector(sampleRate);
  const seconds = 20;
  const signal = synth(bpm, seconds, sampleRate);
  const beats = [];
  let lastBeat = -1;
  let lastSnap = null;
  det.onSnapshot = (s) => {
    lastSnap = s;
    if (s.hasBeat && s.lastBeatTime !== lastBeat) {
      lastBeat = s.lastBeatTime;
      beats.push(s.lastBeatTime);
    }
  };
  const chunk = 256;
  for (let i = 0; i + chunk <= signal.length; i += chunk) {
    det.process(signal.subarray(i, i + chunk), (i + chunk) / sampleRate);
  }
  // Erro de fase nas últimas 8 s: distância até o bumbo mais próximo.
  const period = 60 / bpm;
  const late = beats.filter((t) => t > seconds - 8);
  let err = 0;
  for (const t of late) {
    let d = ((t - 0.3) % period + period) % period;
    if (d > period / 2) d -= period;
    err += Math.abs(d);
  }
  const meanErr = late.length ? err / late.length : Infinity;
  return { bpm: lastSnap.bpm, confidence: lastSnap.confidence, beats: late.length, meanErrMs: meanErr * 1000 };
}

let failed = false;
for (const [bpm, sr] of [[128, 48000], [100, 44100], [140, 48000], [174, 48000]]) {
  const r = run(bpm, sr);
  const bpmOk = Math.abs(r.bpm - bpm) / bpm < 0.03;
  const phaseOk = r.meanErrMs < 60;
  const ok = bpmOk && phaseOk;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} alvo ${bpm} BPM @ ${sr} Hz -> estimado ${r.bpm.toFixed(1)} BPM, ` +
    `erro de fase médio ${r.meanErrMs.toFixed(0)} ms, confiança ${r.confidence.toFixed(2)}, batidas nos últimos 8 s: ${r.beats}`);
}

// Silêncio: não pode inventar batida.
{
  const det = new BeatDetector(48000);
  let snap = null;
  det.onSnapshot = (s) => (snap = s);
  const quiet = new Float32Array(48000 * 5);
  for (let i = 0; i < quiet.length; i++) quiet[i] = 0.0005 * (Math.random() * 2 - 1);
  det.process(quiet, 5);
  const ok = snap.isSilent && !snap.hasBeat;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} silêncio -> isSilent=${snap.isSilent} hasBeat=${snap.hasBeat}`);
}

process.exit(failed ? 1 : 0);

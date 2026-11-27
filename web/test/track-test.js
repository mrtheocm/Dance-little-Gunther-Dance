// Teste da análise completa de música: sintetiza faixas com batidas em instantes conhecidos
// e confere BPM, posição de cada batida e o silêncio.
'use strict';
const { analyzeTrack } = require('../track.js');

function synth(bpm, seconds, sr, { offset = 0.3, intro = 0, hats = true, bassline = true, swing = 0 } = {}) {
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);
  const period = 60 / bpm;
  const kicks = [];
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
  for (let t0 = offset + intro; t0 < seconds - 0.3; t0 += period) {
    kicks.push(t0);
    const s = Math.floor(t0 * sr);
    for (let i = 0; i < sr * 0.25 && s + i < n; i++) {
      const t = i / sr;
      out[s + i] += 0.7 * Math.exp(-t * 18) * Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-t * 40)) * t);
    }
    if (hats) {
      const h = Math.floor((t0 + period / 2 + swing * period) * sr);
      for (let i = 0; i < sr * 0.04 && h + i < n; i++) out[h + i] += 0.12 * Math.exp(-(i / sr) * 90) * rand();
    }
  }
  if (bassline) {
    // Baixo com notas no contratempo, para atrapalhar um pouco.
    for (const k of kicks) {
      const s = Math.floor((k + period / 2) * sr);
      for (let i = 0; i < sr * period * 0.4 && s + i < n; i++) {
        out[s + i] += 0.25 * Math.sin(2 * Math.PI * 82 * i / sr) * Math.min(1, i / 200) * Math.exp(-i / sr * 4);
      }
    }
  }
  for (let i = 0; i < n; i++) out[i] += 0.003 * rand();
  return { samples: out, kicks };
}

function nearest(kicks, t) {
  let best = Infinity;
  for (const k of kicks) if (Math.abs(k - t) < Math.abs(best)) best = t - k;
  return best;
}

(async () => {
  let failed = false;
  const errs = [];
  const cases = [
    { bpm: 128, sr: 22050 }, { bpm: 100, sr: 22050 }, { bpm: 140, sr: 22050 }, { bpm: 174, sr: 22050 },
    { bpm: 122, sr: 44100 }, { bpm: 128, sr: 22050, intro: 4 }, { bpm: 95, sr: 22050, swing: 0.08 },
  ];
  for (const c of cases) {
    const seconds = 40;
    const { samples, kicks } = synth(c.bpm, seconds, c.sr, c);
    const r = await analyzeTrack(samples, c.sr);
    const start = 0.3 + (c.intro || 0) + 2;
    const inMusic = Array.from(r.beats).filter((t) => t > start && t < seconds - 2);
    const offs = inMusic.map((t) => nearest(kicks, t));
    const meanOff = offs.reduce((a, b) => a + b, 0) / offs.length;
    const maxAbs = Math.max(...offs.map(Math.abs));
    const expected = Math.round((seconds - 4 - (c.intro || 0) - 0.3) / (60 / c.bpm));
    const coverage = inMusic.length / expected;
    errs.push(...offs);
    const ok = Math.abs(r.bpm - c.bpm) / c.bpm < 0.01 && Math.abs(meanOff) < 0.005 && maxAbs < 0.015 && coverage > 0.95 && coverage < 1.05;
    if (!ok) failed = true;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${c.bpm} BPM @ ${c.sr} Hz${c.intro ? ', intro de ' + c.intro + ' s em silêncio' : ''}${c.swing ? ', swing' : ''}` +
      ` -> ${r.bpm.toFixed(1)} BPM, ${inMusic.length}/${expected} batidas, desvio médio ${(meanOff * 1000).toFixed(1)} ms, pior ${(maxAbs * 1000).toFixed(1)} ms`);
    if (c.intro) {
      const introFrames = Math.floor((c.intro - 1.2) * r.frameRate);
      const quiet = r.silent.subarray(0, introFrames).every((x) => x === 1);
      if (!quiet) failed = true;
      console.log(`${quiet ? 'OK  ' : 'FAIL'}   intro marcada como silêncio`);
    }
  }
  const bias = errs.reduce((a, b) => a + b, 0) / errs.length;
  console.log(`desvio médio geral: ${(bias * 1000).toFixed(1)} ms`);
  if (Math.abs(bias) > 0.004) { failed = true; console.log('FAIL desvio sistemático acima de 4 ms'); }
  process.exit(failed ? 1 : 0);
})();

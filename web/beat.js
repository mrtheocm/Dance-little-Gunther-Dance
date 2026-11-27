// Detecção de batida e BPM em tempo real.
// Sem dependências: roda no navegador e no Node (para os testes).
(function (root) {
  'use strict';

  // FFT real (via FFT complexa radix-2) com janela de Hann.
  class SpectrumAnalyzer {
    constructor(size) {
      this.size = size;
      this.half = size / 2;
      const bits = Math.round(Math.log2(size));
      this.rev = new Uint32Array(size);
      for (let i = 0; i < size; i++) {
        let r = 0;
        for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1);
        this.rev[i] = r;
      }
      this.cos = new Float32Array(this.half);
      this.sin = new Float32Array(this.half);
      for (let i = 0; i < this.half; i++) {
        this.cos[i] = Math.cos((-2 * Math.PI * i) / size);
        this.sin[i] = Math.sin((-2 * Math.PI * i) / size);
      }
      this.window = new Float32Array(size);
      for (let i = 0; i < size; i++) this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
      this.re = new Float32Array(size);
      this.im = new Float32Array(size);
      this.power = new Float32Array(this.half);
    }

    analyze(samples) {
      const { size, re, im, rev, cos, sin, window, power } = this;
      for (let i = 0; i < size; i++) {
        re[rev[i]] = samples[i] * window[i];
        im[rev[i]] = 0;
      }
      for (let len = 2; len <= size; len <<= 1) {
        const half = len >> 1;
        const step = size / len;
        for (let start = 0; start < size; start += len) {
          for (let k = 0; k < half; k++) {
            const t = k * step;
            const wr = cos[t], wi = sin[t];
            const i1 = start + k, i2 = i1 + half;
            const xr = re[i2] * wr - im[i2] * wi;
            const xi = re[i2] * wi + im[i2] * wr;
            re[i2] = re[i1] - xr;
            im[i2] = im[i1] - xi;
            re[i1] += xr;
            im[i1] += xi;
          }
        }
      }
      for (let k = 0; k < this.half; k++) power[k] = re[k] * re[k] + im[k] * im[k];
      return power;
    }
  }

  class BeatDetector {
    constructor(sampleRate) {
      this.sampleRate = sampleRate;
      this.hop = 1024;
      this.fftSize = 2048;
      this.frameRate = sampleRate / this.hop;
      this.hopDuration = this.hop / sampleRate;

      this.acc = new Float32Array(1 << 16);
      this.accLen = 0;
      this.analysisWindow = new Float32Array(this.fftSize);
      this.spectrum = new SpectrumAnalyzer(this.fftSize);
      this.prevLogMag = new Float32Array(this.fftSize / 2);
      this.logMag = new Float32Array(this.fftSize / 2);

      const binHz = sampleRate / this.fftSize;
      const maxBin = this.fftSize / 2;
      const bin = (hz) => Math.min(maxBin, Math.max(1, Math.floor(hz / binHz)));
      const b0 = bin(30), b1 = Math.max(bin(30) + 1, bin(160));
      const m1 = Math.max(b1 + 1, bin(2000));
      const h1 = Math.max(m1 + 1, bin(9000));
      this.bassBins = [b0, b1];
      this.midBins = [b1, m1];
      this.highBins = [m1, h1];

      this.odfCapacity = Math.floor(this.frameRate * 12);
      this.odf = new Float32Array(this.odfCapacity);
      this.odfIndex = 0;
      this.odfFilled = 0;
      this.prev1 = 0;
      this.prev2 = 0;
      this.framesSinceOnset = 1000;
      this.minOnsetGapFrames = Math.max(2, Math.floor(this.frameRate * 0.1));

      this.level = 0;
      this.bass = 0; this.mid = 0; this.high = 0;
      this.bassMax = 1e-6; this.midMax = 1e-6; this.highMax = 1e-6;
      this.silentFrames = 0;
      this.isSilent = true;

      this.bpm = 0;
      this.beatPeriod = 60 / 125;
      this.tempoCandidate = 0;
      this.tempoAgreeCount = 0;
      this.framesSinceTempo = 0;

      this.hasAnchor = false;
      this.lastBeatTime = 0;
      this.nextBeatTime = 0;
      this.beatCount = 0;
      this.confidence = 0;
      this.offbeatOnsets = [];

      this.onSnapshot = null;
    }

    // `samples`: Float32Array mono. `now`: instante (s) em que o último sample foi capturado.
    process(samples, now) {
      const n = samples.length;
      if (n === 0) return;
      if (this.accLen + n > this.acc.length) {
        const bigger = new Float32Array(Math.max(this.acc.length * 2, this.accLen + n));
        bigger.set(this.acc.subarray(0, this.accLen));
        this.acc = bigger;
      }
      this.acc.set(samples, this.accLen);
      this.accLen += n;

      const total = this.accLen;
      let offset = 0;
      while (total - offset >= this.hop) {
        const endTime = now - (total - offset - this.hop) / this.sampleRate;
        this.analyzeHop(this.acc.subarray(offset, offset + this.hop), endTime);
        offset += this.hop;
      }
      if (offset > 0) {
        this.acc.copyWithin(0, offset, total);
        this.accLen = total - offset;
      }
    }

    analyzeHop(samples, endTime) {
      const hop = this.hop;
      const win = this.analysisWindow;
      win.copyWithin(0, hop);
      win.set(samples, win.length - hop);

      let sumSq = 0;
      for (let i = 0; i < hop; i++) sumSq += samples[i] * samples[i];
      const rms = Math.sqrt(sumSq / hop);
      const db = 20 * Math.log10(Math.max(rms, 1e-7));
      const rawLevel = Math.min(1, Math.max(0, (db + 55) / 50));
      this.level = Math.max(rawLevel, this.level * 0.9);

      if (db < -52) this.silentFrames += 1; else this.silentFrames = 0;
      const silentNow = this.silentFrames > Math.floor(this.frameRate * 1.0);
      if (silentNow && !this.isSilent) {
        this.hasAnchor = false;
        this.confidence = 0;
        this.offbeatOnsets.length = 0;
      }
      this.isSilent = silentNow;

      const power = this.spectrum.analyze(win);
      const logMag = this.logMag, prevLogMag = this.prevLogMag;
      for (let k = 0; k < power.length; k++) logMag[k] = Math.log1p(Math.sqrt(power[k]));

      const b = this.bandMetrics(this.bassBins, power);
      const m = this.bandMetrics(this.midBins, power);
      const h = this.bandMetrics(this.highBins, power);
      this.logMag = prevLogMag;
      this.prevLogMag = logMag;

      this.bassMax = Math.max(b.energy, this.bassMax * 0.9995, 1e-6);
      this.midMax = Math.max(m.energy, this.midMax * 0.9995, 1e-6);
      this.highMax = Math.max(h.energy, this.highMax * 0.9995, 1e-6);
      this.bass = Math.max(Math.min(1, Math.sqrt(b.energy / this.bassMax)), this.bass * 0.9);
      this.mid = Math.max(Math.min(1, Math.sqrt(m.energy / this.midMax)), this.mid * 0.9);
      this.high = Math.max(Math.min(1, Math.sqrt(h.energy / this.highMax)), this.high * 0.9);

      const odfValue = b.flux * 1.0 + m.flux * 0.5 + h.flux * 0.25;
      const stats = this.recentStats(Math.floor(this.frameRate * 1.5));
      this.odf[this.odfIndex] = odfValue;
      this.odfIndex = (this.odfIndex + 1) % this.odfCapacity;
      this.odfFilled = Math.min(this.odfCapacity, this.odfFilled + 1);

      const threshold = stats.mean + 1.5 * stats.std + 0.01;
      this.framesSinceOnset += 1;
      let onsetTime = null;
      let strength = 0;
      if (!silentNow && this.prev1 > threshold && this.prev1 >= odfValue && this.prev1 > this.prev2 &&
          this.framesSinceOnset >= this.minOnsetGapFrames) {
        onsetTime = endTime - 1.5 * this.hopDuration;
        strength = this.prev1 / threshold;
        this.framesSinceOnset = 0;
      }
      this.prev2 = this.prev1;
      this.prev1 = odfValue;

      this.framesSinceTempo += 1;
      if (!silentNow && this.framesSinceTempo >= Math.floor(this.frameRate * 0.25) &&
          this.odfFilled >= Math.floor(this.frameRate * 4)) {
        this.framesSinceTempo = 0;
        this.estimateTempo();
      }

      this.updateBeatClock(endTime, onsetTime, strength);

      if (this.onSnapshot) {
        this.onSnapshot({
          time: endTime,
          level: this.level,
          bass: this.bass,
          mid: this.mid,
          high: this.high,
          isSilent: silentNow,
          bpm: this.bpm,
          hasBeat: this.hasAnchor,
          beatPeriod: this.beatPeriod,
          lastBeatTime: this.lastBeatTime,
          beatCount: this.beatCount,
          confidence: this.confidence,
          onset: onsetTime !== null,
        });
      }
    }

    bandMetrics(range, power) {
      let flux = 0, energy = 0;
      const logMag = this.logMag, prev = this.prevLogMag;
      for (let k = range[0]; k < range[1]; k++) {
        const d = logMag[k] - prev[k];
        if (d > 0) flux += d;
        energy += power[k];
      }
      return { flux: flux / Math.max(1, range[1] - range[0]), energy };
    }

    recentStats(frames) {
      const m = Math.min(frames, this.odfFilled);
      if (m <= 1) return { mean: 0, std: 0 };
      let sum = 0, sumSq = 0;
      for (let i = 1; i <= m; i++) {
        const v = this.odf[(this.odfIndex - i + this.odfCapacity) % this.odfCapacity];
        sum += v;
        sumSq += v * v;
      }
      const mean = sum / m;
      const variance = Math.max(0, sumSq / m - mean * mean);
      return { mean, std: Math.sqrt(variance) };
    }

    estimateTempo() {
      const w = Math.min(this.odfFilled, Math.floor(this.frameRate * 8));
      if (w <= 8) return;
      const x = new Float32Array(w);
      let mean = 0;
      for (let i = 0; i < w; i++) {
        x[i] = this.odf[(this.odfIndex - w + i + this.odfCapacity) % this.odfCapacity];
        mean += x[i];
      }
      mean /= w;
      let energy = 0;
      for (let i = 0; i < w; i++) { x[i] -= mean; energy += x[i] * x[i]; }
      energy /= w;
      if (energy <= 1e-9) return;

      const lagMin = Math.max(2, Math.floor((this.frameRate * 60) / 200));
      const lagMax = Math.min(Math.floor(w / 2), Math.floor((this.frameRate * 60) / 60));
      if (lagMax <= lagMin + 2) return;

      const ac = new Float32Array(lagMax + 1);
      for (let lag = lagMin; lag <= lagMax; lag++) {
        let s = 0;
        for (let i = 0; i + lag < w; i++) s += x[i] * x[i + lag];
        ac[lag] = s / (w - lag) / energy;
      }

      let bestLag = 0, bestScore = -Infinity;
      for (let lag = lagMin; lag <= lagMax; lag++) {
        const candidateBpm = (60 * this.frameRate) / lag;
        const prior = Math.exp(-0.5 * Math.pow(Math.log2(candidateBpm / 125) / 0.55, 2));
        let score = ac[lag];
        if (2 * lag <= lagMax) score += 0.4 * ac[2 * lag];
        score *= prior;
        if (score > bestScore) { bestScore = score; bestLag = lag; }
      }
      if (bestLag === 0 || ac[bestLag] <= 0.05) return;

      let lagF = bestLag;
      if (bestLag > lagMin && bestLag < lagMax) {
        const y0 = ac[bestLag - 1], y1 = ac[bestLag], y2 = ac[bestLag + 1];
        const denom = y0 - 2 * y1 + y2;
        if (Math.abs(denom) > 1e-9) lagF += Math.min(0.5, Math.max(-0.5, (0.5 * (y0 - y2)) / denom));
      }
      const newBpm = Math.min(200, Math.max(60, (60 * this.frameRate) / lagF));

      if (this.bpm === 0) {
        this.bpm = newBpm;
      } else if (Math.abs(newBpm - this.bpm) / this.bpm < 0.06) {
        this.bpm = 0.8 * this.bpm + 0.2 * newBpm;
        this.tempoCandidate = 0;
        this.tempoAgreeCount = 0;
      } else {
        if (this.tempoCandidate > 0 && Math.abs(newBpm - this.tempoCandidate) / this.tempoCandidate < 0.06) {
          this.tempoAgreeCount += 1;
        } else {
          this.tempoCandidate = newBpm;
          this.tempoAgreeCount = 1;
        }
        if (this.tempoAgreeCount >= 3) {
          this.bpm = this.tempoCandidate;
          this.tempoCandidate = 0;
          this.tempoAgreeCount = 0;
          this.confidence *= 0.5;
        }
      }
      this.beatPeriod = 60 / this.bpm;
    }

    updateBeatClock(now, onsetTime, strength) {
      const period = this.beatPeriod;
      const tol = 0.2 * period;

      if (!this.hasAnchor) {
        if (onsetTime !== null && strength > 1.3) {
          this.hasAnchor = true;
          this.lastBeatTime = onsetTime;
          this.nextBeatTime = onsetTime + period;
          this.beatCount += 1;
          this.confidence = 0.2;
        }
        return;
      }

      if (onsetTime !== null) {
        const t = onsetTime;
        const dLast = t - this.lastBeatTime;
        const dNext = t - this.nextBeatTime;
        const alpha = Math.min(0.6, 0.25 + 0.1 * strength);
        if (Math.abs(dLast) <= tol) {
          this.nextBeatTime += alpha * dLast;
          this.confidence = this.confidence * 0.85 + 0.15;
          this.offbeatOnsets.length = 0;
        } else if (Math.abs(dNext) <= tol) {
          this.lastBeatTime = t;
          this.beatCount += 1;
          this.nextBeatTime = this.nextBeatTime + period + alpha * dNext;
          this.confidence = this.confidence * 0.85 + 0.15;
          this.offbeatOnsets.length = 0;
        } else {
          if (strength > 1.8) {
            this.offbeatOnsets.push(t);
            this.offbeatOnsets = this.offbeatOnsets.filter((o) => t - o <= 4 * period);
            if (this.offbeatOnsets.length >= 3 && this.phasesAgree(this.offbeatOnsets, period, tol)) {
              this.lastBeatTime = t;
              this.beatCount += 1;
              this.nextBeatTime = t + period;
              this.offbeatOnsets.length = 0;
              this.confidence = 0.3;
            }
          }
          this.confidence *= 0.95;
        }
      }

      while (this.nextBeatTime <= now) {
        this.lastBeatTime = this.nextBeatTime;
        this.beatCount += 1;
        this.nextBeatTime += period;
        this.confidence *= 0.96;
      }
    }

    phasesAgree(times, period, tol) {
      const first = times[0];
      for (let i = 1; i < times.length; i++) {
        let d = (times[i] - first) % period;
        if (d > period / 2) d -= period;
        if (d < -period / 2) d += period;
        if (Math.abs(d) > tol) return false;
      }
      return true;
    }
  }

  const api = { SpectrumAnalyzer, BeatDetector };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GuntherBeat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

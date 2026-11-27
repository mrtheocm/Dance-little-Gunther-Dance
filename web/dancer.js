// Núcleo compartilhado: cena, fundo, utilidades e registro de personagens.
(function (root) {
  'use strict';

  const characters = [];
  const frac = (x) => ((x % 1) + 1) % 1;
  const hsl = (h, sat, light, a = 1) => `hsla(${frac(h) * 360}, ${sat * 100}%, ${light * 100}%, ${a})`;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function ellipse(ctx, x, y, rx, ry, color, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokePoints(ctx, points, color, width) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Fração da batida, logo depois do kick, em que pés e corpo ficam no chão absorvendo o impacto.
  const CONTACT = 0.18;

  // Calcula a fase da batida e os sinais úteis para animação.
  function computeScene(state, now, wallTime, lead, moveCount) {
    const dancing = state.hasBeat && !state.isSilent;
    const period = Math.max(state.beatPeriod, 0.2);
    const elapsed = Math.max(0, now + lead - state.lastBeatTime);
    const beats = Math.min(elapsed / period, 1e6);
    const whole = Math.floor(beats);
    const phase = beats - whole;
    const beatIndex = state.beatCount + whole;
    const beatFrac = beatIndex + phase;
    // Depois da janela de contato, o pulo (ou o passo) sobe e desce para pousar exatamente no próximo kick.
    const air = phase < CONTACT ? -1 : (phase - CONTACT) / (1 - CONTACT);
    return {
      phase,
      beatIndex,
      beatFrac,
      period,
      energy: state.level,
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      dancing,
      wallTime,
      onsetGlow: Math.max(0, 1 - (now - state.lastOnsetTime) / 0.25),
      moveIndex: Math.floor(beatIndex / 8) % Math.max(1, moveCount),
      // 1 na batida, 0 no meio.
      pulse: dancing ? 0.5 * (1 + Math.cos(2 * Math.PI * phase)) : 0,
      // -1...1 com extremos nas batidas (alterna a cada batida).
      sway: dancing ? -Math.cos(Math.PI * beatFrac) : 0,
      // -1...1 com extremos entre as batidas.
      swayMid: dancing ? Math.sin(Math.PI * beatFrac) : 0,
      accentHue: (Math.floor(beatIndex / 4) % 8) / 8,
      // Altura do pulo ou do pé levantado, 0..1: zero no kick e durante o contato, pico no meio do ar.
      hop: dancing && air >= 0 ? 4 * air * (1 - air) : 0,
      // Impacto do pouso, 0..1: 1 exatamente no kick, some ao fim da janela de contato.
      land: dancing && phase < CONTACT ? Math.pow(1 - phase / CONTACT, 2) : 0,
      // Velocidade vertical no ar, 0..1: máxima ao decolar e ao pousar (para esticar o corpo).
      stretch: dancing && air >= 0 ? Math.abs(1 - 2 * air) : 0,
      // Qual pé está no ar nesta batida: true = direito. Alterna a cada batida.
      rightStep: beatIndex % 2 === 0,
    };
  }

  function drawBackground(ctx, width, height, groundY, u, s) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#12082a');
    grad.addColorStop(1, '#05050d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const pulse = s.dancing ? Math.pow(1 - s.phase, 2) : 0;
    const cxp = width / 2, cyp = height * 0.45;
    const sweep = Math.sin(s.wallTime * 0.6) * 0.35;
    const intensity = s.dancing ? 0.10 + 0.22 * s.mid + 0.15 * s.onsetGlow : 0.05;
    const lights = [
      [width * 0.1, s.accentHue, sweep + 0.25],
      [width * 0.9, s.accentHue + 0.33, -sweep - 0.25],
      [width * 0.5, s.accentHue + 0.66, sweep * 0.5],
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [x, hue, angle] of lights) {
      const h = height * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, -20);
      ctx.lineTo(x + Math.tan(angle - 0.18) * h, h);
      ctx.lineTo(x + Math.tan(angle + 0.18) * h, h);
      ctx.closePath();
      ctx.fillStyle = hsl(hue, 0.8, 0.55, intensity);
      ctx.fill();
    }
    ctx.restore();

    if (s.dancing) {
      ctx.fillStyle = hsl(s.accentHue, 0.85, 0.6, 0.12 * pulse * (0.3 + 0.7 * s.bass));
      ctx.fillRect(0, 0, width, height);
      const r = (0.15 + 0.85 * s.phase) * Math.max(width, height) * 0.6;
      ctx.beginPath();
      ctx.arc(cxp, cyp, r, 0, Math.PI * 2);
      ctx.strokeStyle = hsl(s.accentHue, 0.85, 0.6, 0.5 * Math.pow(1 - s.phase, 2) * (0.3 + 0.7 * s.energy));
      ctx.lineWidth = 1 + 8 * (1 - s.phase);
      ctx.stroke();
    }

    const tiles = 7;
    const tileW = width / tiles;
    for (let i = 0; i < tiles; i++) {
      const lit = (i + s.beatIndex) % 2 === 0;
      const alpha = s.dancing ? (lit ? 0.35 + 0.4 * pulse : 0.15) : 0.12;
      roundRect(ctx, i * tileW + 2, groundY, tileW - 4, 0.7 * u, 4);
      ctx.fillStyle = hsl(s.accentHue + i * 0.07, 0.7, lit ? 0.6 : 0.25, alpha);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.strokeStyle = hsl(s.accentHue, 0.85, 0.6, 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Cada personagem recebe o mesmo "palco": origem no chão, no centro, unidade u.
  // stageHeight e stageTop (opcionais) limitam o palco entre painéis da tela; o fundo continua ocupando tudo.
  function drawScene(ctx, width, height, s, character, stageHeight = height, stageTop = 0) {
    const sh = Math.min(height, stageHeight);
    const groundY = sh * 0.78;
    // Os personagens cabem em ~8 u acima do chão; encolhe se houver um painel em cima.
    const u = Math.max(8, Math.min(width / 8.5, sh / 11.5, (groundY - stageTop) / 8.2));
    const cx = width / 2;
    drawBackground(ctx, width, height, groundY, u, s);
    const stage = {
      u, groundY, cx, width, height,
      // Modelo: x para a direita, y para cima, em unidades u, origem no chão.
      pt: (x, y) => [cx + x * u, groundY - y * u],
      shadow: (x, w, lift = 0) => ellipse(ctx, cx + x * u, groundY, (w / 2) * (1 - 0.35 * Math.min(1, lift)) * u, 0.18 * u, 'rgba(0,0,0,0.45)'),
    };
    character.draw(ctx, stage, s);
  }

  function register(character) {
    characters.push(character);
  }

  root.GuntherDancer = {
    characters, register, computeScene, drawScene, CONTACT,
    util: { hsl, frac, clamp01, roundRect, ellipse, strokePoints },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

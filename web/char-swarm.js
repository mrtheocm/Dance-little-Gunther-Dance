// Cardume e Enxame: muitos bichinhos dançando em formação, cada um seguindo seu lugar com molinha.
(function () {
  'use strict';
  const { register, util } = window.GuntherDancer;
  const { hsl, ellipse } = util;
  const TAU = Math.PI * 2;

  // Formações em coordenadas do modelo (origem no chão, y para cima). Recebem i/N e a cena.
  const formations = [
    (q, s) => { // roda que gira uma volta a cada 8 batidas
      const a = q * TAU + (TAU * s.beatFrac) / 8;
      const r = 2.0 + 0.45 * s.pulse;
      return [Math.cos(a) * r * 1.15, 3.3 + Math.sin(a) * r * 0.8];
    },
    (q, s) => [(q - 0.5) * 6.8, 3.3 + 1.0 * Math.sin(q * TAU * 2 - Math.PI * s.beatFrac)], // onda
    (q, s) => { // oito deitado
      const a = q * TAU + (TAU * s.beatFrac) / 8;
      return [2.8 * Math.sin(a), 3.3 + 1.4 * Math.sin(2 * a)];
    },
    (q, s) => [(q - 0.5) * 6.8, 0.8 + 2.8 * Math.abs(Math.sin(Math.PI * (s.beatFrac + q)))], // colunas quicando
    (q, s) => { // coração pulsando
      const a = q * TAU;
      const k = 0.14 * (1 + 0.18 * s.pulse);
      const x = 16 * Math.pow(Math.sin(a), 3);
      const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      return [x * k, 3.4 + y * k];
    },
  ];

  function makeSwarm({ id, name, desc, count, drawAgent }) {
    const agents = [];
    let lastT = null;
    for (let i = 0; i < count; i++) {
      const [x, y] = formations[0](i / count, { beatFrac: 0, pulse: 0 });
      agents.push({ x, y, vx: 0, vy: 0, heading: 0 });
    }
    register({
      id, name, desc,
      moveCount: formations.length,
      draw(ctx, st, s) {
        const dt = lastT === null ? 0.016 : Math.min(0.05, Math.max(0, s.wallTime - lastT));
        lastT = s.wallTime;
        const formation = s.dancing ? formations[s.moveIndex] : null;
        const shift = s.dancing ? 0.3 * s.sway : 0;
        agents.forEach((a, i) => {
          const q = i / count;
          let tx, ty;
          if (formation) {
            [tx, ty] = formation(q, s);
            tx += shift;
          } else {
            const w = s.wallTime * 0.5 + q * TAU;
            tx = 2.3 * Math.cos(w);
            ty = 3.3 + 0.9 * Math.sin(2 * w);
          }
          const k = 45, damp = 9;
          a.vx += ((tx - a.x) * k - a.vx * damp) * dt;
          a.vy += ((ty - a.y) * k - a.vy * damp) * dt;
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          const speed = Math.hypot(a.vx, a.vy);
          if (speed > 0.3) {
            const target = Math.atan2(a.vy, a.vx);
            let d = target - a.heading;
            d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
            a.heading += d * Math.min(1, dt * 10);
          }
        });
        // Desenha os de trás primeiro (mais altos primeiro dá uma sensação de profundidade).
        const order = agents.map((a, i) => i).sort((p, q) => agents[q].y - agents[p].y);
        for (const i of order) drawAgent(ctx, st, s, agents[i], i);
      },
    });
  }

  // Peixe: corpo em gota, cauda abanando, olhinho.
  makeSwarm({
    id: 'fish', name: 'Cardume', count: 14,
    desc: 'Quatorze peixes nadando em formação no ritmo.',
    drawAgent(ctx, st, s, a, i) {
      const u = st.u;
      const [x, y] = st.pt(a.x, a.y);
      const color = hsl(s.accentHue + i * 0.035 + 0.5, 0.8, 0.6);
      const dark = hsl(s.accentHue + i * 0.035 + 0.5, 0.8, 0.35);
      const wag = 0.55 * Math.sin(s.wallTime * 13 + i * 1.7) * (0.5 + 0.5 * s.energy);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-a.heading);
      // Cauda.
      ctx.beginPath();
      ctx.moveTo(-0.22 * u, 0);
      ctx.lineTo(-0.5 * u, (-0.22 + 0.12 * wag) * u);
      ctx.lineTo(-0.5 * u, (0.22 + 0.12 * wag) * u);
      ctx.closePath();
      ctx.fillStyle = dark;
      ctx.fill();
      ellipse(ctx, 0, 0, 0.32 * u, 0.17 * u, color);
      ellipse(ctx, 0.02 * u, 0.09 * u, 0.1 * u, 0.06 * u, dark, 0.3);
      ellipse(ctx, 0.17 * u, -0.04 * u, 0.055 * u, 0.055 * u, '#ffffff');
      ellipse(ctx, 0.18 * u, -0.04 * u, 0.03 * u, 0.03 * u, '#1a1426');
      ctx.restore();
    },
  });

  // Abelha: listrada, asas tremendo, zunindo no ritmo dos agudos.
  makeSwarm({
    id: 'bees', name: 'Enxame', count: 12,
    desc: 'Doze abelhas que zumbem mais forte com os agudos.',
    drawAgent(ctx, st, s, a, i) {
      const u = st.u;
      const jitter = 0.06 * (0.3 + s.high) * (s.dancing ? 1 : 0.3);
      const jx = jitter * Math.sin(s.wallTime * 53 + i * 2.1), jy = jitter * Math.cos(s.wallTime * 47 + i * 1.3);
      const [x, y] = st.pt(a.x + jx, a.y + jy);
      const flap = Math.sin(s.wallTime * 70 + i);
      ctx.save();
      ctx.translate(x, y);
      // Vira para o lado em que está indo, sem capotar.
      const facing = Math.cos(a.heading) >= 0 ? 1 : -1;
      ctx.scale(facing, 1);
      ctx.rotate(-Math.sin(a.heading) * 0.35);
      ellipse(ctx, -0.12 * u, -0.22 * u, 0.2 * u, (0.08 + 0.06 * flap) * u, 'rgba(255,255,255,0.55)', -0.5);
      ellipse(ctx, 0.08 * u, -0.22 * u, 0.2 * u, (0.08 - 0.06 * flap) * u, 'rgba(255,255,255,0.55)', 0.5);
      ellipse(ctx, 0, 0, 0.3 * u, 0.19 * u, '#ffd23f');
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.3 * u, 0.19 * u, 0, 0, TAU);
      ctx.clip();
      ctx.fillStyle = '#1a1426';
      ctx.fillRect(-0.12 * u, -0.3 * u, 0.08 * u, 0.6 * u);
      ctx.fillRect(0.04 * u, -0.3 * u, 0.08 * u, 0.6 * u);
      ctx.restore();
      ellipse(ctx, 0.3 * u, -0.02 * u, 0.12 * u, 0.12 * u, '#1a1426');
      ellipse(ctx, 0.33 * u, -0.05 * u, 0.035 * u, 0.035 * u, '#ffffff');
      ctx.beginPath();
      ctx.moveTo(-0.28 * u, 0);
      ctx.lineTo(-0.4 * u, 0.04 * u);
      ctx.lineTo(-0.28 * u, 0.07 * u);
      ctx.fillStyle = '#1a1426';
      ctx.fill();
      ctx.restore();
    },
  });
})();

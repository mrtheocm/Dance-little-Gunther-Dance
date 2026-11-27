// Glob: ameba translúcida com contorno vivo, pseudópodes e um núcleo com carinha.
(function () {
  'use strict';
  const { register, util } = window.GuntherDancer;
  const { hsl, ellipse } = util;

  const TAU = Math.PI * 2;
  const bump = (theta, center, width) => {
    let d = theta - center;
    d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
    return Math.exp(-(d * d) / (2 * width * width));
  };

  register({
    id: 'amoeba',
    name: 'Glob',
    desc: 'Ameba gelatinosa que pulsa com o grave.',
    moveCount: 5,
    draw(ctx, st, s) {
      const { u } = st;
      const t = s.wallTime;
      const { pulse, sway, swayMid, phase: ph, beatFrac } = s;
      const amp = 0.6 + 0.4 * s.energy;
      const arc = 4 * ph * (1 - ph);

      let cx = 0, sx = 1, sy = 1, jump = 0, roll = 0, armL = 0, armR = 0, scale = 1, happy = 0;
      if (s.dancing) {
        switch (s.moveIndex) {
          case 0: // pulsar
            scale = 1 + 0.18 * pulse * (0.5 + 0.5 * s.bass) * amp;
            happy = pulse;
            break;
          case 1: // estica e achata
            sx = 1 + 0.35 * sway * amp;
            sy = 1 - 0.28 * sway * amp;
            break;
          case 2: // pseudópodes como braços
            armL = Math.pow(Math.max(0, Math.sin(Math.PI * beatFrac)), 2) * amp;
            armR = Math.pow(Math.max(0, -Math.sin(Math.PI * beatFrac)), 2) * amp;
            sy = 1 - 0.1 * pulse;
            happy = 1;
            break;
          case 3: // rolando de um lado pro outro
            cx = 1.8 * Math.sin((Math.PI * beatFrac) / 4) * amp;
            roll = (Math.PI * beatFrac) / 4;
            sy = 1 - 0.08 * pulse;
            break;
          default: // pulo de gelatina
            jump = 0.9 * arc * amp;
            sy = 1 + 0.3 * arc - 0.25 * pulse;
            sx = 1 - 0.15 * arc + 0.2 * pulse;
            happy = arc;
        }
      } else {
        scale = 1 + 0.03 * Math.sin(t * 1.2);
        cx = 0.1 * Math.sin(t * 0.4);
      }

      const R = 2.2 * scale;
      const cy = R * sy * 0.98 + jump;
      const N = 96;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const th = (i / N) * TAU;
        const a = th + roll;
        let w = 0.10 * Math.sin(3 * a + t * 1.3) + 0.07 * Math.sin(5 * a - t * 2.1) + 0.05 * Math.sin(7 * a + t * 0.7);
        w += 0.06 * pulse * Math.cos(4 * a);
        // Braços: para cima e para os lados (ângulos medidos com y para cima).
        w += 0.9 * armL * bump(th, 2.35, 0.22) + 0.9 * armR * bump(th, 0.8, 0.22);
        const r = R * (1 + w);
        pts.push([cx + Math.cos(th) * r * sx, cy + Math.sin(th) * r * sy]);
      }

      st.shadow(cx, 3.6 * sx, jump);

      const hue = s.accentHue + 0.15;
      const [gx, gy] = st.pt(cx - 0.4 * sx, cy + 0.5 * sy);
      const grad = ctx.createRadialGradient(gx, gy, 0.2 * u, gx, gy, R * 1.4 * u);
      grad.addColorStop(0, hsl(hue, 0.9, 0.75, 0.85));
      grad.addColorStop(1, hsl(hue, 0.8, 0.45, 0.7));
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const [px, py] = st.pt(x, y);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = hsl(hue, 0.8, 0.35, 0.9);
      ctx.lineWidth = 0.12 * u;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Organelas flutuando e um brilho na membrana.
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 5; i++) {
        const a = t * 0.3 + i * 1.3 + roll;
        const rr = R * (0.45 + 0.2 * Math.sin(t * 0.7 + i));
        const [ox, oy] = st.pt(cx + Math.cos(a) * rr * sx, cy + Math.sin(a) * rr * sy);
        ellipse(ctx, ox, oy, (0.18 + 0.05 * i) * u, (0.14 + 0.04 * i) * u, hsl(hue + 0.1 * i, 0.8, 0.6, 0.5));
      }
      const [lx, ly] = st.pt(cx - 0.9 * sx, cy + 1.1 * sy);
      ellipse(ctx, lx, ly, 0.5 * u, 0.25 * u, 'rgba(255,255,255,0.35)', -0.6);
      ctx.restore();

      // Núcleo com carinha, que fica um pouco para trás no movimento.
      const nx = cx + 0.45 * sway * sx, ny = cy + 0.25 * swayMid * sy - 0.1 * sy;
      const [kx, ky] = st.pt(nx, ny);
      const nr = 0.8 * u;
      ellipse(ctx, kx, ky, nr * sx, nr * sy, hsl(hue, 0.7, 0.3, 0.95));
      const eyeY = ky - 0.15 * nr;
      for (const side of [-1, 1]) {
        if (happy > 0.6) {
          ctx.beginPath();
          ctx.arc(kx + side * 0.38 * nr, eyeY + 0.1 * nr, 0.2 * nr, Math.PI, 0);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.09 * nr;
          ctx.stroke();
        } else {
          ellipse(ctx, kx + side * 0.38 * nr, eyeY, 0.2 * nr, 0.24 * nr, '#ffffff');
          ellipse(ctx, kx + side * 0.38 * nr + sway * 0.06 * nr, eyeY + 0.04 * nr, 0.1 * nr, 0.12 * nr, '#1a1426');
        }
      }
      ctx.beginPath();
      ctx.moveTo(kx - 0.25 * nr, ky + 0.3 * nr);
      ctx.quadraticCurveTo(kx, ky + (0.5 + 0.25 * happy) * nr, kx + 0.25 * nr, ky + 0.3 * nr);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.08 * nr;
      ctx.lineCap = 'round';
      ctx.stroke();
    },
  });
})();

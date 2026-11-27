// Zig: inseto tipo louva-a-deus, seis pernas em onda, antenas e braços dobrados.
(function () {
  'use strict';
  const { register, util } = window.GuntherDancer;
  const { hsl, ellipse, strokePoints, frac } = util;

  register({
    id: 'insect',
    name: 'Zig',
    moveCount: 5,
    draw(ctx, st, s) {
      const { u } = st;
      const P = (x, y) => st.pt(x, y);
      const { pulse, sway, swayMid, phase: ph, beatFrac } = s;
      const amp = 0.6 + 0.4 * s.energy;
      const arc = 4 * ph * (1 - ph);
      const t = s.wallTime;

      let hipX = 0, dip = 0, jump = 0, wag = 0, headTilt = 0, legSpeed = 0.5, legLift = 0.5, tuck = 0;
      let armA = 1.0, armBend = 2.4;
      if (!s.dancing) {
        hipX = 0.05 * Math.sin(t * 0.8);
        wag = 0.08 * Math.sin(t * 1.1);
        headTilt = 0.1 * Math.sin(t * 0.6);
        legSpeed = 0; legLift = 0;
        armBend = 2.4 + 0.1 * Math.sin(t * 1.3);
      } else {
        switch (s.moveIndex) {
          case 0: // onda nas pernas, bracinhos rezando
            dip = 0.25 * pulse * amp;
            armBend = 2.4 - 0.6 * pulse;
            wag = 0.1 * swayMid;
            break;
          case 1: // corridinha de lado
            hipX = 0.9 * sway * amp;
            legSpeed = 1; legLift = 0.7;
            dip = 0.15 * pulse;
            headTilt = -0.15 * sway;
            armA = 0.8; armBend = 2.0 + 0.3 * swayMid;
            break;
          case 2: // braços pra cima
            armA = 2.6 + 0.15 * sway;
            armBend = 0.3 + 0.5 * pulse;
            dip = 0.3 * pulse * amp;
            wag = 0.15 * sway;
            break;
          case 3: // rebolado do abdômen
            wag = 0.45 * swayMid * amp;
            headTilt = -0.25 * swayMid;
            hipX = 0.2 * sway;
            dip = 0.1 * pulse;
            armA = 1.4; armBend = 1.6 + 0.4 * sway;
            break;
          default: // pulinho com pernas encolhidas
            jump = 0.8 * arc * amp;
            tuck = arc;
            dip = 0.3 * pulse;
            armA = 1.2 + 1.2 * arc; armBend = 2.2 - 1.5 * arc;
            legLift = 0;
        }
      }
      const baseY = jump - dip;
      const body = hsl(0.38, 0.55, 0.55), bodyDark = hsl(0.38, 0.6, 0.32), legColor = hsl(0.38, 0.5, 0.4);
      const dark = '#182422';

      st.shadow(hipX, 2.8, jump);

      // Pernas: três pares, cada uma com fase própria.
      const attach = [[0.7, 3.0], [0.8, 2.3], [0.7, 1.6]];
      for (let k = 0; k < 3; k++) {
        for (const side of [-1, 1]) {
          const legPhase = frac(beatFrac * legSpeed + k / 3 + (side > 0 ? 0.5 : 0));
          const lift = legLift * Math.pow(Math.max(0, Math.sin(2 * Math.PI * legPhase)), 2) + 0.9 * tuck;
          const ax = hipX + side * attach[k][0], ay = attach[k][1] + baseY;
          const kneeX = ax + side * (1.0 + 0.25 * k) * (1 - 0.4 * tuck);
          const kneeY = ay + 0.55 + 0.3 * lift;
          const footX = kneeX + side * (0.55 - 0.2 * tuck) + 0.15 * Math.sin(2 * Math.PI * legPhase) * side;
          const footY = Math.max(0, lift + 0.6 * tuck + (jump > 0 ? jump * 0.5 : 0));
          strokePoints(ctx, [P(ax, ay), P(kneeX, kneeY), P(footX, footY)], legColor, 0.17 * u);
          const [fx, fy] = P(footX, footY);
          ellipse(ctx, fx, fy, 0.12 * u, 0.1 * u, dark);
        }
      }

      // Abdômen com listras.
      const abX = hipX - Math.sin(wag) * 0.6, abY = 1.5 + baseY - 0.15;
      const [ax, ay] = P(abX, abY);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(-wag);
      ellipse(ctx, 0, 0, 1.0 * u, 1.3 * u, body);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.0 * u, 1.3 * u, 0, 0, Math.PI * 2);
      ctx.clip();
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = bodyDark;
        ctx.fillRect(-1.2 * u, (i * 0.65 + 0.2) * u, 2.4 * u, 0.22 * u);
      }
      ctx.restore();

      // Tórax.
      const [tx, ty] = P(hipX, 3.2 + baseY);
      ellipse(ctx, tx, ty, 0.85 * u, 0.8 * u, body);
      ellipse(ctx, tx - 0.25 * u, ty - 0.25 * u, 0.3 * u, 0.2 * u, 'rgba(255,255,255,0.25)');

      // Braços raptoriais.
      for (const side of [-1, 1]) {
        const sx = hipX + side * 0.7, sy = 3.55 + baseY;
        const ex = sx + side * Math.sin(armA) * 0.9, ey = sy - Math.cos(armA) * 0.9;
        const hx = ex + side * Math.sin(armA + armBend) * 0.85, hy = ey - Math.cos(armA + armBend) * 0.85;
        strokePoints(ctx, [P(sx, sy), P(ex, ey), P(hx, hy)], bodyDark, 0.22 * u);
        const [px, py] = P(hx, hy);
        ellipse(ctx, px, py, 0.16 * u, 0.16 * u, dark);
      }

      // Cabeça, olhos, antenas.
      const hx0 = hipX + Math.sin(headTilt) * 0.3, hy0 = 4.6 + baseY;
      const [hx, hy] = P(hx0, hy0);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(headTilt);
      ellipse(ctx, 0, 0, 0.75 * u, 0.65 * u, body);
      for (const side of [-1, 1]) {
        ellipse(ctx, side * 0.45 * u, -0.08 * u, 0.3 * u, 0.33 * u, dark);
        ellipse(ctx, side * 0.45 * u - 0.08 * u, -0.18 * u, 0.1 * u, 0.12 * u, 'rgba(255,255,255,0.8)');
      }
      ctx.beginPath();
      ctx.moveTo(-0.18 * u, 0.3 * u);
      ctx.quadraticCurveTo(0, (0.45 + 0.2 * pulse) * u, 0.18 * u, 0.3 * u);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 0.06 * u;
      ctx.stroke();
      const wiggle = 0.3 * swayMid + 0.15 * Math.sin(t * 5);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 0.3 * u, -0.55 * u);
        ctx.quadraticCurveTo(side * 1.0 * u, -1.4 * u, (side * 1.3 + wiggle) * u, -2.0 * u);
        ctx.strokeStyle = bodyDark;
        ctx.lineWidth = 0.08 * u;
        ctx.stroke();
        ellipse(ctx, (side * 1.3 + wiggle) * u, -2.0 * u, 0.12 * u, 0.12 * u, hsl(s.accentHue, 0.9, 0.6));
      }
      ctx.restore();
    },
  });
})();

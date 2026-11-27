// Tiny Oddity: bichinho fofo de chifres amarelo e roxo, desenhado em vetor.
// Como ele é quase só rosto, a dança vive de squash & stretch e de expressões.
// Coordenadas do modelo: origem no centro do corpo, y para baixo; 1 unidade = 1/64 de 7,5 u do palco.
(function () {
  'use strict';
  const { register, util } = window.GuntherDancer;
  const { ellipse } = util;

  const C = {
    white: '#ffffff', shade: '#ece6f7', outline: '#c9c0de', yellow: '#ffd93d', yellowDark: '#e0b300',
    purple: '#a259ff', purpleDark: '#7a3fe0', dark: '#2b2838', pink: '#f4a9cf', lavender: '#b9a2f0',
    iris: '#ffcc33', irisDark: '#3a2d4d',
  };
  const TAU = Math.PI * 2;

  // Corpo fofo: uma elipse com dez "pompons" em volta.
  function fluff(ctx, grow) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 21 + grow, 19 + grow, 0, 0, TAU);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const x = Math.cos(a) * 18, y = Math.sin(a) * 16;
      ctx.moveTo(x + 5 + grow, y);
      ctx.arc(x, y, 5 + grow, 0, TAU);
    }
  }

  function starPath(ctx, cx, cy, r, inner = 0.42, points = 4) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (i * Math.PI) / points - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * inner;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function line(ctx, pts, color, width) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawHorns(ctx, w) {
    // Chifre amarelo (esquerda), em forma de chama.
    ctx.beginPath();
    ctx.moveTo(-16, -7);
    ctx.quadraticCurveTo(-26 + w * 0.4, -16, -22 + w, -31);
    ctx.quadraticCurveTo(-19 + w * 0.8, -25, -16 + w * 0.6, -27);
    ctx.quadraticCurveTo(-15 + w * 0.4, -20, -6, -15);
    ctx.closePath();
    const gy = ctx.createLinearGradient(-20, -30, -10, -8);
    gy.addColorStop(0, C.yellow);
    gy.addColorStop(1, C.yellowDark);
    ctx.fillStyle = gy;
    ctx.fill();
    // Chifre roxo (direita), com duas pontas.
    ctx.beginPath();
    ctx.moveTo(16, -7);
    ctx.quadraticCurveTo(27 - w * 0.4, -15, 23 - w, -32);
    ctx.quadraticCurveTo(20 - w * 0.8, -26, 17 - w * 0.6, -29);
    ctx.quadraticCurveTo(15 - w * 0.4, -21, 6, -15);
    ctx.closePath();
    const gp = ctx.createLinearGradient(20, -31, 10, -8);
    gp.addColorStop(0, C.purple);
    gp.addColorStop(1, C.purpleDark);
    ctx.fillStyle = gp;
    ctx.fill();
  }

  function drawEye(ctx, ex, kind, f) {
    const ey = -1;
    if (kind === 'happy') {
      ctx.beginPath();
      ctx.moveTo(ex - 4.5, ey + 1.5);
      ctx.quadraticCurveTo(ex, ey - 4.5, ex + 4.5, ey + 1.5);
      ctx.strokeStyle = C.dark;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.stroke();
      return;
    }
    if (kind === 'sleep') {
      ctx.beginPath();
      ctx.moveTo(ex - 4, ey);
      ctx.quadraticCurveTo(ex, ey + 2.5, ex + 4, ey);
      ctx.strokeStyle = C.dark;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      return;
    }
    if (kind === 'star') {
      starPath(ctx, ex, ey, 7, 0.45, 4);
      ctx.fillStyle = C.dark;
      ctx.fill();
      starPath(ctx, ex, ey, 5.3, 0.45, 4);
      ctx.fillStyle = C.iris;
      ctx.fill();
      ellipse(ctx, ex - 1, ey - 1.5, 0.9, 0.9, '#ffffff');
      return;
    }
    const big = kind === 'wide' ? 1.22 : 1;
    ellipse(ctx, ex, ey, 6.6 * big, 7.6 * big, C.dark);
    ellipse(ctx, ex, ey, 5.5 * big, 6.5 * big, C.white);
    const ir = kind === 'wide' ? 0.75 : 1;
    const px = ex + f.lookX * 1.5, py = ey + f.lookY * 1.2 + 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(px, py, 3.8 * ir, 4.8 * ir, 0, 0, TAU);
    ctx.fillStyle = C.irisDark;
    ctx.fill();
    ctx.clip();
    ellipse(ctx, px, py + 3.2 * ir, 3.4 * ir, 2.6 * ir, C.iris);
    ctx.restore();
    ellipse(ctx, px - 1.4 * ir, py - 1.9 * ir, 1.5 * ir, 1.7 * ir, '#ffffff');
    ellipse(ctx, px + 1.3 * ir, py + 1.2 * ir, 0.6 * ir, 0.6 * ir, '#ffffff');
  }

  function drawMouth(ctx, f) {
    if (f.mouth === 'open') {
      const m = f.mouthScale;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 9.5, 3.2 * m, 3.4 * m, 0, 0, TAU);
      ctx.fillStyle = C.dark;
      ctx.fill();
      ctx.clip();
      ellipse(ctx, 0, 9.5 + 2.2 * m, 2.4 * m, 1.6 * m, C.pink);
      ctx.restore();
    } else if (f.mouth === 'o') {
      ellipse(ctx, 0, 9, 2.2, 2.5, C.dark);
    } else if (f.mouth === 'flat') {
      line(ctx, [[-2.5, 9], [2.5, 9]], C.dark, 1.2);
    } else {
      ctx.beginPath();
      ctx.moveTo(-3.2, 8);
      ctx.quadraticCurveTo(0, 11, 3.2, 8);
      ctx.strokeStyle = C.dark;
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  function drawFoot(ctx, x, y, color, edge) {
    ellipse(ctx, x, y + 0.6, 5, 3.2, edge);
    ellipse(ctx, x, y, 4.6, 2.9, color);
    ellipse(ctx, x - 1.4, y - 1, 1.5, 0.8, 'rgba(255,255,255,0.45)');
  }

  // Corpo, chifres, pés e rosto, já dentro da transformação do squash.
  function drawBody(ctx, f) {
    drawHorns(ctx, f.hornWiggle);
    // Contorno suave e corpo com sombreado.
    fluff(ctx, 1.3);
    ctx.fillStyle = C.outline;
    ctx.fill();
    fluff(ctx, 0);
    const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 24);
    g.addColorStop(0, C.white);
    g.addColorStop(0.65, C.white);
    g.addColorStop(1, C.shade);
    ctx.fillStyle = g;
    ctx.fill();
    // Marquinha "x" na testa e bochechas.
    line(ctx, [[-10.5, -13.5], [-7.5, -10.5]], C.lavender, 1.2);
    line(ctx, [[-7.5, -13.5], [-10.5, -10.5]], C.lavender, 1.2);
    ellipse(ctx, -13.5, 5, 2.8, 1.6, 'rgba(244,169,207,0.85)');
    ellipse(ctx, 13.5, 5, 2.8, 1.6, 'rgba(244,169,207,0.85)');
    // Pezinhos na frente, embaixo do corpo.
    drawFoot(ctx, -9.5 + f.feetL, 20 - 3.5 * f.liftL, C.yellow, C.yellowDark);
    drawFoot(ctx, 9.5 + f.feetR, 20 - 3.5 * f.liftR, C.purple, C.purpleDark);
    drawEye(ctx, -8, f.eyeL, f);
    drawEye(ctx, 8, f.eyeR, f);
    drawMouth(ctx, f);
  }

  // Enfeites que não amassam junto com o corpo.
  function drawExtras(ctx, f) {
    if (f.exclaim) {
      line(ctx, [[0, -40], [0, -33]], C.yellow, 2.4);
      ellipse(ctx, 0, -29.5, 1.3, 1.3, C.yellow);
    }
    if (f.sparkle > 0) {
      const r = 2 + 2.5 * f.sparkle;
      for (const [x, y, k, color] of [[-31, -14, 1, C.yellow], [31, -9, 0.8, C.lavender], [27, 14, 0.6, C.yellow], [-27, 12, 0.5, C.lavender]]) {
        starPath(ctx, x, y, r * k, 0.35, 4);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
    if (f.zzz) {
      const bob = Math.sin(f.t * 1.5) * 1.5;
      for (const [x, y, k] of [[22, -27 + bob, 1], [27.5, -33 - bob, 1.35]]) {
        line(ctx, [[x, y], [x + 3 * k, y], [x, y + 3 * k], [x + 3 * k, y + 3 * k]], C.lavender, 0.9 * k);
      }
    }
  }

  function computeFrame(s) {
    const f = {
      sx: 1, sy: 1, rot: 0, jump: 0, hipX: 0, hornWiggle: 0, lookX: 0, lookY: 0,
      feetL: 0, feetR: 0, liftL: 0, liftR: 0, eyeL: 'normal', eyeR: 'normal', mouth: 'smile', mouthScale: 1,
      exclaim: false, sparkle: 0, zzz: false, t: s.wallTime,
    };
    if (!s.dancing) {
      const t = s.wallTime;
      f.sy = 1 + 0.03 * Math.sin(t * 1.4);
      f.sx = 1 - 0.02 * Math.sin(t * 1.4);
      f.rot = 0.06 * Math.sin(t * 0.5);
      f.eyeL = f.eyeR = 'sleep';
      f.mouth = 'flat';
      f.zzz = true;
      f.hornWiggle = 0.5 * Math.sin(t * 0.8);
      return f;
    }
    const amp = 0.6 + 0.4 * s.energy;
    const { pulse, sway, swayMid, beatFrac, hop, land, stretch } = s;
    // Amassa no kick: impacto mais um balanço suave.
    const squash = 0.6 * land + 0.4 * pulse;
    f.hornWiggle = 1.6 * swayMid * amp;

    switch (s.moveIndex) {
      case 0: // quicando no lugar, amassando no kick
        f.sy = 1 - 0.22 * squash * amp;
        f.sx = 1 + 0.2 * squash * amp;
        f.lookX = sway;
        f.lookY = 0.4 * squash;
        break;
      case 1: // pulinho feliz: pousa no kick e amassa só depois de tocar o chão
        f.jump = 0.9 * hop * amp;
        f.sy = 1 - 0.25 * land + 0.15 * stretch;
        f.sx = 1 + 0.22 * land - 0.1 * stretch;
        f.eyeL = f.eyeR = 'happy';
        f.mouth = 'open';
        f.mouthScale = 0.8 + 0.4 * hop;
        break;
      case 2: { // giro
        const spin = Math.cos((Math.PI * beatFrac) / 2);
        f.sx = Math.sign(spin || 1) * Math.max(0.18, Math.abs(spin));
        f.sy = 1 - 0.1 * squash;
        f.lookX = -Math.sin((Math.PI * beatFrac) / 2) * 1.2;
        f.mouth = 'o';
        break;
      }
      case 3: // piscadinha com inclinação
        f.rot = 0.22 * sway * amp;
        f.sy = 1 - 0.1 * squash;
        f.sx = 1 + 0.08 * squash;
        f.lookX = 0.6 * sway;
        if (s.beatIndex % 2 === 1 && s.phase < 0.6) f.eyeR = 'happy';
        break;
      case 4: // arrastando os pés, surpreso: cada pezinho sobe e bate no kick
        f.hipX = 0.35 * sway * amp;
        f.feetL = 2.5 * sway;
        f.feetR = -2.5 * sway;
        f.liftL = s.rightStep ? 0 : hop;
        f.liftR = s.rightStep ? hop : 0;
        f.sy = 1 - 0.1 * land;
        f.eyeL = f.eyeR = 'wide';
        f.mouth = 'o';
        f.lookX = -0.8 * sway;
        f.exclaim = land > 0.3 && s.beatIndex % 4 === 0;
        break;
      default: // festa de estrelas: pulinho com brilho explodindo no pouso
        f.eyeL = f.eyeR = 'star';
        f.mouth = 'open';
        f.mouthScale = 0.9 + 0.3 * land;
        f.jump = 0.4 * hop * amp;
        f.sy = 1 - 0.2 * land + 0.1 * stretch;
        f.sx = 1 + 0.15 * land - 0.06 * stretch;
        f.sparkle = land;
        f.rot = 0.1 * swayMid;
    }
    // Grave forte: olhos de estrela por um instante.
    if (s.onsetGlow > 0.5 && s.bass > 0.8 && f.eyeL === 'normal') {
      f.eyeL = f.eyeR = 'star';
      f.sparkle = Math.max(f.sparkle, s.onsetGlow);
    }
    return f;
  }

  register({
    id: 'oddity',
    name: 'Tiny Oddity',
    desc: 'Bichinho de chifres coloridos que dança com a cara toda.',
    moveCount: 6,
    frame: computeFrame,
    draw(ctx, st, s) {
      const f = computeFrame(s);
      const k = (7.5 * st.u) / 64;
      // Fundo dos pés no chão; o centro do corpo sobe com o squash e com o pulo.
      const bx = st.cx + f.hipX * st.u;
      const by = st.groundY - k * (23.6 * f.sy + f.jump * 10);
      st.shadow(f.hipX, 3.3 * Math.abs(f.sx), f.jump);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(f.rot);
      ctx.scale(k * f.sx, k * f.sy);
      drawBody(ctx, f);
      ctx.restore();
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(k, k);
      drawExtras(ctx, f);
      ctx.restore();
    },
  });
})();

// Tiny Oddity: o bichinho fofo em pixel art. Rasterizado em 64x64 e ampliado sem suavização.
// Como ele é quase só rosto, a dança vive de squash & stretch e de expressões.
(function () {
  'use strict';
  const { register } = window.GuntherDancer;

  const SIZE = 64;
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const octx = off.getContext('2d');
  const img = octx.createImageData(SIZE, SIZE);
  const buf = new Uint32Array(img.data.buffer);

  // Cores no formato do buffer (little endian: 0xAABBGGRR).
  const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0xff << 24 | (n & 0xff) << 16 | (n & 0xff00) | (n >> 16)) >>> 0;
  };
  const C = {
    white: rgb('#ffffff'), halo: rgb('#dcd7ea'), yellow: rgb('#ffd93d'), yellowDark: rgb('#d9ad00'),
    purple: rgb('#a259ff'), purpleDark: rgb('#7a3fe0'), dark: rgb('#2b2838'), pink: rgb('#f4a9cf'),
    lavender: rgb('#cdb4ff'), iris: rgb('#ffcc33'), irisDark: rgb('#3a2d4d'), grey: rgb('#b9b6c8'),
  };

  // Formas em coordenadas do modelo (origem no centro do corpo, y para baixo).
  const ellipse = (cx, cy, rx, ry, color) => ({ t: 0, cx, cy, rx, ry, color });
  const capsule = (x1, y1, x2, y2, r, color) => ({ t: 1, x1, y1, x2, y2, r, color });
  const poly = (pts, color) => ({ t: 2, pts, color });

  function contains(sh, x, y) {
    if (sh.t === 0) {
      const dx = (x - sh.cx) / sh.rx, dy = (y - sh.cy) / sh.ry;
      return dx * dx + dy * dy <= 1;
    }
    if (sh.t === 1) {
      const vx = sh.x2 - sh.x1, vy = sh.y2 - sh.y1;
      const len2 = vx * vx + vy * vy || 1;
      let t = ((x - sh.x1) * vx + (y - sh.y1) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = x - (sh.x1 + vx * t), dy = y - (sh.y1 + vy * t);
      return dx * dx + dy * dy <= sh.r * sh.r;
    }
    const p = sh.pts;
    let inside = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function polyline(points, r, color, out) {
    for (let i = 0; i + 1 < points.length; i++) {
      out.push(capsule(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], r, color));
    }
  }

  function star(cx, cy, r, color) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return poly(pts, color);
  }

  // Olhos: 'normal' | 'happy' | 'star' | 'sleep' | 'wink' | 'wide'
  function buildShapes(f) {
    const sh = [];
    const w = f.hornWiggle;

    // Halo claro em volta do corpo, para o contorno suave.
    sh.push(ellipse(0, 0, 22.5, 20.5, C.halo));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      sh.push(ellipse(Math.cos(a) * 18, Math.sin(a) * 16, 6.3, 6.3, C.halo));
    }
    // Chifres (atrás do corpo).
    sh.push(poly([[-17, -9], [-23 + w, -27], [-19 + w, -29.5], [-8, -16]], C.yellow));
    sh.push(poly([[-18, -10], [-22 + w, -25], [-16, -16]], C.yellowDark));
    sh.push(poly([[17, -9], [25 - w, -28], [20 - w, -31.5], [8, -16]], C.purple));
    sh.push(poly([[18, -10], [23 - w, -26], [16, -16]], C.purpleDark));
    // Corpo fofo.
    sh.push(ellipse(0, 0, 21, 19, C.white));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      sh.push(ellipse(Math.cos(a) * 18, Math.sin(a) * 16, 5, 5, C.white));
    }
    // Pés.
    sh.push(ellipse(-9 + f.feetL, 19, 4, 2.5, C.yellow));
    sh.push(ellipse(9 + f.feetR, 19, 4, 2.5, C.purple));
    // Marquinha "x" na testa e bochechas.
    polyline([[-10.5, -13.5], [-7.5, -10.5]], 0.7, C.lavender, sh);
    polyline([[-7.5, -13.5], [-10.5, -10.5]], 0.7, C.lavender, sh);
    sh.push(ellipse(-13.5, 5, 2.6, 1.4, C.pink));
    sh.push(ellipse(13.5, 5, 2.6, 1.4, C.pink));

    // Olhos.
    const eye = (ex, kind) => {
      const ey = -1;
      if (kind === 'happy') {
        polyline([[ex - 4.5, ey + 1], [ex, ey - 3], [ex + 4.5, ey + 1]], 1.1, C.dark, sh);
        return;
      }
      if (kind === 'sleep') {
        polyline([[ex - 4, ey + 1], [ex + 4, ey + 1]], 1.0, C.dark, sh);
        return;
      }
      if (kind === 'star') {
        sh.push(star(ex, ey, 6.5, C.dark));
        sh.push(star(ex, ey, 5, C.iris));
        return;
      }
      const big = kind === 'wide' ? 1.25 : 1;
      sh.push(ellipse(ex, ey, 6.5 * big, 7.5 * big, C.dark));
      sh.push(ellipse(ex, ey, 5.5 * big, 6.5 * big, C.white));
      const px = ex + f.lookX * 1.6, py = ey + f.lookY * 1.2 + 0.5;
      const ir = kind === 'wide' ? 0.8 : 1;
      sh.push(ellipse(px, py, 3.6 * ir, 4.6 * ir, C.irisDark));
      sh.push(ellipse(px, py + 1.8, 2.4 * ir, 2.0 * ir, C.iris));
      sh.push(ellipse(px - 1.3, py - 1.9, 1.3, 1.6, C.white));
    };
    eye(-8, f.eyeL);
    eye(8, f.eyeR);

    // Boca.
    if (f.mouth === 'open') {
      sh.push(ellipse(0, 9.5, 3.2 * f.mouthScale, 3.4 * f.mouthScale, C.dark));
      sh.push(ellipse(0, 10.8, 1.9 * f.mouthScale, 1.3 * f.mouthScale, C.pink));
    } else if (f.mouth === 'o') {
      sh.push(ellipse(0, 9, 2.2, 2.4, C.dark));
    } else if (f.mouth === 'flat') {
      polyline([[-2.5, 9], [2.5, 9]], 0.8, C.dark, sh);
    } else {
      polyline([[-3, 8], [0, 9.6], [3, 8]], 0.8, C.dark, sh);
    }

    // Enfeites.
    if (f.exclaim) {
      sh.push(capsule(0, -34, 0, -28, 1.1, C.yellow));
      sh.push(ellipse(0, -25.5, 1.2, 1.2, C.yellow));
    }
    if (f.sparkle > 0) {
      const r = 2 + 2 * f.sparkle;
      sh.push(star(-30, -14, r, C.yellow));
      sh.push(star(31, -8, r * 0.8, C.lavender));
      sh.push(star(27, 14, r * 0.6, C.yellow));
    }
    if (f.zzz) {
      const z = (x, y, k) => {
        polyline([[x, y], [x + 3 * k, y], [x, y + 3 * k], [x + 3 * k, y + 3 * k]], 0.6 * k, C.lavender, sh);
      };
      const bob = Math.sin(f.t * 1.5) * 1.5;
      z(22, -26 + bob, 1);
      z(27, -31 - bob, 1.3);
    }
    return sh;
  }

  function rasterize(shapes, tf) {
    buf.fill(0);
    const cos = Math.cos(-tf.rot), sin = Math.sin(-tf.rot);
    const isx = 1 / tf.sx, isy = 1 / tf.sy;
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const dx = px + 0.5 - tf.cx, dy = py + 0.5 - tf.cy;
        const rx = dx * cos - dy * sin, ry = dx * sin + dy * cos;
        const mx = rx * isx, my = ry * isy;
        for (let i = shapes.length - 1; i >= 0; i--) {
          if (contains(shapes[i], mx, my)) {
            buf[py * SIZE + px] = shapes[i].color;
            break;
          }
        }
      }
    }
    octx.putImageData(img, 0, 0);
  }

  function computeFrame(s) {
    const f = {
      sx: 1, sy: 1, rot: 0, jump: 0, hipX: 0, hornWiggle: 0, lookX: 0, lookY: 0,
      feetL: 0, feetR: 0, eyeL: 'normal', eyeR: 'normal', mouth: 'smile', mouthScale: 1,
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
    const { pulse, sway, swayMid, phase: ph, beatFrac } = s;
    const arc = 4 * ph * (1 - ph);
    f.hornWiggle = 1.6 * swayMid * amp;

    switch (s.moveIndex) {
      case 0: // quicando no lugar
        f.sy = 1 - 0.22 * pulse * amp;
        f.sx = 1 + 0.2 * pulse * amp;
        f.lookX = sway;
        f.lookY = 0.4 * pulse;
        break;
      case 1: // pulinho feliz
        f.jump = 0.9 * arc * amp;
        f.sy = 1 + 0.18 * arc - 0.18 * pulse;
        f.sx = 1 - 0.1 * arc + 0.15 * pulse;
        f.eyeL = f.eyeR = 'happy';
        f.mouth = 'open';
        f.mouthScale = 0.8 + 0.4 * arc;
        break;
      case 2: { // giro
        const spin = Math.cos((Math.PI * beatFrac) / 2);
        f.sx = Math.sign(spin || 1) * Math.max(0.18, Math.abs(spin));
        f.sy = 1 - 0.1 * pulse;
        f.lookX = -Math.sin((Math.PI * beatFrac) / 2) * 1.2;
        f.mouth = 'o';
        break;
      }
      case 3: // piscadinha com inclinação
        f.rot = 0.22 * sway * amp;
        f.sy = 1 - 0.1 * pulse;
        f.sx = 1 + 0.08 * pulse;
        f.lookX = 0.6 * sway;
        if (s.beatIndex % 2 === 1 && ph < 0.6) f.eyeR = 'happy';
        break;
      case 4: // arrastando os pés, surpreso
        f.hipX = 0.35 * sway * amp;
        f.feetL = 2.5 * sway;
        f.feetR = -2.5 * sway;
        f.sy = 1 - 0.08 * pulse;
        f.eyeL = f.eyeR = 'wide';
        f.mouth = 'o';
        f.lookX = -0.8 * sway;
        f.exclaim = pulse > 0.6 && s.beatIndex % 4 === 0;
        break;
      default: // festa de estrelas
        f.eyeL = f.eyeR = 'star';
        f.mouth = 'open';
        f.mouthScale = 0.9 + 0.3 * pulse;
        f.jump = 0.4 * arc * amp;
        f.sy = 1 - 0.15 * pulse;
        f.sx = 1 + 0.12 * pulse;
        f.sparkle = Math.pow(1 - ph, 2);
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
    desc: 'Bichinho de pixel art que dança com a cara toda.',
    moveCount: 6,
    draw(ctx, st, s) {
      const f = computeFrame(s);
      const shapes = buildShapes(f);
      // O pé fica na linha 54 do canvas de pixels; o centro do corpo sobe conforme o squash.
      const groundRow = 54;
      const tf = { sx: f.sx, sy: f.sy, rot: f.rot, cx: SIZE / 2, cy: groundRow - 19 * f.sy - f.jump * 10 };
      rasterize(shapes, tf);

      const u = st.u;
      let k = (7.5 * u) / SIZE;
      if (k >= 2) k = Math.floor(k);
      st.shadow(f.hipX, 3.3 * Math.abs(f.sx), f.jump);
      const dx = Math.round(st.cx + f.hipX * u - (SIZE / 2) * k);
      const dy = Math.round(st.groundY + 0.1 * u - groundRow * k);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, SIZE, SIZE, dx, dy, SIZE * k, SIZE * k);
      ctx.restore();
    },
  });
})();

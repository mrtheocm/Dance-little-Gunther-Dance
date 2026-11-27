// Desenho do Gunther em um <canvas> 2D. Mesma cinemática do DancerView.swift.
(function (root) {
  'use strict';

  const MOVE_COUNT = 5;
  const V = (x, y) => ({ x, y });
  const add = (a, b) => V(a.x + b.x, a.y + b.y);
  const sub = (a, b) => V(a.x - b.x, a.y - b.y);
  const mul = (a, s) => V(a.x * s, a.y * s);
  const fromDown = (angle, side) => V(side * Math.sin(angle), -Math.cos(angle));
  const fromUp = (angle) => V(Math.sin(angle), Math.cos(angle));
  const frac = (x) => ((x % 1) + 1) % 1;

  function computeScene(state, now, wallTime, lead) {
    const dancing = state.hasBeat && !state.isSilent;
    const period = Math.max(state.beatPeriod, 0.2);
    const elapsed = Math.max(0, now + lead - state.lastBeatTime);
    const beats = Math.min(elapsed / period, 1e6);
    const whole = Math.floor(beats);
    return {
      phase: beats - whole,
      beatIndex: state.beatCount + whole,
      energy: state.level,
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      dancing,
      wallTime,
      onsetGlow: Math.max(0, 1 - (now - state.lastOnsetTime) / 0.25),
      moveIndex: Math.floor((state.beatCount + whole) / 8) % MOVE_COUNT,
    };
  }

  function computePose(s) {
    const p = {
      hipX: 0, lean: 0, headTilt: 0, jump: 0, mouthOpen: 0,
      armL: { angle: 0.3, bend: 0.5 }, armR: { angle: 0.3, bend: 0.5 },
      legL: { angle: 0.12, bend: 0.2 }, legR: { angle: 0.12, bend: 0.2 },
    };
    if (!s.dancing) {
      const t = s.wallTime;
      p.hipX = 0.08 * Math.sin(t * 0.9);
      p.lean = 0.03 * Math.sin(t * 0.9);
      p.headTilt = 0.08 * Math.sin(t * 0.5 + 1);
      p.armL = { angle: 0.25 + 0.03 * Math.sin(t * 1.1), bend: 0.35 };
      p.armR = { angle: 0.25 + 0.03 * Math.sin(t * 1.1 + 2), bend: 0.35 };
      return p;
    }
    const amp = 0.55 + 0.45 * s.energy;
    const b = s.beatIndex;
    const ph = s.phase;
    const pulse = 0.5 * (1 + Math.cos(2 * Math.PI * ph));
    const sway = -Math.cos(Math.PI * (b + ph));
    const swayMid = Math.sin(Math.PI * (b + ph));
    const dip = pulse * (0.4 + 0.6 * s.bass);
    const max0 = (x) => Math.max(0, x);

    switch (s.moveIndex) {
      case 0: // passo lateral
        p.hipX = 0.55 * sway * amp;
        p.lean = 0.12 * sway;
        p.headTilt = -0.15 * sway;
        p.armL = { angle: 0.45 - 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse };
        p.armR = { angle: 0.45 + 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse };
        p.legL = { angle: 0.15 + 0.2 * max0(-sway), bend: 0.15 + 0.5 * max0(sway) + 0.25 * dip };
        p.legR = { angle: 0.15 + 0.2 * max0(sway), bend: 0.15 + 0.5 * max0(-sway) + 0.25 * dip };
        break;
      case 1: // mãos para cima
        p.hipX = 0.25 * sway * amp;
        p.lean = 0.06 * sway;
        p.headTilt = 0.1 * swayMid;
        p.armL = { angle: 2.6 + 0.2 * sway, bend: 0.25 + 0.55 * pulse };
        p.armR = { angle: 2.6 - 0.2 * sway, bend: 0.25 + 0.55 * pulse };
        p.legL = { angle: 0.2, bend: 0.2 + 0.5 * dip };
        p.legR = { angle: 0.2, bend: 0.2 + 0.5 * dip };
        p.mouthOpen = 0.6 * pulse;
        break;
      case 2: // twist
        p.hipX = 0.15 * swayMid * amp;
        p.lean = -0.1 * sway;
        p.headTilt = 0.2 * sway;
        p.armL = { angle: 1.4 + 0.4 * sway * amp, bend: 1.3 };
        p.armR = { angle: 1.4 - 0.4 * sway * amp, bend: 1.3 };
        p.legL = { angle: 0.08, bend: 0.2 + 0.4 * max0(sway) + 0.2 * dip };
        p.legR = { angle: 0.08, bend: 0.2 + 0.4 * max0(-sway) + 0.2 * dip };
        break;
      case 3: { // pulo com punho no ar
        const arc = 4 * ph * (1 - ph);
        p.jump = (s.energy > 0.45 ? 0.9 : 0.35) * arc;
        p.lean = 0.05 * sway;
        p.armR = { angle: 2.9 - 0.5 * pulse, bend: 0.3 + 0.3 * pulse };
        p.armL = { angle: 0.5 + 0.2 * arc, bend: 0.8 };
        p.legL = { angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc };
        p.legR = { angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc };
        p.mouthOpen = 0.8 * arc;
        break;
      }
      default: { // running man
        const lift = Math.sin(Math.PI * ph);
        const leftTurn = b % 2 === 0;
        const liftL = leftTurn ? lift : 0;
        const liftR = leftTurn ? 0 : lift;
        p.lean = 0.08;
        p.headTilt = 0.05 * swayMid;
        p.legL = { angle: 0.1 + 0.9 * liftL, bend: 0.2 + 1.3 * liftL + 0.2 * dip };
        p.legR = { angle: 0.1 + 0.9 * liftR, bend: 0.2 + 1.3 * liftR + 0.2 * dip };
        p.armL = { angle: 0.6 + 0.5 * liftR, bend: 1.3 + 0.3 * liftR };
        p.armR = { angle: 0.6 + 0.5 * liftL, bend: 1.3 + 0.3 * liftL };
      }
    }
    p.headTilt += 0.05 * s.high * Math.sin(s.wallTime * 37);
    return p;
  }

  const hsl = (h, sat, light, a = 1) => `hsla(${frac(h) * 360}, ${sat * 100}%, ${light * 100}%, ${a})`;

  function drawScene(ctx, width, height, s) {
    const u = Math.min(width / 8.5, height / 11.5);
    const groundY = height * 0.78;
    const cx = width / 2;
    const accentHue = Math.floor(s.beatIndex / 4) % 8 / 8;

    drawBackground(ctx, width, height, groundY, u, s, accentHue);

    const pose = computePose(s);
    const thigh = 1.6, shin = 1.5, torsoLen = 2.2, upperArm = 1.15, foreArm = 1.05, headR = 0.85;
    const pt = (v) => [cx + v.x * u, groundY - v.y * u];

    const legExtent = (l) => thigh * Math.cos(l.angle) + shin * Math.cos(l.angle - l.bend);
    const hipY = Math.max(legExtent(pose.legL), legExtent(pose.legR)) + pose.jump;
    const hip = V(pose.hipX, hipY);
    const hipL = add(hip, V(-0.42, 0));
    const hipR = add(hip, V(0.42, 0));
    const leg = (l, h, side) => {
      const knee = add(h, mul(fromDown(l.angle, side), thigh));
      const foot = add(knee, mul(fromDown(l.angle - l.bend, side), shin));
      return { knee, foot };
    };
    const legL = leg(pose.legL, hipL, -1), legR = leg(pose.legR, hipR, 1);

    const torsoDir = fromUp(pose.lean);
    const neck = add(hip, mul(torsoDir, torsoLen));
    const shoulderCenter = add(hip, mul(torsoDir, torsoLen * 0.85));
    const perp = V(Math.cos(pose.lean), -Math.sin(pose.lean));
    const shoulderL = sub(shoulderCenter, mul(perp, 0.75));
    const shoulderR = add(shoulderCenter, mul(perp, 0.75));
    const arm = (a, sh, side) => {
      const elbow = add(sh, mul(fromDown(a.angle, side), upperArm));
      const hand = add(elbow, mul(fromDown(a.angle + a.bend, side), foreArm));
      return { elbow, hand };
    };
    const armL = arm(pose.armL, shoulderL, -1), armR = arm(pose.armR, shoulderR, 1);
    const head = add(neck, mul(fromUp(pose.lean + pose.headTilt), headR * 1.05));

    const skin = '#f5cca1';
    const pants = '#29338c';
    const shirt = hsl(accentHue + 0.5, 0.7, 0.6);
    const outline = '#1a1426';

    const stroke = (points, color, width) => {
      ctx.beginPath();
      points.forEach((v, i) => { const [x, y] = pt(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    const ellipse = (x, y, rx, ry, color) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Sombra.
    const shadowW = (2.4 - 0.8 * Math.min(1, pose.jump)) * u;
    ellipse(cx + pose.hipX * u, groundY, shadowW / 2, 0.18 * u, 'rgba(0,0,0,0.45)');

    const limbWidth = 0.42 * u;
    stroke([hipL, legL.knee, legL.foot], pants, limbWidth);
    stroke([hipR, legR.knee, legR.foot], pants, limbWidth);
    for (const [foot, side] of [[legL.foot, -1], [legR.foot, 1]]) {
      const [x, y] = pt(add(foot, V(side * 0.12, -0.05)));
      ellipse(x, y, 0.5 * u, 0.26 * u, '#ffffff');
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, 0.5 * u, 0.26 * u, 0, 0, Math.PI * 2);
      ctx.clip();
      ellipse(x, y + 0.13 * u, 0.5 * u, 0.11 * u, '#e6333f');
      ctx.restore();
    }

    stroke([add(hip, mul(torsoDir, 0.55)), sub(neck, mul(torsoDir, 0.35))], shirt, 1.55 * u);
    stroke([add(add(hip, mul(perp, -0.75)), mul(torsoDir, 0.12)), add(add(hip, mul(perp, 0.75)), mul(torsoDir, 0.12))], outline, 0.2 * u);

    for (const [limb, shoulder] of [[armL, shoulderL], [armR, shoulderR]]) {
      stroke([shoulder, limb.elbow, limb.hand], skin, limbWidth);
      stroke([shoulder, add(shoulder, mul(sub(limb.elbow, shoulder), 0.35))], shirt, 0.62 * u);
      const [hx, hy] = pt(limb.hand);
      ellipse(hx, hy, 0.32 * u, 0.32 * u, skin);
    }

    const [hx, hy] = pt(head);
    const hr = headR * u;
    ellipse(hx, hy, hr, hr, skin);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(pose.lean + pose.headTilt);
    drawFace(ctx, hr, pose.mouthOpen, outline, hsl(accentHue, 0.9, 0.55));
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFace(ctx, r, mouthOpen, hair, accent) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const t = (i - 2) / 2;
      const baseX = t * r * 0.65;
      const baseY = -r * 0.72 + Math.abs(t) * r * 0.18;
      ctx.moveTo(baseX - r * 0.18, baseY);
      ctx.lineTo(baseX + t * r * 0.25, baseY - r * 0.55);
      ctx.lineTo(baseX + r * 0.18, baseY);
      ctx.closePath();
    }
    ctx.fill();

    const lensW = r * 0.62, lensH = r * 0.42, lensY = -r * 0.22;
    for (const sx of [-1, 1]) {
      const x = sx * r * 0.36 - lensW / 2, y = lensY - lensH / 2;
      roundRect(ctx, x, y, lensW, lensH, lensH * 0.35);
      ctx.fillStyle = hair;
      ctx.fill();
      roundRect(ctx, x + lensW * 0.15, y + lensH * 0.15, lensW * 0.3, lensH * 0.22, 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, lensY);
    ctx.lineTo(r * 0.08, lensY);
    ctx.strokeStyle = hair;
    ctx.lineWidth = r * 0.08;
    ctx.stroke();

    if (mouthOpen > 0.15) {
      const w = r * 0.5, h = r * (0.15 + 0.35 * mouthOpen);
      ctx.beginPath();
      ctx.ellipse(0, r * 0.38, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = hair;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.32);
      ctx.quadraticCurveTo(0, r * 0.75, r * 0.36, r * 0.32);
      ctx.strokeStyle = hair;
      ctx.lineWidth = r * 0.09;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  function drawBackground(ctx, width, height, groundY, u, s, accentHue) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#12082a');
    grad.addColorStop(1, '#05050d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const pulse = s.dancing ? Math.pow(1 - s.phase, 2) : 0;
    const cxp = width / 2, cyp = height * 0.45;

    // Holofotes.
    const sweep = Math.sin(s.wallTime * 0.6) * 0.35;
    const intensity = s.dancing ? 0.10 + 0.22 * s.mid + 0.15 * s.onsetGlow : 0.05;
    const lights = [
      [width * 0.1, accentHue, sweep + 0.25],
      [width * 0.9, accentHue + 0.33, -sweep - 0.25],
      [width * 0.5, accentHue + 0.66, sweep * 0.5],
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
      ctx.fillStyle = hsl(accentHue, 0.85, 0.6, 0.12 * pulse * (0.3 + 0.7 * s.bass));
      ctx.fillRect(0, 0, width, height);

      const r = (0.15 + 0.85 * s.phase) * Math.max(width, height) * 0.6;
      ctx.beginPath();
      ctx.arc(cxp, cyp, r, 0, Math.PI * 2);
      ctx.strokeStyle = hsl(accentHue, 0.85, 0.6, 0.5 * Math.pow(1 - s.phase, 2) * (0.3 + 0.7 * s.energy));
      ctx.lineWidth = 1 + 8 * (1 - s.phase);
      ctx.stroke();
    }

    const tiles = 7;
    const tileW = width / tiles;
    for (let i = 0; i < tiles; i++) {
      const lit = (i + s.beatIndex) % 2 === 0;
      const hue = accentHue + i * 0.07;
      const alpha = s.dancing ? (lit ? 0.35 + 0.4 * pulse : 0.15) : 0.12;
      roundRect(ctx, i * tileW + 2, groundY, tileW - 4, 0.7 * u, 4);
      ctx.fillStyle = hsl(hue, 0.7, lit ? 0.6 : 0.25, alpha);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.strokeStyle = hsl(accentHue, 0.85, 0.6, 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  root.GuntherDancer = { computeScene, computePose, drawScene, MOVE_COUNT };
})(typeof globalThis !== 'undefined' ? globalThis : this);

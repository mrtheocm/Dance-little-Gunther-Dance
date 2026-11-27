// Gunther: o dançarino humano, com oito passos.
(function () {
  'use strict';
  const { register, util } = window.GuntherDancer;
  const { hsl, ellipse, strokePoints } = util;

  const V = (x, y) => ({ x, y });
  const add = (a, b) => V(a.x + b.x, a.y + b.y);
  const sub = (a, b) => V(a.x - b.x, a.y - b.y);
  const mul = (a, k) => V(a.x * k, a.y * k);
  const fromDown = (angle, side) => V(side * Math.sin(angle), -Math.cos(angle));
  const fromUp = (angle) => V(Math.sin(angle), Math.cos(angle));
  const max0 = (x) => Math.max(0, x);

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
    const { pulse, sway, swayMid, phase: ph, beatFrac } = s;
    const dip = pulse * (0.4 + 0.6 * s.bass);
    const arc = 4 * ph * (1 - ph);

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
      case 3: // pulo com punho no ar
        p.jump = (s.energy > 0.45 ? 0.9 : 0.35) * arc;
        p.lean = 0.05 * sway;
        p.armR = { angle: 2.9 - 0.5 * pulse, bend: 0.3 + 0.3 * pulse };
        p.armL = { angle: 0.5 + 0.2 * arc, bend: 0.8 };
        p.legL = { angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc };
        p.legR = { angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc };
        p.mouthOpen = 0.8 * arc;
        break;
      case 4: { // running man
        const lift = Math.sin(Math.PI * ph);
        const leftTurn = s.beatIndex % 2 === 0;
        const liftL = leftTurn ? lift : 0, liftR = leftTurn ? 0 : lift;
        p.lean = 0.08;
        p.headTilt = 0.05 * swayMid;
        p.legL = { angle: 0.1 + 0.9 * liftL, bend: 0.2 + 1.3 * liftL + 0.2 * dip };
        p.legR = { angle: 0.1 + 0.9 * liftR, bend: 0.2 + 1.3 * liftR + 0.2 * dip };
        p.armL = { angle: 0.6 + 0.5 * liftR, bend: 1.3 + 0.3 * liftR };
        p.armR = { angle: 0.6 + 0.5 * liftL, bend: 1.3 + 0.3 * liftL };
        break;
      }
      case 5: // disco: dedo apontando pra cima, alternando
        p.hipX = 0.4 * sway * amp;
        p.lean = 0.15 * sway;
        p.headTilt = 0.12 * sway;
        p.armR = { angle: 1.65 + 0.85 * sway, bend: 0.15 };
        p.armL = { angle: 1.65 - 0.85 * sway, bend: 0.15 };
        p.legL = { angle: 0.2 + 0.15 * max0(-sway), bend: 0.2 + 0.4 * max0(sway) + 0.2 * dip };
        p.legR = { angle: 0.2 + 0.15 * max0(sway), bend: 0.2 + 0.4 * max0(-sway) + 0.2 * dip };
        p.mouthOpen = 0.3 * pulse;
        break;
      case 6: // headbang
        p.headTilt = 0.4 * Math.cos(2 * Math.PI * ph) * amp;
        p.lean = -0.05 + 0.1 * pulse;
        p.armL = { angle: 0.7, bend: 1.7 - 0.3 * pulse };
        p.armR = { angle: 0.7, bend: 1.7 - 0.3 * pulse };
        p.legL = { angle: 0.3, bend: 0.3 + 0.6 * dip };
        p.legR = { angle: 0.3, bend: 0.3 + 0.6 * dip };
        p.mouthOpen = 0.9 * pulse;
        break;
      default: { // onda com os braços
        const w = 2 * Math.PI * beatFrac;
        p.hipX = 0.3 * sway * amp;
        p.lean = 0.08 * sway;
        p.headTilt = -0.1 * sway;
        p.armL = { angle: 1.55 + 0.3 * Math.sin(w), bend: 0.7 * Math.sin(w + 1.3) };
        p.armR = { angle: 1.55 + 0.3 * Math.sin(w + Math.PI), bend: 0.7 * Math.sin(w + Math.PI + 1.3) };
        p.legL = { angle: 0.15 + 0.15 * max0(-sway), bend: 0.2 + 0.3 * max0(sway) + 0.2 * dip };
        p.legR = { angle: 0.15 + 0.15 * max0(sway), bend: 0.2 + 0.3 * max0(-sway) + 0.2 * dip };
      }
    }
    p.headTilt += 0.05 * s.high * Math.sin(s.wallTime * 37);
    return p;
  }

  function drawFace(ctx, r, mouthOpen, hair, accent) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const t = (i - 2) / 2;
      const baseX = t * r * 0.65, baseY = -r * 0.72 + Math.abs(t) * r * 0.18;
      ctx.moveTo(baseX - r * 0.18, baseY);
      ctx.lineTo(baseX + t * r * 0.25, baseY - r * 0.55);
      ctx.lineTo(baseX + r * 0.18, baseY);
      ctx.closePath();
    }
    ctx.fill();
    const lensW = r * 0.62, lensH = r * 0.42, lensY = -r * 0.22;
    for (const sx of [-1, 1]) {
      const x = sx * r * 0.36 - lensW / 2, y = lensY - lensH / 2;
      util.roundRect(ctx, x, y, lensW, lensH, lensH * 0.35);
      ctx.fillStyle = hair;
      ctx.fill();
      util.roundRect(ctx, x + lensW * 0.15, y + lensH * 0.15, lensW * 0.3, lensH * 0.22, 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    strokePoints(ctx, [[-r * 0.08, lensY], [r * 0.08, lensY]], hair, r * 0.08);
    if (mouthOpen > 0.15) {
      ellipse(ctx, 0, r * 0.38, r * 0.25, r * (0.075 + 0.175 * mouthOpen), hair);
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

  register({
    id: 'gunther',
    name: 'Gunther',
    moveCount: 8,
    draw(ctx, st, s) {
      const { u } = st;
      const pose = computePose(s);
      const thigh = 1.6, shin = 1.5, torsoLen = 2.2, upperArm = 1.15, foreArm = 1.05, headR = 0.85;
      const P = (v) => st.pt(v.x, v.y);
      const legExtent = (l) => thigh * Math.cos(l.angle) + shin * Math.cos(l.angle - l.bend);
      const hip = V(pose.hipX, Math.max(legExtent(pose.legL), legExtent(pose.legR)) + pose.jump);
      const hipL = add(hip, V(-0.42, 0)), hipR = add(hip, V(0.42, 0));
      const leg = (l, h, side) => {
        const knee = add(h, mul(fromDown(l.angle, side), thigh));
        return { knee, foot: add(knee, mul(fromDown(l.angle - l.bend, side), shin)) };
      };
      const legL = leg(pose.legL, hipL, -1), legR = leg(pose.legR, hipR, 1);
      const torsoDir = fromUp(pose.lean);
      const neck = add(hip, mul(torsoDir, torsoLen));
      const shoulderCenter = add(hip, mul(torsoDir, torsoLen * 0.85));
      const perp = V(Math.cos(pose.lean), -Math.sin(pose.lean));
      const shoulderL = sub(shoulderCenter, mul(perp, 0.75)), shoulderR = add(shoulderCenter, mul(perp, 0.75));
      const arm = (a, sh, side) => {
        const elbow = add(sh, mul(fromDown(a.angle, side), upperArm));
        return { elbow, hand: add(elbow, mul(fromDown(a.angle + a.bend, side), foreArm)) };
      };
      const armL = arm(pose.armL, shoulderL, -1), armR = arm(pose.armR, shoulderR, 1);
      const head = add(neck, mul(fromUp(pose.lean + pose.headTilt), headR * 1.05));

      const skin = '#f5cca1', pants = '#29338c', outline = '#1a1426';
      const shirt = hsl(s.accentHue + 0.5, 0.7, 0.6);
      const stroke = (pts, color, w) => strokePoints(ctx, pts.map(P), color, w);

      st.shadow(pose.hipX, 2.4, pose.jump);
      const lw = 0.42 * u;
      stroke([hipL, legL.knee, legL.foot], pants, lw);
      stroke([hipR, legR.knee, legR.foot], pants, lw);
      for (const [foot, side] of [[legL.foot, -1], [legR.foot, 1]]) {
        const [x, y] = P(add(foot, V(side * 0.12, -0.05)));
        ellipse(ctx, x, y, 0.5 * u, 0.26 * u, '#ffffff');
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, 0.5 * u, 0.26 * u, 0, 0, Math.PI * 2);
        ctx.clip();
        ellipse(ctx, x, y + 0.13 * u, 0.5 * u, 0.11 * u, '#e6333f');
        ctx.restore();
      }
      stroke([add(hip, mul(torsoDir, 0.55)), sub(neck, mul(torsoDir, 0.35))], shirt, 1.55 * u);
      stroke([add(add(hip, mul(perp, -0.75)), mul(torsoDir, 0.12)), add(add(hip, mul(perp, 0.75)), mul(torsoDir, 0.12))], outline, 0.2 * u);
      for (const [limb, shoulder] of [[armL, shoulderL], [armR, shoulderR]]) {
        stroke([shoulder, limb.elbow, limb.hand], skin, lw);
        stroke([shoulder, add(shoulder, mul(sub(limb.elbow, shoulder), 0.35))], shirt, 0.62 * u);
        const [hx, hy] = P(limb.hand);
        ellipse(ctx, hx, hy, 0.32 * u, 0.32 * u, skin);
      }
      const [hx, hy] = P(head);
      ellipse(ctx, hx, hy, headR * u, headR * u, skin);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(pose.lean + pose.headTilt);
      drawFace(ctx, headR * u, pose.mouthOpen, outline, hsl(s.accentHue, 0.9, 0.55));
      ctx.restore();
    },
  });
})();

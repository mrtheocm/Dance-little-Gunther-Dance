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
      hipX: 0, lean: 0, headTilt: 0, jump: 0, mouthOpen: 0, liftL: 0, liftR: 0,
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
    const { pulse, sway, swayMid, beatFrac, hop, land } = s;
    // Joelhos dobram no kick: impacto do pouso mais um balanço suave.
    const dip = (0.6 * land + 0.4 * pulse) * (0.4 + 0.6 * s.bass);
    // Pé que sobe entre as batidas e pousa no kick seguinte.
    const liftR = s.rightStep ? hop : 0, liftL = s.rightStep ? 0 : hop;

    // Altura de cada pé (lift) é dada direto; a cinemática inversa dobra o joelho para alcançar.
    switch (s.moveIndex) {
      case 0: // passo lateral: o pé do lado para onde o corpo vai sobe e pousa no kick
        p.hipX = 0.55 * sway * amp;
        p.lean = 0.12 * sway;
        p.headTilt = -0.15 * sway;
        p.armL = { angle: 0.45 - 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse };
        p.armR = { angle: 0.45 + 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse };
        p.legL = { angle: 0.15 + 0.2 * max0(-sway) + 0.15 * liftL, bend: 0.15 + 0.3 * dip };
        p.legR = { angle: 0.15 + 0.2 * max0(sway) + 0.15 * liftR, bend: 0.15 + 0.3 * dip };
        p.liftL = 0.45 * liftL;
        p.liftR = 0.45 * liftR;
        break;
      case 1: // mãos para cima, quicando no kick
        p.hipX = 0.25 * sway * amp;
        p.lean = 0.06 * sway;
        p.headTilt = 0.1 * swayMid;
        p.armL = { angle: 2.6 + 0.2 * sway, bend: 0.25 + 0.55 * pulse };
        p.armR = { angle: 2.6 - 0.2 * sway, bend: 0.25 + 0.55 * pulse };
        p.legL = { angle: 0.2, bend: 0.2 + 0.6 * dip };
        p.legR = { angle: 0.2, bend: 0.2 + 0.6 * dip };
        p.mouthOpen = 0.6 * pulse;
        break;
      case 2: // twist, com um pé de cada vez batendo no kick
        p.hipX = 0.15 * swayMid * amp;
        p.lean = -0.1 * sway;
        p.headTilt = 0.2 * sway;
        p.armL = { angle: 1.4 + 0.4 * sway * amp, bend: 1.3 };
        p.armR = { angle: 1.4 - 0.4 * sway * amp, bend: 1.3 };
        p.legL = { angle: 0.1 + 0.1 * liftL, bend: 0.2 + 0.25 * dip };
        p.legR = { angle: 0.1 + 0.1 * liftR, bend: 0.2 + 0.25 * dip };
        p.liftL = 0.35 * liftL;
        p.liftR = 0.35 * liftR;
        break;
      case 3: // pulo com punho no ar: decola depois do kick, pousa no próximo
        p.jump = (s.energy > 0.45 ? 0.9 : 0.35) * hop;
        p.lean = 0.05 * sway;
        p.armR = { angle: 2.9 - 0.5 * land, bend: 0.3 + 0.3 * land };
        p.armL = { angle: 0.5 + 0.2 * hop, bend: 0.8 };
        p.legL = { angle: 0.15, bend: 0.15 + 0.7 * land };
        p.legR = { angle: 0.15, bend: 0.15 + 0.7 * land };
        p.liftL = p.liftR = 0.4 * hop; // encolhe as pernas no ar
        p.mouthOpen = 0.8 * hop;
        break;
      case 4: // running man: cada pé sobe e pisa no kick
        p.lean = 0.08;
        p.headTilt = 0.05 * swayMid;
        p.legL = { angle: 0.1 + 0.5 * liftL, bend: 0.2 + 0.2 * dip };
        p.legR = { angle: 0.1 + 0.5 * liftR, bend: 0.2 + 0.2 * dip };
        p.liftL = 0.9 * liftL;
        p.liftR = 0.9 * liftR;
        p.armL = { angle: 0.6 + 0.5 * liftR, bend: 1.3 + 0.3 * liftR };
        p.armR = { angle: 0.6 + 0.5 * liftL, bend: 1.3 + 0.3 * liftL };
        break;
      case 5: // disco: dedo apontando pra cima, pé batendo no kick
        p.hipX = 0.4 * sway * amp;
        p.lean = 0.15 * sway;
        p.headTilt = 0.12 * sway;
        p.armR = { angle: 1.65 + 0.85 * sway, bend: 0.15 };
        p.armL = { angle: 1.65 - 0.85 * sway, bend: 0.15 };
        p.legL = { angle: 0.2 + 0.15 * max0(-sway) + 0.1 * liftL, bend: 0.2 + 0.25 * dip };
        p.legR = { angle: 0.2 + 0.15 * max0(sway) + 0.1 * liftR, bend: 0.2 + 0.25 * dip };
        p.liftL = 0.35 * liftL;
        p.liftR = 0.35 * liftR;
        p.mouthOpen = 0.3 * pulse;
        break;
      case 6: // headbang: cabeça e joelhos descem no kick
        p.headTilt = (0.5 * land + 0.2 * pulse - 0.15) * amp;
        p.lean = -0.05 + 0.12 * land;
        p.armL = { angle: 0.7, bend: 1.7 - 0.3 * pulse };
        p.armR = { angle: 0.7, bend: 1.7 - 0.3 * pulse };
        p.legL = { angle: 0.3, bend: 0.3 + 0.6 * dip };
        p.legR = { angle: 0.3, bend: 0.3 + 0.6 * dip };
        p.mouthOpen = 0.9 * land;
        break;
      default: { // onda com os braços, passinho no kick
        const w = 2 * Math.PI * beatFrac;
        p.hipX = 0.3 * sway * amp;
        p.lean = 0.08 * sway;
        p.headTilt = -0.1 * sway;
        p.armL = { angle: 1.55 + 0.3 * Math.sin(w), bend: 0.7 * Math.sin(w + 1.3) };
        p.armR = { angle: 1.55 + 0.3 * Math.sin(w + Math.PI), bend: 0.7 * Math.sin(w + Math.PI + 1.3) };
        p.legL = { angle: 0.15 + 0.15 * max0(-sway) + 0.1 * liftL, bend: 0.2 + 0.25 * dip };
        p.legR = { angle: 0.15 + 0.15 * max0(sway) + 0.1 * liftR, bend: 0.2 + 0.25 * dip };
        p.liftL = 0.3 * liftL;
        p.liftR = 0.3 * liftR;
      }
    }
    p.headTilt += 0.05 * s.high * Math.sin(s.wallTime * 37);
    return p;
  }

  const THIGH = 1.6, SHIN = 1.5, TORSO = 2.2, UPPER_ARM = 1.15, FORE_ARM = 1.05, HEAD_R = 0.85;

  // Cinemática inversa de duas juntas: acha o joelho para o pé alcançar o alvo.
  // Das duas soluções possíveis, fica com a mais próxima do joelho da pose de base.
  function ik(hip, target, kneeHint) {
    const dx = target.x - hip.x, dy = target.y - hip.y;
    const d = Math.max(1e-6, Math.hypot(dx, dy));
    const ux = dx / d, uy = dy / d;
    const dc = Math.min(THIGH + SHIN - 1e-6, Math.max(Math.abs(THIGH - SHIN) + 1e-6, d));
    const along = (THIGH * THIGH - SHIN * SHIN + dc * dc) / (2 * dc);
    const h = Math.sqrt(Math.max(0, THIGH * THIGH - along * along));
    const bx = hip.x + ux * along, by = hip.y + uy * along;
    const k1 = V(bx - uy * h, by + ux * h), k2 = V(bx + uy * h, by - ux * h);
    const dist2 = (k) => (k.x - kneeHint.x) ** 2 + (k.y - kneeHint.y) ** 2;
    return { knee: dist2(k1) <= dist2(k2) ? k1 : k2, foot: V(hip.x + ux * dc, hip.y + uy * dc) };
  }

  // Esqueleto em coordenadas do palco (y para cima, chão em y = 0).
  function solve(pose) {
    // Pose de base de cada perna (sem levantar o pé): define onde o pé fica no chão.
    const legExtent = (l) => THIGH * Math.cos(l.angle) + SHIN * Math.cos(l.angle - l.bend);
    // O quadril fica na altura da perna mais curta, para as duas alcançarem o chão.
    const hip = V(pose.hipX, Math.min(legExtent(pose.legL), legExtent(pose.legR)) + pose.jump);
    const hipL = add(hip, V(-0.42, 0)), hipR = add(hip, V(0.42, 0));
    const leg = (l, h, side, lift) => {
      const kneeHint = add(h, mul(fromDown(l.angle, side), THIGH));
      const baseFoot = add(kneeHint, mul(fromDown(l.angle - l.bend, side), SHIN));
      // Pé no chão (y = 0) ou levantado; com pulo, o pé acompanha o corpo.
      const target = V(baseFoot.x, pose.jump + lift);
      return ik(h, target, kneeHint);
    };
    const legL = leg(pose.legL, hipL, -1, pose.liftL), legR = leg(pose.legR, hipR, 1, pose.liftR);
    const torsoDir = fromUp(pose.lean);
    const neck = add(hip, mul(torsoDir, TORSO));
    const shoulderCenter = add(hip, mul(torsoDir, TORSO * 0.85));
    const perp = V(Math.cos(pose.lean), -Math.sin(pose.lean));
    const shoulderL = sub(shoulderCenter, mul(perp, 0.75)), shoulderR = add(shoulderCenter, mul(perp, 0.75));
    const arm = (a, sh, side) => {
      const elbow = add(sh, mul(fromDown(a.angle, side), UPPER_ARM));
      return { elbow, hand: add(elbow, mul(fromDown(a.angle + a.bend, side), FORE_ARM)) };
    };
    const armL = arm(pose.armL, shoulderL, -1), armR = arm(pose.armR, shoulderR, 1);
    const head = add(neck, mul(fromUp(pose.lean + pose.headTilt), HEAD_R * 1.05));
    return { hip, hipL, hipR, legL, legR, torsoDir, neck, perp, shoulderL, shoulderR, armL, armR, head };
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
    desc: 'O dançarino da balada. Oito passos, do running man ao headbang.',
    moveCount: 8,
    pose: computePose,
    solve,
    draw(ctx, st, s) {
      const { u } = st;
      const pose = computePose(s);
      const { hip, hipL, hipR, legL, legR, torsoDir, neck, perp, shoulderL, shoulderR, armL, armR, head } = solve(pose);
      const headR = HEAD_R;
      const P = (v) => st.pt(v.x, v.y);
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

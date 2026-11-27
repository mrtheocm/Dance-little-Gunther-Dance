import SwiftUI

/// Vetor 2D em coordenadas do palco: x para a direita, y para cima.
fileprivate struct V {
    var x: Double
    var y: Double

    static func + (a: V, b: V) -> V { V(x: a.x + b.x, y: a.y + b.y) }
    static func - (a: V, b: V) -> V { V(x: a.x - b.x, y: a.y - b.y) }
    static func * (a: V, s: Double) -> V { V(x: a.x * s, y: a.y * s) }

    /// Direção medida a partir de "para baixo". `side` = +1 lado direito, -1 lado esquerdo.
    static func fromDown(_ angle: Double, side: Double) -> V { V(x: side * sin(angle), y: -cos(angle)) }
    /// Direção medida a partir de "para cima"; positivo inclina para a direita.
    static func fromUp(_ angle: Double) -> V { V(x: sin(angle), y: cos(angle)) }
}

fileprivate struct Limb {
    var angle: Double
    var bend: Double
}

fileprivate struct Pose {
    var hipX = 0.0
    var lean = 0.0
    var headTilt = 0.0
    var jump = 0.0
    var mouthOpen = 0.0
    var armL = Limb(angle: 0.3, bend: 0.5)
    var armR = Limb(angle: 0.3, bend: 0.5)
    var legL = Limb(angle: 0.12, bend: 0.2)
    var legR = Limb(angle: 0.12, bend: 0.2)
}

/// Gunther: o dançarino humano, com oito passos.
final class GuntherCharacter: DanceCharacter {
    let id = "gunther"
    let name = "Gunther"
    let moveCount = 8

    private func pose(_ f: BeatFrame) -> Pose {
        var p = Pose()
        guard f.dancing else {
            let t = f.wallTime
            p.hipX = 0.08 * sin(t * 0.9)
            p.lean = 0.03 * sin(t * 0.9)
            p.headTilt = 0.08 * sin(t * 0.5 + 1)
            p.armL = Limb(angle: 0.25 + 0.03 * sin(t * 1.1), bend: 0.35)
            p.armR = Limb(angle: 0.25 + 0.03 * sin(t * 1.1 + 2), bend: 0.35)
            return p
        }

        let amp = 0.55 + 0.45 * f.energy
        let pulse = f.pulse, sway = f.sway, swayMid = f.swayMid, ph = f.phase
        let dip = pulse * (0.4 + 0.6 * f.bass)
        let arc = 4 * ph * (1 - ph)
        let swayPos = max(0, sway), swayNeg = max(0, -sway)

        switch f.moveIndex {
        case 0: // passo lateral
            p.hipX = 0.55 * sway * amp
            p.lean = 0.12 * sway
            p.headTilt = -0.15 * sway
            p.armL = Limb(angle: 0.45 - 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse)
            p.armR = Limb(angle: 0.45 + 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse)
            p.legL = Limb(angle: 0.15 + 0.2 * swayNeg, bend: 0.15 + 0.5 * swayPos + 0.25 * dip)
            p.legR = Limb(angle: 0.15 + 0.2 * swayPos, bend: 0.15 + 0.5 * swayNeg + 0.25 * dip)

        case 1: // mãos para cima
            p.hipX = 0.25 * sway * amp
            p.lean = 0.06 * sway
            p.headTilt = 0.1 * swayMid
            p.armL = Limb(angle: 2.6 + 0.2 * sway, bend: 0.25 + 0.55 * pulse)
            p.armR = Limb(angle: 2.6 - 0.2 * sway, bend: 0.25 + 0.55 * pulse)
            p.legL = Limb(angle: 0.2, bend: 0.2 + 0.5 * dip)
            p.legR = Limb(angle: 0.2, bend: 0.2 + 0.5 * dip)
            p.mouthOpen = 0.6 * pulse

        case 2: // twist
            p.hipX = 0.15 * swayMid * amp
            p.lean = -0.1 * sway
            p.headTilt = 0.2 * sway
            p.armL = Limb(angle: 1.4 + 0.4 * sway * amp, bend: 1.3)
            p.armR = Limb(angle: 1.4 - 0.4 * sway * amp, bend: 1.3)
            p.legL = Limb(angle: 0.08, bend: 0.2 + 0.4 * swayPos + 0.2 * dip)
            p.legR = Limb(angle: 0.08, bend: 0.2 + 0.4 * swayNeg + 0.2 * dip)

        case 3: // pulo com punho no ar
            p.jump = (f.energy > 0.45 ? 0.9 : 0.35) * arc
            p.lean = 0.05 * sway
            p.armR = Limb(angle: 2.9 - 0.5 * pulse, bend: 0.3 + 0.3 * pulse)
            p.armL = Limb(angle: 0.5 + 0.2 * arc, bend: 0.8)
            p.legL = Limb(angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc)
            p.legR = Limb(angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc)
            p.mouthOpen = 0.8 * arc

        case 4: // running man
            let lift = sin(.pi * ph)
            let leftTurn = f.beatIndex % 2 == 0
            let liftL = leftTurn ? lift : 0
            let liftR = leftTurn ? 0 : lift
            p.lean = 0.08
            p.headTilt = 0.05 * swayMid
            p.legL = Limb(angle: 0.1 + 0.9 * liftL, bend: 0.2 + 1.3 * liftL + 0.2 * dip)
            p.legR = Limb(angle: 0.1 + 0.9 * liftR, bend: 0.2 + 1.3 * liftR + 0.2 * dip)
            p.armL = Limb(angle: 0.6 + 0.5 * liftR, bend: 1.3 + 0.3 * liftR)
            p.armR = Limb(angle: 0.6 + 0.5 * liftL, bend: 1.3 + 0.3 * liftL)

        case 5: // disco: dedo apontando pra cima, alternando
            p.hipX = 0.4 * sway * amp
            p.lean = 0.15 * sway
            p.headTilt = 0.12 * sway
            p.armR = Limb(angle: 1.65 + 0.85 * sway, bend: 0.15)
            p.armL = Limb(angle: 1.65 - 0.85 * sway, bend: 0.15)
            p.legL = Limb(angle: 0.2 + 0.15 * swayNeg, bend: 0.2 + 0.4 * swayPos + 0.2 * dip)
            p.legR = Limb(angle: 0.2 + 0.15 * swayPos, bend: 0.2 + 0.4 * swayNeg + 0.2 * dip)
            p.mouthOpen = 0.3 * pulse

        case 6: // headbang
            p.headTilt = 0.4 * cos(2 * .pi * ph) * amp
            p.lean = -0.05 + 0.1 * pulse
            p.armL = Limb(angle: 0.7, bend: 1.7 - 0.3 * pulse)
            p.armR = Limb(angle: 0.7, bend: 1.7 - 0.3 * pulse)
            p.legL = Limb(angle: 0.3, bend: 0.3 + 0.6 * dip)
            p.legR = Limb(angle: 0.3, bend: 0.3 + 0.6 * dip)
            p.mouthOpen = 0.9 * pulse

        default: // onda com os braços
            let w = 2 * .pi * f.beatFrac
            p.hipX = 0.3 * sway * amp
            p.lean = 0.08 * sway
            p.headTilt = -0.1 * sway
            p.armL = Limb(angle: 1.55 + 0.3 * sin(w), bend: 0.7 * sin(w + 1.3))
            p.armR = Limb(angle: 1.55 + 0.3 * sin(w + .pi), bend: 0.7 * sin(w + .pi + 1.3))
            p.legL = Limb(angle: 0.15 + 0.15 * swayNeg, bend: 0.2 + 0.3 * swayPos + 0.2 * dip)
            p.legR = Limb(angle: 0.15 + 0.15 * swayPos, bend: 0.2 + 0.3 * swayNeg + 0.2 * dip)
        }

        // Agudos fazem a cabeça tremer de leve.
        p.headTilt += 0.05 * f.high * sin(f.wallTime * 37)
        return p
    }

    func draw(_ ctx: inout GraphicsContext, stage st: Stage, frame f: BeatFrame) {
        let u = st.u
        let pose = self.pose(f)
        let thigh = 1.6, shin = 1.5, torsoLen = 2.2, upperArm = 1.15, foreArm = 1.05, headR = 0.85

        func P(_ v: V) -> CGPoint { st.pt(v.x, v.y) }
        func legExtent(_ l: Limb) -> Double { thigh * cos(l.angle) + shin * cos(l.angle - l.bend) }

        let hip = V(x: pose.hipX, y: max(legExtent(pose.legL), legExtent(pose.legR)) + pose.jump)
        let hipL = hip + V(x: -0.42, y: 0)
        let hipR = hip + V(x: 0.42, y: 0)

        func leg(_ l: Limb, from h: V, side: Double) -> (knee: V, foot: V) {
            let knee = h + V.fromDown(l.angle, side: side) * thigh
            let foot = knee + V.fromDown(l.angle - l.bend, side: side) * shin
            return (knee, foot)
        }
        let legL = leg(pose.legL, from: hipL, side: -1)
        let legR = leg(pose.legR, from: hipR, side: 1)

        let torsoDir = V.fromUp(pose.lean)
        let neck = hip + torsoDir * torsoLen
        let shoulderCenter = hip + torsoDir * (torsoLen * 0.85)
        let perp = V(x: cos(pose.lean), y: -sin(pose.lean))
        let shoulderL = shoulderCenter - perp * 0.75
        let shoulderR = shoulderCenter + perp * 0.75

        func arm(_ a: Limb, from s: V, side: Double) -> (elbow: V, hand: V) {
            let elbow = s + V.fromDown(a.angle, side: side) * upperArm
            let hand = elbow + V.fromDown(a.angle + a.bend, side: side) * foreArm
            return (elbow, hand)
        }
        let armL = arm(pose.armL, from: shoulderL, side: -1)
        let armR = arm(pose.armR, from: shoulderR, side: 1)
        let head = neck + V.fromUp(pose.lean + pose.headTilt) * (headR * 1.05)

        let skin = Color(red: 0.96, green: 0.80, blue: 0.63)
        let pants = Color(red: 0.16, green: 0.20, blue: 0.55)
        let shirt = Draw.hsl(f.accentHue + 0.5, 0.7, 0.6)
        let outline = Color(red: 0.1, green: 0.08, blue: 0.15)

        st.shadow(&ctx, x: pose.hipX, width: 2.4, lift: pose.jump)

        let limbWidth = 0.42 * u
        Draw.stroke(&ctx, [P(hipL), P(legL.knee), P(legL.foot)], pants, limbWidth)
        Draw.stroke(&ctx, [P(hipR), P(legR.knee), P(legR.foot)], pants, limbWidth)

        // Tênis.
        for (foot, side) in [(legL.foot, -1.0), (legR.foot, 1.0)] {
            let c = P(foot + V(x: side * 0.12, y: -0.05))
            let cx = Double(c.x), cy = Double(c.y)
            let shoePath = Draw.ellipsePath(cx, cy, 0.5 * u, 0.26 * u)
            ctx.fill(shoePath, with: .color(.white))
            var sole = ctx
            sole.clip(to: shoePath)
            Draw.ellipse(&sole, cx, cy + 0.13 * u, 0.5 * u, 0.11 * u, Color(red: 0.9, green: 0.2, blue: 0.25))
        }

        // Tronco e cinto.
        Draw.stroke(&ctx, [P(hip + torsoDir * 0.55), P(neck - torsoDir * 0.35)], shirt, 1.55 * u)
        let beltL = hip + perp * -0.75 + torsoDir * 0.12
        let beltR = hip + perp * 0.75 + torsoDir * 0.12
        Draw.stroke(&ctx, [P(beltL), P(beltR)], outline, 0.2 * u)

        // Braços: braço, manga e mão.
        for (limb, shoulder) in [(armL, shoulderL), (armR, shoulderR)] {
            Draw.stroke(&ctx, [P(shoulder), P(limb.elbow), P(limb.hand)], skin, limbWidth)
            let sleeveEnd = shoulder + (limb.elbow - shoulder) * 0.35
            Draw.stroke(&ctx, [P(shoulder), P(sleeveEnd)], shirt, 0.62 * u)
            let h = P(limb.hand)
            Draw.ellipse(&ctx, Double(h.x), Double(h.y), 0.32 * u, 0.32 * u, skin)
        }

        // Cabeça.
        let hc = P(head)
        let hr = headR * u
        Draw.ellipse(&ctx, Double(hc.x), Double(hc.y), hr, hr, skin)

        var face = ctx
        face.translateBy(x: hc.x, y: hc.y)
        face.rotate(by: .radians(pose.lean + pose.headTilt))
        drawFace(&face, radius: hr, mouthOpen: pose.mouthOpen, hair: outline, accent: Draw.hsl(f.accentHue, 0.9, 0.55))
    }

    private func drawFace(_ ctx: inout GraphicsContext, radius r: Double, mouthOpen: Double, hair: Color, accent: Color) {
        // Cabelo espetado.
        var hairPath = Path()
        for i in 0..<5 {
            let t = (Double(i) - 2) / 2
            let baseX = t * r * 0.65
            let baseY = -r * 0.72 + abs(t) * r * 0.18
            hairPath.move(to: CGPoint(x: baseX - r * 0.18, y: baseY))
            hairPath.addLine(to: CGPoint(x: baseX + t * r * 0.25, y: baseY - r * 0.55))
            hairPath.addLine(to: CGPoint(x: baseX + r * 0.18, y: baseY))
            hairPath.closeSubpath()
        }
        ctx.fill(hairPath, with: .color(hair))

        // Óculos escuros.
        let lensW = r * 0.62, lensH = r * 0.42, lensY = -r * 0.22
        for sx in [-1.0, 1.0] {
            let rect = CGRect(x: sx * r * 0.36 - lensW / 2, y: lensY - lensH / 2, width: lensW, height: lensH)
            ctx.fill(Path(roundedRect: rect, cornerRadius: lensH * 0.35), with: .color(hair))
            let glint = CGRect(x: rect.minX + lensW * 0.15, y: rect.minY + lensH * 0.15,
                               width: lensW * 0.3, height: lensH * 0.22)
            ctx.fill(Path(roundedRect: glint, cornerRadius: 2), with: .color(accent.opacity(0.7)))
        }
        Draw.stroke(&ctx, [CGPoint(x: -r * 0.08, y: lensY), CGPoint(x: r * 0.08, y: lensY)], hair, r * 0.08)

        // Boca.
        if mouthOpen > 0.15 {
            Draw.ellipse(&ctx, 0, r * 0.38, r * 0.25, r * (0.075 + 0.175 * mouthOpen), hair)
        } else {
            var smile = Path()
            smile.move(to: CGPoint(x: -r * 0.36, y: r * 0.32))
            smile.addQuadCurve(to: CGPoint(x: r * 0.36, y: r * 0.32), control: CGPoint(x: 0, y: r * 0.75))
            ctx.stroke(smile, with: .color(hair), style: StrokeStyle(lineWidth: r * 0.09, lineCap: .round))
        }
    }
}

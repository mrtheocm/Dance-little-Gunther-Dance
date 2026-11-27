import QuartzCore
import SwiftUI

/// Desenha o Gunther dançando, redesenhado a cada quadro da tela.
struct DancerView: View {
    @ObservedObject var state: DanceState

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let scene = DanceScene(
                    state: state,
                    now: CACurrentMediaTime(),
                    wallTime: timeline.date.timeIntervalSinceReferenceDate
                )
                scene.draw(in: &context, size: size)
            }
        }
    }
}

// MARK: - Geometria

/// Vetor 2D em coordenadas do modelo: x para a direita, y para cima, unidade = "u".
struct V {
    var x: Double
    var y: Double

    static func + (a: V, b: V) -> V { V(x: a.x + b.x, y: a.y + b.y) }
    static func - (a: V, b: V) -> V { V(x: a.x - b.x, y: a.y - b.y) }
    static func * (a: V, s: Double) -> V { V(x: a.x * s, y: a.y * s) }

    /// Direção medida a partir de "apontando para baixo". `side` = +1 lado direito, -1 lado esquerdo.
    static func fromDown(_ angle: Double, side: Double) -> V {
        V(x: side * sin(angle), y: -cos(angle))
    }

    /// Direção medida a partir de "apontando para cima"; positivo inclina para a direita.
    static func fromUp(_ angle: Double) -> V {
        V(x: sin(angle), y: cos(angle))
    }
}

struct Limb {
    /// Ângulo do segmento superior (braço ou coxa), a partir de "para baixo", positivo para fora.
    var angle: Double
    /// Dobra da articulação (cotovelo ou joelho).
    var bend: Double
}

struct Pose {
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

// MARK: - Cena

struct DanceScene {
    static let moveCount = 5

    let phase: Double
    let beatIndex: Int
    let energy: Double
    let bass: Double
    let mid: Double
    let high: Double
    let dancing: Bool
    let wallTime: Double
    let onsetGlow: Double
    let moveIndex: Int

    init(state: DanceState, now: TimeInterval, wallTime: Double) {
        self.wallTime = wallTime
        dancing = state.hasBeat && !state.isSilent

        // Pequeno adiantamento para compensar latência de captura e de tela.
        let lead = 0.04
        let period = max(state.beatPeriod, 0.2)
        let elapsed = max(0, now + lead - state.lastBeatTime)
        let beats = min(elapsed / period, 1_000_000)
        let whole = floor(beats)
        phase = beats - whole
        beatIndex = state.beatCount + Int(whole)

        energy = Double(state.level)
        bass = Double(state.bass)
        mid = Double(state.mid)
        high = Double(state.high)
        onsetGlow = max(0, 1 - (now - state.lastOnsetTime) / 0.25)
        moveIndex = (beatIndex / 8) % DanceScene.moveCount
    }

    // MARK: Pose

    var pose: Pose {
        var p = Pose()
        guard dancing else {
            // Parado, só respirando e balançando de leve.
            let t = wallTime
            p.hipX = 0.08 * sin(t * 0.9)
            p.lean = 0.03 * sin(t * 0.9)
            p.headTilt = 0.08 * sin(t * 0.5 + 1)
            p.armL = Limb(angle: 0.25 + 0.03 * sin(t * 1.1), bend: 0.35)
            p.armR = Limb(angle: 0.25 + 0.03 * sin(t * 1.1 + 2), bend: 0.35)
            return p
        }

        let amp = 0.55 + 0.45 * energy
        let b = Double(beatIndex)
        let pulse = 0.5 * (1 + cos(2 * .pi * phase))   // 1 na batida, 0 no meio
        let sway = -cos(.pi * (b + phase))              // -1...1, extremos nas batidas
        let swayMid = sin(.pi * (b + phase))            // extremos entre as batidas
        let dip = pulse * (0.4 + 0.6 * bass)            // agachadinha no grave

        switch moveIndex {
        case 0: // passo lateral
            p.hipX = 0.55 * sway * amp
            p.lean = 0.12 * sway
            p.headTilt = -0.15 * sway
            p.armL = Limb(angle: 0.45 - 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse)
            p.armR = Limb(angle: 0.45 + 0.3 * sway * amp, bend: 0.9 + 0.4 * pulse)
            p.legL = Limb(angle: 0.15 + 0.2 * max(0, -sway), bend: 0.15 + 0.5 * max(0, sway) + 0.25 * dip)
            p.legR = Limb(angle: 0.15 + 0.2 * max(0, sway), bend: 0.15 + 0.5 * max(0, -sway) + 0.25 * dip)

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
            p.legL = Limb(angle: 0.08, bend: 0.2 + 0.4 * max(0, sway) + 0.2 * dip)
            p.legR = Limb(angle: 0.08, bend: 0.2 + 0.4 * max(0, -sway) + 0.2 * dip)

        case 3: // pulo com punho no ar
            let arc = 4 * phase * (1 - phase)
            p.jump = (energy > 0.45 ? 0.9 : 0.35) * arc
            p.lean = 0.05 * sway
            p.armR = Limb(angle: 2.9 - 0.5 * pulse, bend: 0.3 + 0.3 * pulse)
            p.armL = Limb(angle: 0.5 + 0.2 * arc, bend: 0.8)
            p.legL = Limb(angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc)
            p.legR = Limb(angle: 0.15, bend: 0.15 + 0.5 * pulse + 0.4 * arc)
            p.mouthOpen = 0.8 * arc

        default: // running man
            let lift = sin(.pi * phase)
            let leftTurn = beatIndex % 2 == 0
            let liftL = leftTurn ? lift : 0
            let liftR = leftTurn ? 0 : lift
            p.lean = 0.08
            p.headTilt = 0.05 * swayMid
            p.legL = Limb(angle: 0.1 + 0.9 * liftL, bend: 0.2 + 1.3 * liftL + 0.2 * dip)
            p.legR = Limb(angle: 0.1 + 0.9 * liftR, bend: 0.2 + 1.3 * liftR + 0.2 * dip)
            p.armL = Limb(angle: 0.6 + 0.5 * liftR, bend: 1.3 + 0.3 * liftR)
            p.armR = Limb(angle: 0.6 + 0.5 * liftL, bend: 1.3 + 0.3 * liftL)
        }

        // Agudos fazem a cabeça tremer de leve.
        p.headTilt += 0.05 * high * sin(wallTime * 37)
        return p
    }

    // MARK: Desenho

    private var accentHue: Double {
        (Double((beatIndex / 4) % 8) / 8.0).truncatingRemainder(dividingBy: 1)
    }

    func draw(in ctx: inout GraphicsContext, size: CGSize) {
        let u = min(size.width / 8.5, size.height / 11.5)
        let groundY = size.height * 0.78
        let cx = size.width / 2

        drawBackground(&ctx, size: size, groundY: groundY, u: u)

        let pose = self.pose
        let thigh = 1.6, shin = 1.5, torsoLen = 2.2, upperArm = 1.15, foreArm = 1.05, headR = 0.85

        func legExtent(_ l: Limb) -> Double { thigh * cos(l.angle) + shin * cos(l.angle - l.bend) }
        let hipY = max(legExtent(pose.legL), legExtent(pose.legR)) + pose.jump
        let hip = V(x: pose.hipX, y: hipY)
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

        let painter = Painter(cx: cx, groundY: groundY, u: u)
        let skin = Color(red: 0.96, green: 0.80, blue: 0.63)
        let pants = Color(red: 0.16, green: 0.20, blue: 0.55)
        let shirt = Color(hue: (accentHue + 0.5).truncatingRemainder(dividingBy: 1), saturation: 0.7, brightness: 0.95)
        let shoe = Color.white
        let shoeDetail = Color(red: 0.9, green: 0.2, blue: 0.25)
        let outline = Color(red: 0.1, green: 0.08, blue: 0.15)

        // Sombra no chão.
        let shadowW = (2.4 - 0.8 * min(1, pose.jump)) * u
        ctx.fill(
            Path(ellipseIn: CGRect(x: cx + pose.hipX * u - shadowW / 2, y: groundY - 0.18 * u, width: shadowW, height: 0.36 * u)),
            with: .color(.black.opacity(0.45))
        )

        let limbWidth = 0.42 * u
        // Pernas.
        painter.stroke(&ctx, [hipL, legL.knee, legL.foot], color: pants, width: limbWidth)
        painter.stroke(&ctx, [hipR, legR.knee, legR.foot], color: pants, width: limbWidth)
        // Tênis.
        for (foot, side) in [(legL.foot, -1.0), (legR.foot, 1.0)] {
            let c = painter.point(foot + V(x: side * 0.12, y: -0.05))
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - 0.5 * u, y: c.y - 0.26 * u, width: 1.0 * u, height: 0.52 * u)), with: .color(shoe))
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - 0.5 * u, y: c.y + 0.02 * u, width: 1.0 * u, height: 0.22 * u)), with: .color(shoeDetail))
        }

        // Tronco (camiseta) e cinto.
        painter.stroke(&ctx, [hip + torsoDir * 0.55, neck - torsoDir * 0.35], color: shirt, width: 1.55 * u)
        painter.stroke(&ctx, [hip + perp * -0.75 + torsoDir * 0.12, hip + perp * 0.75 + torsoDir * 0.12], color: outline, width: 0.2 * u)

        // Braços: manga, braço e mão.
        for (limb, shoulder) in [(armL, shoulderL), (armR, shoulderR)] {
            painter.stroke(&ctx, [shoulder, limb.elbow, limb.hand], color: skin, width: limbWidth)
            let sleeveDir = (limb.elbow - shoulder) * 0.35
            painter.stroke(&ctx, [shoulder, shoulder + sleeveDir], color: shirt, width: 0.62 * u)
            let h = painter.point(limb.hand)
            ctx.fill(Path(ellipseIn: CGRect(x: h.x - 0.32 * u, y: h.y - 0.32 * u, width: 0.64 * u, height: 0.64 * u)), with: .color(skin))
        }

        // Cabeça.
        let hc = painter.point(head)
        let hr = headR * u
        ctx.fill(Path(ellipseIn: CGRect(x: hc.x - hr, y: hc.y - hr, width: 2 * hr, height: 2 * hr)), with: .color(skin))

        var face = ctx
        face.translateBy(x: hc.x, y: hc.y)
        face.rotate(by: .radians(pose.lean + pose.headTilt))
        drawFace(&face, radius: hr, mouthOpen: pose.mouthOpen, hair: outline, accent: Color(hue: accentHue, saturation: 0.9, brightness: 1))
    }

    private func drawFace(_ ctx: inout GraphicsContext, radius r: CGFloat, mouthOpen: Double, hair: Color, accent: Color) {
        // Cabelo espetado.
        var hairPath = Path()
        for i in 0..<5 {
            let t = (Double(i) - 2) / 2.0
            let baseX = CGFloat(t) * r * 0.65
            let baseY = -r * 0.72 + abs(CGFloat(t)) * r * 0.18
            hairPath.move(to: CGPoint(x: baseX - r * 0.18, y: baseY))
            hairPath.addLine(to: CGPoint(x: baseX + CGFloat(t) * r * 0.25, y: baseY - r * 0.55))
            hairPath.addLine(to: CGPoint(x: baseX + r * 0.18, y: baseY))
            hairPath.closeSubpath()
        }
        ctx.fill(hairPath, with: .color(hair))

        // Óculos escuros.
        let lensW = r * 0.62, lensH = r * 0.42
        let lensY = -r * 0.22
        for sx in [-1.0, 1.0] {
            let rect = CGRect(x: CGFloat(sx) * r * 0.36 - lensW / 2, y: lensY - lensH / 2, width: lensW, height: lensH)
            ctx.fill(Path(roundedRect: rect, cornerRadius: lensH * 0.35), with: .color(hair))
            let glint = CGRect(x: rect.minX + lensW * 0.15, y: rect.minY + lensH * 0.15, width: lensW * 0.3, height: lensH * 0.22)
            ctx.fill(Path(roundedRect: glint, cornerRadius: 2), with: .color(accent.opacity(0.7)))
        }
        var bridge = Path()
        bridge.move(to: CGPoint(x: -r * 0.08, y: lensY))
        bridge.addLine(to: CGPoint(x: r * 0.08, y: lensY))
        ctx.stroke(bridge, with: .color(hair), lineWidth: r * 0.08)

        // Boca.
        if mouthOpen > 0.15 {
            let w = r * 0.5, h = r * (0.15 + 0.35 * CGFloat(mouthOpen))
            ctx.fill(Path(ellipseIn: CGRect(x: -w / 2, y: r * 0.38 - h / 2, width: w, height: h)), with: .color(hair))
        } else {
            var smile = Path()
            smile.move(to: CGPoint(x: -r * 0.36, y: r * 0.32))
            smile.addQuadCurve(to: CGPoint(x: r * 0.36, y: r * 0.32), control: CGPoint(x: 0, y: r * 0.75))
            ctx.stroke(smile, with: .color(hair), style: StrokeStyle(lineWidth: r * 0.09, lineCap: .round))
        }
    }

    private func drawBackground(_ ctx: inout GraphicsContext, size: CGSize, groundY: CGFloat, u: CGFloat) {
        let rect = CGRect(origin: .zero, size: size)
        let accent = Color(hue: accentHue, saturation: 0.85, brightness: 1)
        let top = Color(red: 0.07, green: 0.03, blue: 0.14)
        let bottom = Color(red: 0.02, green: 0.02, blue: 0.05)
        ctx.fill(
            Path(rect),
            with: .linearGradient(Gradient(colors: [top, bottom]), startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height))
        )

        let pulse = dancing ? pow(1 - phase, 2.0) : 0
        let center = CGPoint(x: size.width / 2, y: size.height * 0.45)

        // Holofotes coloridos varrendo o palco.
        let sweep = sin(wallTime * 0.6) * 0.35
        let intensity = dancing ? 0.10 + 0.22 * mid + 0.15 * onsetGlow : 0.05
        let lights: [(x: CGFloat, hue: Double, angle: Double)] = [
            (size.width * 0.1, accentHue, sweep + 0.25),
            (size.width * 0.9, accentHue + 0.33, -sweep - 0.25),
            (size.width * 0.5, accentHue + 0.66, sweep * 0.5),
        ]
        var lightLayer = ctx
        lightLayer.blendMode = .screen
        for light in lights {
            let h = size.height * 1.1
            var cone = Path()
            cone.move(to: CGPoint(x: light.x, y: -20))
            cone.addLine(to: CGPoint(x: light.x + CGFloat(tan(light.angle - 0.18)) * h, y: h))
            cone.addLine(to: CGPoint(x: light.x + CGFloat(tan(light.angle + 0.18)) * h, y: h))
            cone.closeSubpath()
            let color = Color(hue: light.hue.truncatingRemainder(dividingBy: 1), saturation: 0.8, brightness: 1)
            lightLayer.fill(cone, with: .color(color.opacity(intensity)))
        }

        // Flash de grave na batida.
        if dancing {
            ctx.fill(Path(rect), with: .color(accent.opacity(0.12 * pulse * (0.3 + 0.7 * bass))))
        }

        // Anel que se expande a cada batida.
        if dancing {
            let r = (0.15 + 0.85 * phase) * max(size.width, size.height) * 0.6
            let ring = Path(ellipseIn: CGRect(x: center.x - r, y: center.y - r, width: 2 * r, height: 2 * r))
            ctx.stroke(
                ring,
                with: .color(accent.opacity(0.5 * pow(1 - phase, 2) * (0.3 + 0.7 * energy))),
                lineWidth: 1 + 8 * (1 - phase)
            )
        }

        // Pista de dança: ladrilhos que alternam a cada batida.
        let tiles = 7
        let tileW = size.width / CGFloat(tiles)
        for i in 0..<tiles {
            let lit = (i + beatIndex) % 2 == 0
            let hue = (accentHue + Double(i) * 0.07).truncatingRemainder(dividingBy: 1)
            let base = Color(hue: hue, saturation: 0.7, brightness: lit ? 0.9 : 0.35)
            let alpha = dancing ? (lit ? 0.35 + 0.4 * pulse : 0.15) : 0.12
            let tileRect = CGRect(x: CGFloat(i) * tileW + 2, y: groundY, width: tileW - 4, height: 0.7 * u)
            ctx.fill(Path(roundedRect: tileRect, cornerRadius: 4), with: .color(base.opacity(alpha)))
        }
        var floorLine = Path()
        floorLine.move(to: CGPoint(x: 0, y: groundY))
        floorLine.addLine(to: CGPoint(x: size.width, y: groundY))
        ctx.stroke(floorLine, with: .color(accent.opacity(0.35)), lineWidth: 1.5)
    }
}

/// Converte coordenadas do modelo para a tela e desenha traços arredondados.
private struct Painter {
    let cx: CGFloat
    let groundY: CGFloat
    let u: CGFloat

    func point(_ v: V) -> CGPoint {
        CGPoint(x: cx + CGFloat(v.x) * u, y: groundY - CGFloat(v.y) * u)
    }

    func stroke(_ ctx: inout GraphicsContext, _ points: [V], color: Color, width: CGFloat) {
        guard let first = points.first else { return }
        var path = Path()
        path.move(to: point(first))
        for p in points.dropFirst() { path.addLine(to: point(p)) }
        ctx.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: width, lineCap: .round, lineJoin: .round))
    }
}

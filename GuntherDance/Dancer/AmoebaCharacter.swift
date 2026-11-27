import SwiftUI

/// Glob: ameba translúcida com contorno vivo, pseudópodes e um núcleo com carinha.
final class AmoebaCharacter: DanceCharacter {
    let id = "amoeba"
    let name = "Glob"
    let summary = "Ameba gelatinosa que pulsa com o grave."
    let moveCount = 5

    private func bump(_ theta: Double, _ center: Double, _ width: Double) -> Double {
        let tau = 2 * Double.pi
        var d = (theta - center + .pi).truncatingRemainder(dividingBy: tau)
        if d < 0 { d += tau }
        d -= .pi
        return exp(-(d * d) / (2 * width * width))
    }

    func draw(_ ctx: inout GraphicsContext, stage st: Stage, frame s: BeatFrame) {
        let u = st.u
        let t = s.wallTime
        let pulse = s.pulse, sway = s.sway, swayMid = s.swayMid, ph = s.phase
        let amp = 0.6 + 0.4 * s.energy
        let arc = 4 * ph * (1 - ph)

        var cx = 0.0, sx = 1.0, sy = 1.0, jump = 0.0, roll = 0.0
        var armL = 0.0, armR = 0.0, scale = 1.0, happy = 0.0

        if s.dancing {
            switch s.moveIndex {
            case 0: // pulsar
                scale = 1 + 0.18 * pulse * (0.5 + 0.5 * s.bass) * amp
                happy = pulse
            case 1: // estica e achata
                sx = 1 + 0.35 * sway * amp
                sy = 1 - 0.28 * sway * amp
            case 2: // pseudópodes como braços
                let w = sin(.pi * s.beatFrac)
                armL = pow(max(0, w), 2) * amp
                armR = pow(max(0, -w), 2) * amp
                sy = 1 - 0.1 * pulse
                happy = 1
            case 3: // rolando de um lado pro outro
                cx = 1.8 * sin(.pi * s.beatFrac / 4) * amp
                roll = .pi * s.beatFrac / 4
                sy = 1 - 0.08 * pulse
            default: // pulo de gelatina
                jump = 0.9 * arc * amp
                sy = 1 + 0.3 * arc - 0.25 * pulse
                sx = 1 - 0.15 * arc + 0.2 * pulse
                happy = arc
            }
        } else {
            scale = 1 + 0.03 * sin(t * 1.2)
            cx = 0.1 * sin(t * 0.4)
        }

        let radius = 2.2 * scale
        let cy = radius * sy * 0.98 + jump

        // Contorno: círculo com ondulações, mais os braços.
        var outline = Path()
        let n = 96
        for i in 0..<n {
            let th = Double(i) / Double(n) * 2 * .pi
            let a = th + roll
            var w = 0.10 * sin(3 * a + t * 1.3)
            w += 0.07 * sin(5 * a - t * 2.1)
            w += 0.05 * sin(7 * a + t * 0.7)
            w += 0.06 * pulse * cos(4 * a)
            w += 0.9 * armL * bump(th, 2.35, 0.22) + 0.9 * armR * bump(th, 0.8, 0.22)
            let r = radius * (1 + w)
            let p = st.pt(cx + cos(th) * r * sx, cy + sin(th) * r * sy)
            if i == 0 { outline.move(to: p) } else { outline.addLine(to: p) }
        }
        outline.closeSubpath()

        st.shadow(&ctx, x: cx, width: 3.6 * sx, lift: jump)

        let hue = s.accentHue + 0.15
        let glow = st.pt(cx - 0.4 * sx, cy + 0.5 * sy)
        let gradient = Gradient(colors: [Draw.hsl(hue, 0.9, 0.75, 0.85), Draw.hsl(hue, 0.8, 0.45, 0.7)])
        ctx.fill(outline, with: .radialGradient(gradient, center: glow, startRadius: 0.2 * u, endRadius: radius * 1.4 * u))
        ctx.stroke(outline, with: .color(Draw.hsl(hue, 0.8, 0.35, 0.9)),
                   style: StrokeStyle(lineWidth: 0.12 * u, lineJoin: .round))

        // Organelas flutuando e um brilho na membrana.
        var inner = ctx
        inner.clip(to: outline)
        for i in 0..<5 {
            let di = Double(i)
            let a = t * 0.3 + di * 1.3 + roll
            let rr = radius * (0.45 + 0.2 * sin(t * 0.7 + di))
            let op = st.pt(cx + cos(a) * rr * sx, cy + sin(a) * rr * sy)
            Draw.ellipse(&inner, Double(op.x), Double(op.y), (0.18 + 0.05 * di) * u, (0.14 + 0.04 * di) * u,
                         Draw.hsl(hue + 0.1 * di, 0.8, 0.6, 0.5))
        }
        let shine = st.pt(cx - 0.9 * sx, cy + 1.1 * sy)
        Draw.ellipse(&inner, Double(shine.x), Double(shine.y), 0.5 * u, 0.25 * u, .white.opacity(0.35), rotation: -0.6)

        // Núcleo com carinha, que fica um pouco para trás no movimento.
        let np = st.pt(cx + 0.45 * sway * sx, cy + 0.25 * swayMid * sy - 0.1 * sy)
        let kx = Double(np.x), ky = Double(np.y)
        let nr = 0.8 * u
        Draw.ellipse(&ctx, kx, ky, nr * sx, nr * sy, Draw.hsl(hue, 0.7, 0.3, 0.95))
        let eyeY = ky - 0.15 * nr
        for side in [-1.0, 1.0] {
            let ex = kx + side * 0.38 * nr
            if happy > 0.6 {
                var smileEye = Path()
                smileEye.move(to: CGPoint(x: ex - 0.2 * nr, y: eyeY + 0.1 * nr))
                smileEye.addQuadCurve(to: CGPoint(x: ex + 0.2 * nr, y: eyeY + 0.1 * nr),
                                      control: CGPoint(x: ex, y: eyeY - 0.3 * nr))
                ctx.stroke(smileEye, with: .color(.white), style: StrokeStyle(lineWidth: 0.09 * nr, lineCap: .round))
            } else {
                Draw.ellipse(&ctx, ex, eyeY, 0.2 * nr, 0.24 * nr, .white)
                Draw.ellipse(&ctx, ex + sway * 0.06 * nr, eyeY + 0.04 * nr, 0.1 * nr, 0.12 * nr,
                             Color(red: 0.1, green: 0.08, blue: 0.15))
            }
        }
        var mouth = Path()
        mouth.move(to: CGPoint(x: kx - 0.25 * nr, y: ky + 0.3 * nr))
        mouth.addQuadCurve(to: CGPoint(x: kx + 0.25 * nr, y: ky + 0.3 * nr),
                           control: CGPoint(x: kx, y: ky + (0.5 + 0.25 * happy) * nr))
        ctx.stroke(mouth, with: .color(.white), style: StrokeStyle(lineWidth: 0.08 * nr, lineCap: .round))
    }
}

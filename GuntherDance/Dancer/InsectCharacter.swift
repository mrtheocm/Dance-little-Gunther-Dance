import SwiftUI

/// Zig: inseto tipo louva-a-deus, seis pernas em onda, antenas e braços dobrados.
final class InsectCharacter: DanceCharacter {
    let id = "insect"
    let name = "Zig"
    let moveCount = 5

    func draw(_ ctx: inout GraphicsContext, stage st: Stage, frame s: BeatFrame) {
        let u = st.u
        let pulse = s.pulse, sway = s.sway, swayMid = s.swayMid, ph = s.phase
        let amp = 0.6 + 0.4 * s.energy
        let arc = 4 * ph * (1 - ph)
        let t = s.wallTime

        var hipX = 0.0, dip = 0.0, jump = 0.0, wag = 0.0, headTilt = 0.0
        var legSpeed = 0.5, legLift = 0.5, tuck = 0.0
        var armA = 1.0, armBend = 2.4

        if !s.dancing {
            hipX = 0.05 * sin(t * 0.8)
            wag = 0.08 * sin(t * 1.1)
            headTilt = 0.1 * sin(t * 0.6)
            legSpeed = 0
            legLift = 0
            armBend = 2.4 + 0.1 * sin(t * 1.3)
        } else {
            switch s.moveIndex {
            case 0: // onda nas pernas, bracinhos rezando
                dip = 0.25 * pulse * amp
                armBend = 2.4 - 0.6 * pulse
                wag = 0.1 * swayMid
            case 1: // corridinha de lado
                hipX = 0.9 * sway * amp
                legSpeed = 1
                legLift = 0.7
                dip = 0.15 * pulse
                headTilt = -0.15 * sway
                armA = 0.8
                armBend = 2.0 + 0.3 * swayMid
            case 2: // braços pra cima
                armA = 2.6 + 0.15 * sway
                armBend = 0.3 + 0.5 * pulse
                dip = 0.3 * pulse * amp
                wag = 0.15 * sway
            case 3: // rebolado do abdômen
                wag = 0.45 * swayMid * amp
                headTilt = -0.25 * swayMid
                hipX = 0.2 * sway
                dip = 0.1 * pulse
                armA = 1.4
                armBend = 1.6 + 0.4 * sway
            default: // pulinho com pernas encolhidas
                jump = 0.8 * arc * amp
                tuck = arc
                dip = 0.3 * pulse
                armA = 1.2 + 1.2 * arc
                armBend = 2.2 - 1.5 * arc
                legLift = 0
            }
        }

        let baseY = jump - dip
        let body = Draw.hsl(0.38, 0.55, 0.55)
        let bodyDark = Draw.hsl(0.38, 0.6, 0.32)
        let legColor = Draw.hsl(0.38, 0.5, 0.4)
        let dark = Color(red: 0.09, green: 0.14, blue: 0.13)

        st.shadow(&ctx, x: hipX, width: 2.8, lift: jump)

        // Pernas: três pares, cada uma com fase própria.
        let attach: [(Double, Double)] = [(0.7, 3.0), (0.8, 2.3), (0.7, 1.6)]
        for k in 0..<3 {
            for side in [-1.0, 1.0] {
                let raw = s.beatFrac * legSpeed + Double(k) / 3 + (side > 0 ? 0.5 : 0)
                let legPhase = raw - floor(raw)
                let wave = sin(2 * .pi * legPhase)
                let lift = legLift * pow(max(0, wave), 2) + 0.9 * tuck
                let ax = hipX + side * attach[k].0
                let ay = attach[k].1 + baseY
                let kneeX = ax + side * (1.0 + 0.25 * Double(k)) * (1 - 0.4 * tuck)
                let kneeY = ay + 0.55 + 0.3 * lift
                let footX = kneeX + side * (0.55 - 0.2 * tuck) + 0.15 * wave * side
                let footY = max(0, lift + 0.6 * tuck + (jump > 0 ? jump * 0.5 : 0))
                Draw.stroke(&ctx, [st.pt(ax, ay), st.pt(kneeX, kneeY), st.pt(footX, footY)], legColor, 0.17 * u)
                let fp = st.pt(footX, footY)
                Draw.ellipse(&ctx, Double(fp.x), Double(fp.y), 0.12 * u, 0.1 * u, dark)
            }
        }

        // Abdômen listrado.
        let abPoint = st.pt(hipX - sin(wag) * 0.6, 1.5 + baseY - 0.15)
        var abdomen = ctx
        abdomen.translateBy(x: abPoint.x, y: abPoint.y)
        abdomen.rotate(by: .radians(-wag))
        let abPath = Draw.ellipsePath(0, 0, 1.0 * u, 1.3 * u)
        abdomen.fill(abPath, with: .color(body))
        abdomen.clip(to: abPath)
        for i in -1...1 {
            let stripe = CGRect(x: -1.2 * u, y: (Double(i) * 0.65 + 0.2) * u, width: 2.4 * u, height: 0.22 * u)
            abdomen.fill(Path(stripe), with: .color(bodyDark))
        }

        // Tórax.
        let tp = st.pt(hipX, 3.2 + baseY)
        Draw.ellipse(&ctx, Double(tp.x), Double(tp.y), 0.85 * u, 0.8 * u, body)
        Draw.ellipse(&ctx, Double(tp.x) - 0.25 * u, Double(tp.y) - 0.25 * u, 0.3 * u, 0.2 * u, .white.opacity(0.25))

        // Braços raptoriais.
        for side in [-1.0, 1.0] {
            let sx = hipX + side * 0.7, sy = 3.55 + baseY
            let ex = sx + side * sin(armA) * 0.9
            let ey = sy - cos(armA) * 0.9
            let hx = ex + side * sin(armA + armBend) * 0.85
            let hy = ey - cos(armA + armBend) * 0.85
            Draw.stroke(&ctx, [st.pt(sx, sy), st.pt(ex, ey), st.pt(hx, hy)], bodyDark, 0.22 * u)
            let hp = st.pt(hx, hy)
            Draw.ellipse(&ctx, Double(hp.x), Double(hp.y), 0.16 * u, 0.16 * u, dark)
        }

        // Cabeça, olhos e antenas.
        let headPoint = st.pt(hipX + sin(headTilt) * 0.3, 4.6 + baseY)
        var head = ctx
        head.translateBy(x: headPoint.x, y: headPoint.y)
        head.rotate(by: .radians(headTilt))
        Draw.ellipse(&head, 0, 0, 0.75 * u, 0.65 * u, body)
        for side in [-1.0, 1.0] {
            Draw.ellipse(&head, side * 0.45 * u, -0.08 * u, 0.3 * u, 0.33 * u, dark)
            Draw.ellipse(&head, side * 0.45 * u - 0.08 * u, -0.18 * u, 0.1 * u, 0.12 * u, .white.opacity(0.8))
        }
        var mouth = Path()
        mouth.move(to: CGPoint(x: -0.18 * u, y: 0.3 * u))
        mouth.addQuadCurve(to: CGPoint(x: 0.18 * u, y: 0.3 * u), control: CGPoint(x: 0, y: (0.45 + 0.2 * pulse) * u))
        head.stroke(mouth, with: .color(dark), lineWidth: 0.06 * u)

        let wiggle = 0.3 * swayMid + 0.15 * sin(t * 5)
        let tipColor = Draw.hsl(s.accentHue, 0.9, 0.6)
        for side in [-1.0, 1.0] {
            let tip = CGPoint(x: (side * 1.3 + wiggle) * u, y: -2.0 * u)
            var antenna = Path()
            antenna.move(to: CGPoint(x: side * 0.3 * u, y: -0.55 * u))
            antenna.addQuadCurve(to: tip, control: CGPoint(x: side * 1.0 * u, y: -1.4 * u))
            head.stroke(antenna, with: .color(bodyDark), lineWidth: 0.08 * u)
            Draw.ellipse(&head, Double(tip.x), Double(tip.y), 0.12 * u, 0.12 * u, tipColor)
        }
    }
}

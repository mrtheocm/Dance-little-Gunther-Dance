import SwiftUI

/// Cardume e Enxame: muitos bichinhos dançando em formação.
/// Cada um persegue seu lugar na formação com uma molinha, o que dá um movimento orgânico.
final class SwarmCharacter: DanceCharacter {
    enum Kind { case fish, bees }

    private struct Agent {
        var x: Double
        var y: Double
        var vx = 0.0
        var vy = 0.0
        var heading = 0.0
    }

    let kind: Kind
    let id: String
    let name: String
    let summary: String
    let moveCount = 5
    private let count: Int
    private var agents: [Agent] = []
    private var lastTime: Double?

    init(kind: Kind) {
        self.kind = kind
        switch kind {
        case .fish:
            id = "fish"
            name = "Cardume"
            summary = "Quatorze peixes nadando em formação no ritmo."
            count = 14
        case .bees:
            id = "bees"
            name = "Enxame"
            summary = "Doze abelhas que zumbem mais forte com os agudos."
            count = 12
        }
        for i in 0..<count {
            let a = Double(i) / Double(count) * 2 * .pi
            agents.append(Agent(x: cos(a) * 2.3, y: 3.3 + sin(a) * 1.6))
        }
    }

    /// Lugar de cada bichinho na formação atual, em coordenadas do palco.
    private func target(_ q: Double, _ f: BeatFrame) -> (Double, Double) {
        let tau = 2 * Double.pi
        guard f.dancing else {
            let w = f.wallTime * 0.5 + q * tau
            return (2.3 * cos(w), 3.3 + 0.9 * sin(2 * w))
        }
        let shift = 0.3 * f.sway
        switch f.moveIndex {
        case 0: // roda que gira uma volta a cada 8 batidas
            let a = q * tau + tau * f.beatFrac / 8
            let r = 2.0 + 0.45 * f.pulse
            return (cos(a) * r * 1.15 + shift, 3.3 + sin(a) * r * 0.8)
        case 1: // onda
            return ((q - 0.5) * 6.8 + shift, 3.3 + sin(q * tau * 2 - .pi * f.beatFrac))
        case 2: // oito deitado
            let a = q * tau + tau * f.beatFrac / 8
            return (2.8 * sin(a) + shift, 3.3 + 1.4 * sin(2 * a))
        case 3: // colunas quicando
            return ((q - 0.5) * 6.8 + shift, 0.8 + 2.8 * abs(sin(.pi * (f.beatFrac + q))))
        default: // coração pulsando
            let a = q * tau
            let k = 0.14 * (1 + 0.18 * f.pulse)
            let x = 16 * pow(sin(a), 3)
            var y = 13 * cos(a) - 5 * cos(2 * a)
            y -= 2 * cos(3 * a) + cos(4 * a)
            return (x * k + shift, 3.4 + y * k)
        }
    }

    func draw(_ ctx: inout GraphicsContext, stage st: Stage, frame f: BeatFrame) {
        let dt = lastTime.map { min(0.05, max(0, f.wallTime - $0)) } ?? 0.016
        lastTime = f.wallTime

        let stiffness = 45.0, damping = 9.0
        for i in agents.indices {
            let (tx, ty) = target(Double(i) / Double(count), f)
            var a = agents[i]
            a.vx += ((tx - a.x) * stiffness - a.vx * damping) * dt
            a.vy += ((ty - a.y) * stiffness - a.vy * damping) * dt
            a.x += a.vx * dt
            a.y += a.vy * dt
            if hypot(a.vx, a.vy) > 0.3 {
                var d = atan2(a.vy, a.vx) - a.heading
                d = (d + .pi).truncatingRemainder(dividingBy: 2 * .pi)
                if d < 0 { d += 2 * .pi }
                d -= .pi
                a.heading += d * min(1, dt * 10)
            }
            agents[i] = a
        }

        // Os mais altos primeiro, para dar sensação de profundidade.
        let order = agents.indices.sorted { agents[$0].y > agents[$1].y }
        for i in order {
            switch kind {
            case .fish: drawFish(&ctx, st, f, agents[i], i)
            case .bees: drawBee(&ctx, st, f, agents[i], i)
            }
        }
    }

    private func drawFish(_ ctx: inout GraphicsContext, _ st: Stage, _ f: BeatFrame, _ a: Agent, _ i: Int) {
        let u = st.u
        let hue = f.accentHue + Double(i) * 0.035 + 0.5
        let color = Draw.hsl(hue, 0.8, 0.6)
        let dark = Draw.hsl(hue, 0.8, 0.35)
        let wag = 0.55 * sin(f.wallTime * 13 + Double(i) * 1.7) * (0.5 + 0.5 * f.energy)

        let p = st.pt(a.x, a.y)
        var c = ctx
        c.translateBy(x: p.x, y: p.y)
        c.rotate(by: .radians(-a.heading))
        var tail = Path()
        tail.move(to: CGPoint(x: -0.22 * u, y: 0))
        tail.addLine(to: CGPoint(x: -0.5 * u, y: (-0.22 + 0.12 * wag) * u))
        tail.addLine(to: CGPoint(x: -0.5 * u, y: (0.22 + 0.12 * wag) * u))
        tail.closeSubpath()
        c.fill(tail, with: .color(dark))
        Draw.ellipse(&c, 0, 0, 0.32 * u, 0.17 * u, color)
        Draw.ellipse(&c, 0.02 * u, 0.09 * u, 0.1 * u, 0.06 * u, dark, rotation: 0.3)
        Draw.ellipse(&c, 0.17 * u, -0.04 * u, 0.055 * u, 0.055 * u, .white)
        Draw.ellipse(&c, 0.18 * u, -0.04 * u, 0.03 * u, 0.03 * u, Color(red: 0.1, green: 0.08, blue: 0.15))
    }

    private func drawBee(_ ctx: inout GraphicsContext, _ st: Stage, _ f: BeatFrame, _ a: Agent, _ i: Int) {
        let u = st.u
        let di = Double(i)
        let jitter = 0.06 * (0.3 + f.high) * (f.dancing ? 1 : 0.3)
        let jx = jitter * sin(f.wallTime * 53 + di * 2.1)
        let jy = jitter * cos(f.wallTime * 47 + di * 1.3)
        let flap = sin(f.wallTime * 70 + di)
        let dark = Color(red: 0.1, green: 0.08, blue: 0.15)
        let wing = Color.white.opacity(0.55)

        let p = st.pt(a.x + jx, a.y + jy)
        var c = ctx
        c.translateBy(x: p.x, y: p.y)
        // Vira para o lado em que está indo, sem capotar.
        let facing: Double = cos(a.heading) >= 0 ? 1 : -1
        c.scaleBy(x: facing, y: 1)
        c.rotate(by: .radians(-sin(a.heading) * 0.35))

        Draw.ellipse(&c, -0.12 * u, -0.22 * u, 0.2 * u, (0.08 + 0.06 * flap) * u, wing, rotation: -0.5)
        Draw.ellipse(&c, 0.08 * u, -0.22 * u, 0.2 * u, (0.08 - 0.06 * flap) * u, wing, rotation: 0.5)
        let bodyPath = Draw.ellipsePath(0, 0, 0.3 * u, 0.19 * u)
        c.fill(bodyPath, with: .color(Color(red: 1, green: 0.82, blue: 0.25)))
        var stripes = c
        stripes.clip(to: bodyPath)
        stripes.fill(Path(CGRect(x: -0.12 * u, y: -0.3 * u, width: 0.08 * u, height: 0.6 * u)), with: .color(dark))
        stripes.fill(Path(CGRect(x: 0.04 * u, y: -0.3 * u, width: 0.08 * u, height: 0.6 * u)), with: .color(dark))
        Draw.ellipse(&c, 0.3 * u, -0.02 * u, 0.12 * u, 0.12 * u, dark)
        Draw.ellipse(&c, 0.33 * u, -0.05 * u, 0.035 * u, 0.035 * u, .white)
        var stinger = Path()
        stinger.move(to: CGPoint(x: -0.28 * u, y: 0))
        stinger.addLine(to: CGPoint(x: -0.4 * u, y: 0.04 * u))
        stinger.addLine(to: CGPoint(x: -0.28 * u, y: 0.07 * u))
        c.fill(stinger, with: .color(dark))
    }
}

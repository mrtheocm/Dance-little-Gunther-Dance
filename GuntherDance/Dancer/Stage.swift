import QuartzCore
import SwiftUI

/// Tudo o que um personagem precisa saber sobre a música num quadro de animação.
struct BeatFrame {
    let phase: Double
    let beatIndex: Int
    let beatFrac: Double
    let energy: Double
    let bass: Double
    let mid: Double
    let high: Double
    let dancing: Bool
    let wallTime: Double
    let onsetGlow: Double
    let moveIndex: Int
    /// 1 na batida, 0 no meio.
    let pulse: Double
    /// -1...1 com extremos nas batidas (alterna a cada batida).
    let sway: Double
    /// -1...1 com extremos entre as batidas.
    let swayMid: Double
    let accentHue: Double

    init(state: DanceState, now: TimeInterval, wallTime: Double, lead: Double, moveCount: Int) {
        self.init(
            hasBeat: state.hasBeat, isSilent: state.isSilent, beatPeriod: state.beatPeriod,
            lastBeatTime: state.lastBeatTime, beatCount: state.beatCount,
            level: Double(state.level), bass: Double(state.bass), mid: Double(state.mid), high: Double(state.high),
            lastOnsetTime: state.lastOnsetTime, now: now, wallTime: wallTime, lead: lead, moveCount: moveCount
        )
    }

    /// Ritmo de demonstração a 120 BPM, para as miniaturas dançarem mesmo sem música.
    init(demoAt now: TimeInterval, wallTime: Double, moveCount: Int) {
        let period = 0.5
        let whole = floor(now / period)
        let pulse = 0.5 * (1 + cos(2 * .pi * (now / period - whole)))
        self.init(
            hasBeat: true, isSilent: false, beatPeriod: period,
            lastBeatTime: whole * period, beatCount: Int(whole),
            level: 0.65, bass: 0.4 + 0.5 * pulse, mid: 0.5, high: 0.4,
            lastOnsetTime: whole * period, now: now, wallTime: wallTime, lead: 0, moveCount: moveCount
        )
    }

    private init(hasBeat: Bool, isSilent: Bool, beatPeriod: TimeInterval, lastBeatTime: TimeInterval, beatCount: Int,
                 level: Double, bass: Double, mid: Double, high: Double, lastOnsetTime: TimeInterval,
                 now: TimeInterval, wallTime: Double, lead: Double, moveCount: Int) {
        dancing = hasBeat && !isSilent
        let period = max(beatPeriod, 0.2)
        let elapsed = max(0, now + lead - lastBeatTime)
        let beats = min(elapsed / period, 1_000_000)
        let whole = floor(beats)
        phase = beats - whole
        beatIndex = beatCount + Int(whole)
        beatFrac = Double(beatIndex) + phase
        energy = level
        self.bass = bass
        self.mid = mid
        self.high = high
        self.wallTime = wallTime
        onsetGlow = max(0, 1 - (now - lastOnsetTime) / 0.25)
        moveIndex = (beatIndex / 8) % max(1, moveCount)
        pulse = dancing ? 0.5 * (1 + cos(2 * .pi * phase)) : 0
        sway = dancing ? -cos(.pi * beatFrac) : 0
        swayMid = dancing ? sin(.pi * beatFrac) : 0
        accentHue = Double((beatIndex / 4) % 8) / 8
    }
}

/// Palco: origem no chão, no centro; x para a direita, y para cima, em unidades `u`.
struct Stage {
    let size: CGSize
    let u: Double
    let groundY: Double
    let cx: Double

    init(size: CGSize) {
        self.size = size
        u = min(Double(size.width) / 8.5, Double(size.height) / 11.5)
        groundY = Double(size.height) * 0.78
        cx = Double(size.width) / 2
    }

    func pt(_ x: Double, _ y: Double) -> CGPoint {
        CGPoint(x: cx + x * u, y: groundY - y * u)
    }

    func shadow(_ ctx: inout GraphicsContext, x: Double, width w: Double, lift: Double = 0) {
        let rx = w / 2 * (1 - 0.35 * min(1, lift)) * u
        let c = pt(x, 0)
        Draw.ellipse(&ctx, Double(c.x), Double(c.y), rx, 0.18 * u, .black.opacity(0.45))
    }
}

protocol DanceCharacter: AnyObject {
    var id: String { get }
    var name: String { get }
    var summary: String { get }
    var moveCount: Int { get }
    func draw(_ ctx: inout GraphicsContext, stage: Stage, frame: BeatFrame)
}

/// Lista de personagens e o escolhido, salvo entre aberturas do app.
final class CharacterStore: ObservableObject {
    let characters: [any DanceCharacter]
    @Published private(set) var index: Int

    init() {
        let list: [any DanceCharacter] = [
            GuntherCharacter(),
            OddityCharacter(),
            InsectCharacter(),
            AmoebaCharacter(),
            SwarmCharacter(kind: .fish),
            SwarmCharacter(kind: .bees),
        ]
        let saved = UserDefaults.standard.string(forKey: "character")
        characters = list
        index = list.firstIndex { $0.id == saved } ?? 0
    }

    var current: any DanceCharacter { characters[index] }

    func select(_ i: Int) {
        let n = characters.count
        index = ((i % n) + n) % n
        UserDefaults.standard.set(current.id, forKey: "character")
    }

    func next() { select(index + 1) }
    func previous() { select(index - 1) }
}

// MARK: - Utilidades de desenho

enum Draw {
    /// Cor em HSL (mesma convenção da versão web).
    static func hsl(_ h: Double, _ s: Double, _ l: Double, _ a: Double = 1) -> Color {
        let hh = h - floor(h)
        let c = (1 - abs(2 * l - 1)) * s
        let hp = hh * 6
        let x = c * (1 - abs(hp.truncatingRemainder(dividingBy: 2) - 1))
        var r = 0.0, g = 0.0, b = 0.0
        if hp < 1 { r = c; g = x } else if hp < 2 { r = x; g = c } else if hp < 3 { g = c; b = x }
        else if hp < 4 { g = x; b = c } else if hp < 5 { r = x; b = c } else { r = c; b = x }
        let m = l - c / 2
        return Color(red: r + m, green: g + m, blue: b + m, opacity: a)
    }

    static func ellipsePath(_ x: Double, _ y: Double, _ rx: Double, _ ry: Double, rotation: Double = 0) -> Path {
        let base = Path(ellipseIn: CGRect(x: -rx, y: -ry, width: 2 * rx, height: 2 * ry))
        let t = CGAffineTransform(translationX: x, y: y).rotated(by: rotation)
        return base.applying(t)
    }

    static func ellipse(_ ctx: inout GraphicsContext, _ x: Double, _ y: Double, _ rx: Double, _ ry: Double,
                        _ color: Color, rotation: Double = 0) {
        ctx.fill(ellipsePath(x, y, rx, ry, rotation: rotation), with: .color(color))
    }

    static func stroke(_ ctx: inout GraphicsContext, _ points: [CGPoint], _ color: Color, _ width: Double) {
        guard let first = points.first else { return }
        var path = Path()
        path.move(to: first)
        for p in points.dropFirst() { path.addLine(to: p) }
        ctx.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: width, lineCap: .round, lineJoin: .round))
    }

    static func background(_ ctx: inout GraphicsContext, stage st: Stage, frame f: BeatFrame) {
        let size = st.size
        let w = Double(size.width), h = Double(size.height)
        let rect = CGRect(origin: .zero, size: size)
        let top = Color(red: 0.07, green: 0.03, blue: 0.14)
        let bottom = Color(red: 0.02, green: 0.02, blue: 0.05)
        ctx.fill(Path(rect), with: .linearGradient(Gradient(colors: [top, bottom]),
                                                   startPoint: .zero, endPoint: CGPoint(x: 0, y: h)))

        let pulse = f.dancing ? pow(1 - f.phase, 2) : 0
        let sweep = sin(f.wallTime * 0.6) * 0.35
        let intensity = f.dancing ? 0.10 + 0.22 * f.mid + 0.15 * f.onsetGlow : 0.05
        let lights: [(x: Double, hue: Double, angle: Double)] = [
            (w * 0.1, f.accentHue, sweep + 0.25),
            (w * 0.9, f.accentHue + 0.33, -sweep - 0.25),
            (w * 0.5, f.accentHue + 0.66, sweep * 0.5),
        ]
        var lightLayer = ctx
        lightLayer.blendMode = .screen
        for light in lights {
            let lh = h * 1.1
            var cone = Path()
            cone.move(to: CGPoint(x: light.x, y: -20))
            cone.addLine(to: CGPoint(x: light.x + tan(light.angle - 0.18) * lh, y: lh))
            cone.addLine(to: CGPoint(x: light.x + tan(light.angle + 0.18) * lh, y: lh))
            cone.closeSubpath()
            lightLayer.fill(cone, with: .color(hsl(light.hue, 0.8, 0.55, intensity)))
        }

        if f.dancing {
            ctx.fill(Path(rect), with: .color(hsl(f.accentHue, 0.85, 0.6, 0.12 * pulse * (0.3 + 0.7 * f.bass))))
            let r = (0.15 + 0.85 * f.phase) * max(w, h) * 0.6
            let ring = Path(ellipseIn: CGRect(x: w / 2 - r, y: h * 0.45 - r, width: 2 * r, height: 2 * r))
            let ringAlpha = 0.5 * pow(1 - f.phase, 2) * (0.3 + 0.7 * f.energy)
            ctx.stroke(ring, with: .color(hsl(f.accentHue, 0.85, 0.6, ringAlpha)), lineWidth: 1 + 8 * (1 - f.phase))
        }

        let tiles = 7
        let tileW = w / Double(tiles)
        for i in 0..<tiles {
            let lit = (i + f.beatIndex) % 2 == 0
            let alpha = f.dancing ? (lit ? 0.35 + 0.4 * pulse : 0.15) : 0.12
            let tileRect = CGRect(x: Double(i) * tileW + 2, y: st.groundY, width: tileW - 4, height: 0.7 * st.u)
            let color = hsl(f.accentHue + Double(i) * 0.07, 0.7, lit ? 0.6 : 0.25, alpha)
            ctx.fill(Path(roundedRect: tileRect, cornerRadius: 4), with: .color(color))
        }
        var floorLine = Path()
        floorLine.move(to: CGPoint(x: 0, y: st.groundY))
        floorLine.addLine(to: CGPoint(x: w, y: st.groundY))
        ctx.stroke(floorLine, with: .color(hsl(f.accentHue, 0.85, 0.6, 0.35)), lineWidth: 1.5)
    }
}

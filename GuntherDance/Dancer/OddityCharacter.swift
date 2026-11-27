import CoreGraphics
import SwiftUI

fileprivate enum EyeKind { case normal, happy, star, sleep, wide }
fileprivate enum MouthKind { case smile, open, o, flat }

/// Estado de um quadro do Oddity: deformação do corpo e expressão do rosto.
fileprivate struct OddFrame {
    var sx = 1.0, sy = 1.0, rot = 0.0, jump = 0.0, hipX = 0.0, hornWiggle = 0.0
    var lookX = 0.0, lookY = 0.0, feetL = 0.0, feetR = 0.0
    var eyeL = EyeKind.normal, eyeR = EyeKind.normal
    var mouth = MouthKind.smile, mouthScale = 1.0
    var exclaim = false, sparkle = 0.0, zzz = false, t = 0.0
}

/// Forma vetorial testada pixel a pixel, com caixa delimitadora para pular rápido.
fileprivate struct PixShape {
    enum Kind {
        case ellipse(cx: Double, cy: Double, rx: Double, ry: Double)
        case capsule(x1: Double, y1: Double, x2: Double, y2: Double, r: Double)
        case poly([(Double, Double)])
    }

    let kind: Kind
    let color: UInt32
    let minX: Double, minY: Double, maxX: Double, maxY: Double

    static func ellipse(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, _ color: UInt32) -> PixShape {
        PixShape(kind: .ellipse(cx: cx, cy: cy, rx: rx, ry: ry), color: color,
                 minX: cx - rx, minY: cy - ry, maxX: cx + rx, maxY: cy + ry)
    }

    static func capsule(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double, _ r: Double, _ color: UInt32) -> PixShape {
        PixShape(kind: .capsule(x1: x1, y1: y1, x2: x2, y2: y2, r: r), color: color,
                 minX: min(x1, x2) - r, minY: min(y1, y2) - r, maxX: max(x1, x2) + r, maxY: max(y1, y2) + r)
    }

    static func poly(_ pts: [(Double, Double)], _ color: UInt32) -> PixShape {
        let xs = pts.map { $0.0 }
        let ys = pts.map { $0.1 }
        return PixShape(kind: .poly(pts), color: color,
                        minX: xs.min() ?? 0, minY: ys.min() ?? 0, maxX: xs.max() ?? 0, maxY: ys.max() ?? 0)
    }

    func contains(_ x: Double, _ y: Double) -> Bool {
        if x < minX || x > maxX || y < minY || y > maxY { return false }
        switch kind {
        case let .ellipse(cx, cy, rx, ry):
            let dx = (x - cx) / rx
            let dy = (y - cy) / ry
            return dx * dx + dy * dy <= 1
        case let .capsule(x1, y1, x2, y2, r):
            let vx = x2 - x1, vy = y2 - y1
            let len2 = max(vx * vx + vy * vy, 1e-9)
            let t = min(1, max(0, ((x - x1) * vx + (y - y1) * vy) / len2))
            let dx = x - (x1 + vx * t)
            let dy = y - (y1 + vy * t)
            return dx * dx + dy * dy <= r * r
        case let .poly(p):
            var inside = false
            var j = p.count - 1
            for i in 0..<p.count {
                let (xi, yi) = p[i]
                let (xj, yj) = p[j]
                if (yi > y) != (yj > y) {
                    let crossX = (xj - xi) * (y - yi) / (yj - yi) + xi
                    if x < crossX { inside.toggle() }
                }
                j = i
            }
            return inside
        }
    }
}

/// Cores no formato do buffer: bytes R, G, B, A na memória.
fileprivate func rgb(_ hex: UInt32) -> UInt32 {
    let r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff
    return 0xff00_0000 | (b << 16) | (g << 8) | r
}

fileprivate enum Pal {
    static let white = rgb(0xffffff)
    static let halo = rgb(0xdcd7ea)
    static let yellow = rgb(0xffd93d)
    static let yellowDark = rgb(0xd9ad00)
    static let purple = rgb(0xa259ff)
    static let purpleDark = rgb(0x7a3fe0)
    static let dark = rgb(0x2b2838)
    static let pink = rgb(0xf4a9cf)
    static let lavender = rgb(0xcdb4ff)
    static let iris = rgb(0xffcc33)
    static let irisDark = rgb(0x3a2d4d)
}

/// Tiny Oddity: o bichinho fofo em pixel art, rasterizado em 64x64 e ampliado sem suavização.
/// Como ele é quase só rosto, a dança vive de squash & stretch e de expressões.
final class OddityCharacter: DanceCharacter {
    let id = "oddity"
    let name = "Tiny Oddity"
    let summary = "Bichinho de pixel art que dança com a cara toda."
    let moveCount = 6

    private let size = 64
    private var buffer = [UInt32](repeating: 0, count: 64 * 64)

    // MARK: Expressões e movimento

    private func computeFrame(_ s: BeatFrame) -> OddFrame {
        var f = OddFrame()
        f.t = s.wallTime
        guard s.dancing else {
            let t = s.wallTime
            f.sy = 1 + 0.03 * sin(t * 1.4)
            f.sx = 1 - 0.02 * sin(t * 1.4)
            f.rot = 0.06 * sin(t * 0.5)
            f.eyeL = .sleep
            f.eyeR = .sleep
            f.mouth = .flat
            f.zzz = true
            f.hornWiggle = 0.5 * sin(t * 0.8)
            return f
        }

        let amp = 0.6 + 0.4 * s.energy
        let pulse = s.pulse, sway = s.sway, swayMid = s.swayMid, ph = s.phase
        let arc = 4 * ph * (1 - ph)
        f.hornWiggle = 1.6 * swayMid * amp

        switch s.moveIndex {
        case 0: // quicando no lugar
            f.sy = 1 - 0.22 * pulse * amp
            f.sx = 1 + 0.2 * pulse * amp
            f.lookX = sway
            f.lookY = 0.4 * pulse
        case 1: // pulinho feliz
            f.jump = 0.9 * arc * amp
            f.sy = 1 + 0.18 * arc - 0.18 * pulse
            f.sx = 1 - 0.1 * arc + 0.15 * pulse
            f.eyeL = .happy
            f.eyeR = .happy
            f.mouth = .open
            f.mouthScale = 0.8 + 0.4 * arc
        case 2: // giro
            let spinAngle = Double.pi * s.beatFrac / 2
            let spin = cos(spinAngle)
            let sign: Double = spin < 0 ? -1 : 1
            f.sx = sign * max(0.18, abs(spin))
            f.sy = 1 - 0.1 * pulse
            f.lookX = -sin(spinAngle) * 1.2
            f.mouth = .o
        case 3: // piscadinha com inclinação
            f.rot = 0.22 * sway * amp
            f.sy = 1 - 0.1 * pulse
            f.sx = 1 + 0.08 * pulse
            f.lookX = 0.6 * sway
            if s.beatIndex % 2 == 1 && ph < 0.6 { f.eyeR = .happy }
        case 4: // arrastando os pés, surpreso
            f.hipX = 0.35 * sway * amp
            f.feetL = 2.5 * sway
            f.feetR = -2.5 * sway
            f.sy = 1 - 0.08 * pulse
            f.eyeL = .wide
            f.eyeR = .wide
            f.mouth = .o
            f.lookX = -0.8 * sway
            f.exclaim = pulse > 0.6 && s.beatIndex % 4 == 0
        default: // festa de estrelas
            f.eyeL = .star
            f.eyeR = .star
            f.mouth = .open
            f.mouthScale = 0.9 + 0.3 * pulse
            f.jump = 0.4 * arc * amp
            f.sy = 1 - 0.15 * pulse
            f.sx = 1 + 0.12 * pulse
            f.sparkle = pow(1 - ph, 2)
            f.rot = 0.1 * swayMid
        }

        // Grave forte: olhos de estrela por um instante.
        if s.onsetGlow > 0.5 && s.bass > 0.8 && f.eyeL == .normal {
            f.eyeL = .star
            f.eyeR = .star
            f.sparkle = max(f.sparkle, s.onsetGlow)
        }
        return f
    }

    // MARK: Formas

    private func polyline(_ pts: [(Double, Double)], _ r: Double, _ color: UInt32, _ out: inout [PixShape]) {
        guard pts.count > 1 else { return }
        for i in 0..<(pts.count - 1) {
            out.append(.capsule(pts[i].0, pts[i].1, pts[i + 1].0, pts[i + 1].1, r, color))
        }
    }

    private func star(_ cx: Double, _ cy: Double, _ r: Double, _ color: UInt32) -> PixShape {
        var pts: [(Double, Double)] = []
        for i in 0..<8 {
            let a = Double(i) * .pi / 4 - .pi / 2
            let rr = i % 2 == 0 ? r : r * 0.42
            pts.append((cx + cos(a) * rr, cy + sin(a) * rr))
        }
        return .poly(pts, color)
    }

    private func addEye(_ ex: Double, _ kind: EyeKind, _ f: OddFrame, _ sh: inout [PixShape]) {
        let ey = -1.0
        switch kind {
        case .happy:
            polyline([(ex - 4.5, ey + 1), (ex, ey - 3), (ex + 4.5, ey + 1)], 1.1, Pal.dark, &sh)
        case .sleep:
            polyline([(ex - 4, ey + 1), (ex + 4, ey + 1)], 1.0, Pal.dark, &sh)
        case .star:
            sh.append(star(ex, ey, 6.5, Pal.dark))
            sh.append(star(ex, ey, 5, Pal.iris))
        case .normal, .wide:
            let big = kind == .wide ? 1.25 : 1.0
            sh.append(.ellipse(ex, ey, 6.5 * big, 7.5 * big, Pal.dark))
            sh.append(.ellipse(ex, ey, 5.5 * big, 6.5 * big, Pal.white))
            let px = ex + f.lookX * 1.6
            let py = ey + f.lookY * 1.2 + 0.5
            let ir = kind == .wide ? 0.8 : 1.0
            sh.append(.ellipse(px, py, 3.6 * ir, 4.6 * ir, Pal.irisDark))
            sh.append(.ellipse(px, py + 1.8, 2.4 * ir, 2.0 * ir, Pal.iris))
            sh.append(.ellipse(px - 1.3, py - 1.9, 1.3, 1.6, Pal.white))
        }
    }

    private func buildShapes(_ f: OddFrame) -> [PixShape] {
        var sh: [PixShape] = []
        sh.reserveCapacity(96)
        let w = f.hornWiggle

        // Halo claro em volta do corpo, para o contorno suave.
        sh.append(.ellipse(0, 0, 22.5, 20.5, Pal.halo))
        for i in 0..<10 {
            let a = Double(i) / 10 * 2 * .pi
            sh.append(.ellipse(cos(a) * 18, sin(a) * 16, 6.3, 6.3, Pal.halo))
        }
        // Chifres, atrás do corpo.
        sh.append(.poly([(-17, -9), (-23 + w, -27), (-19 + w, -29.5), (-8, -16)], Pal.yellow))
        sh.append(.poly([(-18, -10), (-22 + w, -25), (-16, -16)], Pal.yellowDark))
        sh.append(.poly([(17, -9), (25 - w, -28), (20 - w, -31.5), (8, -16)], Pal.purple))
        sh.append(.poly([(18, -10), (23 - w, -26), (16, -16)], Pal.purpleDark))
        // Corpo fofo.
        sh.append(.ellipse(0, 0, 21, 19, Pal.white))
        for i in 0..<10 {
            let a = Double(i) / 10 * 2 * .pi
            sh.append(.ellipse(cos(a) * 18, sin(a) * 16, 5, 5, Pal.white))
        }
        // Pés.
        sh.append(.ellipse(-9 + f.feetL, 19, 4, 2.5, Pal.yellow))
        sh.append(.ellipse(9 + f.feetR, 19, 4, 2.5, Pal.purple))
        // Marquinha "x" na testa e bochechas.
        polyline([(-10.5, -13.5), (-7.5, -10.5)], 0.7, Pal.lavender, &sh)
        polyline([(-7.5, -13.5), (-10.5, -10.5)], 0.7, Pal.lavender, &sh)
        sh.append(.ellipse(-13.5, 5, 2.6, 1.4, Pal.pink))
        sh.append(.ellipse(13.5, 5, 2.6, 1.4, Pal.pink))

        addEye(-8, f.eyeL, f, &sh)
        addEye(8, f.eyeR, f, &sh)

        // Boca.
        switch f.mouth {
        case .open:
            sh.append(.ellipse(0, 9.5, 3.2 * f.mouthScale, 3.4 * f.mouthScale, Pal.dark))
            sh.append(.ellipse(0, 10.8, 1.9 * f.mouthScale, 1.3 * f.mouthScale, Pal.pink))
        case .o:
            sh.append(.ellipse(0, 9, 2.2, 2.4, Pal.dark))
        case .flat:
            polyline([(-2.5, 9), (2.5, 9)], 0.8, Pal.dark, &sh)
        case .smile:
            polyline([(-3, 8), (0, 9.6), (3, 8)], 0.8, Pal.dark, &sh)
        }

        // Enfeites.
        if f.exclaim {
            sh.append(.capsule(0, -34, 0, -28, 1.1, Pal.yellow))
            sh.append(.ellipse(0, -25.5, 1.2, 1.2, Pal.yellow))
        }
        if f.sparkle > 0 {
            let r = 2 + 2 * f.sparkle
            sh.append(star(-30, -14, r, Pal.yellow))
            sh.append(star(31, -8, r * 0.8, Pal.lavender))
            sh.append(star(27, 14, r * 0.6, Pal.yellow))
        }
        if f.zzz {
            let bob = sin(f.t * 1.5) * 1.5
            for (x, y, k) in [(22.0, -26 + bob, 1.0), (27.0, -31 - bob, 1.3)] {
                polyline([(x, y), (x + 3 * k, y), (x, y + 3 * k), (x + 3 * k, y + 3 * k)], 0.6 * k, Pal.lavender, &sh)
            }
        }
        return sh
    }

    // MARK: Rasterização

    private func rasterize(_ shapes: [PixShape], sx: Double, sy: Double, rot: Double, cx: Double, cy: Double) {
        let c = cos(-rot), s = sin(-rot)
        let isx = 1 / sx, isy = 1 / sy
        let n = size
        let count = shapes.count
        buffer.withUnsafeMutableBufferPointer { buf in
            for py in 0..<n {
                for px in 0..<n {
                    let dx = Double(px) + 0.5 - cx
                    let dy = Double(py) + 0.5 - cy
                    let mx = (dx * c - dy * s) * isx
                    let my = (dx * s + dy * c) * isy
                    var color: UInt32 = 0
                    var i = count - 1
                    while i >= 0 {
                        if shapes[i].contains(mx, my) {
                            color = shapes[i].color
                            break
                        }
                        i -= 1
                    }
                    buf[py * n + px] = color
                }
            }
        }
    }

    private func makeImage() -> CGImage? {
        let data = buffer.withUnsafeBufferPointer { Data(buffer: $0) }
        guard let provider = CGDataProvider(data: data as CFData) else { return nil }
        return CGImage(
            width: size, height: size, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: size * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
            provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent
        )
    }

    func draw(_ ctx: inout GraphicsContext, stage st: Stage, frame s: BeatFrame) {
        let f = computeFrame(s)
        let shapes = buildShapes(f)
        // Os pés ficam na linha 54 do quadro de pixels; o centro do corpo sobe conforme o squash e o pulo.
        let groundRow = 54.0
        let half = Double(size) / 2
        rasterize(shapes, sx: f.sx, sy: f.sy, rot: f.rot, cx: half, cy: groundRow - 19 * f.sy - f.jump * 10)
        guard let image = makeImage() else { return }

        let u = st.u
        var k = 7.5 * u / Double(size)
        if k >= 2 { k = floor(k) }
        st.shadow(&ctx, x: f.hipX, width: 3.3 * abs(f.sx), lift: f.jump)
        let dx = (st.cx + f.hipX * u - half * k).rounded()
        let dy = (st.groundY + 0.1 * u - groundRow * k).rounded()
        let side = Double(size) * k
        let rect = CGRect(x: dx, y: dy, width: side, height: side)
        ctx.draw(Image(decorative: image, scale: 1).interpolation(.none), in: rect)
    }
}

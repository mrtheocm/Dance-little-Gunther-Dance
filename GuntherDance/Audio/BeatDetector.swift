import Accelerate
import AVFoundation
import QuartzCore

/// FFT real com janela de Hann, usando vDSP.
final class SpectrumAnalyzer {
    let size: Int
    let half: Int
    private let log2n: vDSP_Length
    private let setup: FFTSetup
    private var window: [Float]
    private var windowed: [Float]
    private var real: [Float]
    private var imag: [Float]
    /// Potência (magnitude ao quadrado) por bin, índices 0..<half.
    private(set) var power: [Float]

    init(size: Int) {
        self.size = size
        half = size / 2
        log2n = vDSP_Length(log2(Double(size)).rounded())
        setup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2))!
        window = [Float](repeating: 0, count: size)
        vDSP_hann_window(&window, vDSP_Length(size), Int32(vDSP_HANN_NORM))
        windowed = [Float](repeating: 0, count: size)
        real = [Float](repeating: 0, count: half)
        imag = [Float](repeating: 0, count: half)
        power = [Float](repeating: 0, count: half)
    }

    deinit {
        vDSP_destroy_fftsetup(setup)
    }

    func analyze(_ samples: [Float]) {
        guard samples.count == size else { return }
        vDSP_vmul(samples, 1, window, 1, &windowed, 1, vDSP_Length(size))
        let n = vDSP_Length(half)
        let capacity = half
        let log2n = self.log2n
        let setup = self.setup
        real.withUnsafeMutableBufferPointer { r in
            imag.withUnsafeMutableBufferPointer { i in
                var split = DSPSplitComplex(realp: r.baseAddress!, imagp: i.baseAddress!)
                windowed.withUnsafeBufferPointer { w in
                    w.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: capacity) { c in
                        vDSP_ctoz(c, 2, &split, 1, n)
                    }
                }
                vDSP_fft_zrip(setup, &split, 1, log2n, FFTDirection(kFFTDirection_Forward))
                vDSP_zvmags(&split, 1, &power, 1, n)
            }
        }
    }
}

/// Detecta batidas e estima o BPM em tempo real a partir do microfone.
///
/// Pipeline por bloco de 1024 amostras:
/// 1. FFT de 2048 amostras (50% de sobreposição) e compressão logarítmica.
/// 2. Fluxo espectral por banda (grave, médio, agudo) → função de detecção de onset (ODF).
/// 3. Escolha de picos com limiar adaptativo → onsets.
/// 4. Autocorrelação da ODF (janela de 8 s) com prior em ~125 BPM → tempo.
/// 5. Relógio de batidas: prevê a próxima batida e corrige a fase com os onsets.
///
/// `process(_:)` deve ser chamado sempre na mesma thread (a do tap de áudio).
final class BeatDetector {
    /// Chamado na thread de áudio a cada bloco analisado.
    var onSnapshot: ((BeatSnapshot) -> Void)?

    private let sampleRate: Double
    private let hop = 1024
    private let fftSize = 2048
    private let frameRate: Double
    private let hopDuration: TimeInterval

    private var pending: [Float] = []
    private var analysisWindow: [Float]
    private let spectrum: SpectrumAnalyzer
    private var prevLogMag: [Float]
    private var logMag: [Float]
    private let bassBins: Range<Int>
    private let midBins: Range<Int>
    private let highBins: Range<Int>

    // Histórico circular da função de detecção de onset.
    private let odfCapacity: Int
    private var odf: [Float]
    private var odfIndex = 0
    private var odfFilled = 0
    private var prev1: Float = 0
    private var prev2: Float = 0
    private var framesSinceOnset = 1000
    private let minOnsetGapFrames: Int

    // Níveis para o visual.
    private var level: Float = 0
    private var bass: Float = 0
    private var mid: Float = 0
    private var high: Float = 0
    private var bassMax: Float = 1e-6
    private var midMax: Float = 1e-6
    private var highMax: Float = 1e-6
    private var silentFrames = 0
    private var isSilent = true

    // Tempo.
    private var bpm: Double = 0
    private var beatPeriod: TimeInterval = 60.0 / 125.0
    private var tempoCandidate: Double = 0
    private var tempoAgreeCount = 0
    private var framesSinceTempo = 0

    // Relógio de batidas.
    private var hasAnchor = false
    private var lastBeatTime: TimeInterval = 0
    private var nextBeatTime: TimeInterval = 0
    private var beatCount = 0
    private var confidence: Double = 0
    private var offbeatOnsets: [TimeInterval] = []

    init(sampleRate: Double) {
        self.sampleRate = sampleRate
        let hop = 1024
        let fftSize = 2048
        frameRate = sampleRate / Double(hop)
        hopDuration = Double(hop) / sampleRate
        analysisWindow = [Float](repeating: 0, count: fftSize)
        spectrum = SpectrumAnalyzer(size: fftSize)
        prevLogMag = [Float](repeating: 0, count: fftSize / 2)
        logMag = [Float](repeating: 0, count: fftSize / 2)

        let binHz = sampleRate / Double(fftSize)
        let maxBin = fftSize / 2
        func bin(_ hz: Double) -> Int { min(maxBin, max(1, Int(hz / binHz))) }
        let b0 = bin(30), b1 = max(bin(30) + 1, bin(160))
        let m1 = max(b1 + 1, bin(2000))
        let h1 = max(m1 + 1, bin(9000))
        bassBins = b0..<b1
        midBins = b1..<m1
        highBins = m1..<h1

        let capacity = Int(sampleRate / Double(hop) * 12)
        odfCapacity = capacity
        odf = [Float](repeating: 0, count: capacity)
        minOnsetGapFrames = max(2, Int(sampleRate / Double(hop) * 0.1))
    }

    func process(_ buffer: AVAudioPCMBuffer) {
        guard let channels = buffer.floatChannelData else { return }
        let n = Int(buffer.frameLength)
        guard n > 0 else { return }
        let channelCount = max(1, Int(buffer.format.channelCount))

        var mono = [Float](repeating: 0, count: n)
        if buffer.format.isInterleaved {
            let src = channels[0]
            for i in 0..<n { mono[i] = src[i * channelCount] }
        } else {
            mono.withUnsafeMutableBufferPointer { m in
                guard let p = m.baseAddress else { return }
                for c in 0..<channelCount {
                    vDSP_vadd(p, 1, channels[c], 1, p, 1, vDSP_Length(n))
                }
                if channelCount > 1 {
                    var scale = 1 / Float(channelCount)
                    vDSP_vsmul(p, 1, &scale, p, 1, vDSP_Length(n))
                }
            }
        }
        pending.append(contentsOf: mono)

        let now = CACurrentMediaTime()
        let total = pending.count
        var offset = 0
        while total - offset >= hop {
            // Instante aproximado do fim deste bloco, no relógio do sistema.
            let endTime = now - Double(total - offset - hop) / sampleRate
            analyzeHop(Array(pending[offset..<(offset + hop)]), endTime: endTime)
            offset += hop
        }
        if offset > 0 { pending.removeFirst(offset) }
    }

    // MARK: - Análise de um bloco

    private func analyzeHop(_ samples: [Float], endTime: TimeInterval) {
        analysisWindow.removeFirst(hop)
        analysisWindow.append(contentsOf: samples)

        // Volume geral e detecção de silêncio.
        var rms: Float = 0
        vDSP_rmsqv(samples, 1, &rms, vDSP_Length(samples.count))
        let db = 20 * log10(max(rms, 1e-7))
        let rawLevel = min(1, max(0, (db + 55) / 50))
        level = max(rawLevel, level * 0.9)

        if db < -52 { silentFrames += 1 } else { silentFrames = 0 }
        let silentNow = silentFrames > Int(frameRate * 1.0)
        if silentNow && !isSilent {
            hasAnchor = false
            confidence = 0
            offbeatOnsets.removeAll()
        }
        isSilent = silentNow

        // Espectro com compressão logarítmica.
        spectrum.analyze(analysisWindow)
        let power = spectrum.power
        for k in 0..<power.count {
            logMag[k] = log1p(sqrt(power[k]))
        }

        let b = bandMetrics(bassBins, power: power)
        let m = bandMetrics(midBins, power: power)
        let h = bandMetrics(highBins, power: power)
        swap(&prevLogMag, &logMag)

        // Níveis de banda normalizados por um máximo que decai lentamente.
        bassMax = max(b.energy, bassMax * 0.9995, 1e-6)
        midMax = max(m.energy, midMax * 0.9995, 1e-6)
        highMax = max(h.energy, highMax * 0.9995, 1e-6)
        bass = max(min(1, sqrt(b.energy / bassMax)), bass * 0.9)
        mid = max(min(1, sqrt(m.energy / midMax)), mid * 0.9)
        high = max(min(1, sqrt(h.energy / highMax)), high * 0.9)

        // Função de detecção de onset, com peso maior no grave (bumbo).
        let odfValue = b.flux * 1.0 + m.flux * 0.5 + h.flux * 0.25
        let (mean, std) = recentStats(frames: Int(frameRate * 1.5))
        odf[odfIndex] = odfValue
        odfIndex = (odfIndex + 1) % odfCapacity
        odfFilled = min(odfCapacity, odfFilled + 1)

        // Escolha de pico com um bloco de atraso (precisa ver o valor seguinte cair).
        let threshold = mean + 1.5 * std + 0.01
        framesSinceOnset += 1
        var onsetTime: TimeInterval?
        var strength: Double = 0
        if !silentNow, prev1 > threshold, prev1 >= odfValue, prev1 > prev2, framesSinceOnset >= minOnsetGapFrames {
            onsetTime = endTime - 1.5 * hopDuration
            strength = Double(prev1 / threshold)
            framesSinceOnset = 0
        }
        prev2 = prev1
        prev1 = odfValue

        // Tempo, a cada ~0,25 s, depois de 4 s de histórico.
        framesSinceTempo += 1
        if !silentNow, framesSinceTempo >= Int(frameRate * 0.25), odfFilled >= Int(frameRate * 4) {
            framesSinceTempo = 0
            estimateTempo()
        }

        updateBeatClock(now: endTime, onsetTime: onsetTime, strength: strength)

        onSnapshot?(BeatSnapshot(
            time: endTime,
            level: level,
            bass: bass,
            mid: mid,
            high: high,
            isSilent: silentNow,
            bpm: bpm,
            hasBeat: hasAnchor,
            beatPeriod: beatPeriod,
            lastBeatTime: lastBeatTime,
            beatCount: beatCount,
            confidence: confidence,
            onset: onsetTime != nil
        ))
    }

    private func bandMetrics(_ range: Range<Int>, power: [Float]) -> (flux: Float, energy: Float) {
        var flux: Float = 0
        var energy: Float = 0
        for k in range {
            let d = logMag[k] - prevLogMag[k]
            if d > 0 { flux += d }
            energy += power[k]
        }
        return (flux / Float(max(1, range.count)), energy)
    }

    private func recentStats(frames: Int) -> (Float, Float) {
        let m = min(frames, odfFilled)
        guard m > 1 else { return (0, 0) }
        var sum: Float = 0
        var sumSq: Float = 0
        for i in 1...m {
            let v = odf[(odfIndex - i + odfCapacity) % odfCapacity]
            sum += v
            sumSq += v * v
        }
        let mean = sum / Float(m)
        let variance = max(0, sumSq / Float(m) - mean * mean)
        return (mean, sqrt(variance))
    }

    // MARK: - Tempo

    private func estimateTempo() {
        let w = min(odfFilled, Int(frameRate * 8))
        guard w > 8 else { return }
        var x = [Float](repeating: 0, count: w)
        for i in 0..<w {
            x[i] = odf[(odfIndex - w + i + odfCapacity) % odfCapacity]
        }
        var mean: Float = 0
        vDSP_meanv(x, 1, &mean, vDSP_Length(w))
        for i in 0..<w { x[i] -= mean }
        var energy: Float = 0
        vDSP_dotpr(x, 1, x, 1, &energy, vDSP_Length(w))
        energy /= Float(w)
        guard energy > 1e-9 else { return }

        let lagMin = max(2, Int(frameRate * 60 / 200))
        let lagMax = min(w / 2, Int(frameRate * 60 / 60))
        guard lagMax > lagMin + 2 else { return }

        var ac = [Float](repeating: 0, count: lagMax + 1)
        x.withUnsafeBufferPointer { p in
            guard let base = p.baseAddress else { return }
            for lag in lagMin...lagMax {
                var s: Float = 0
                vDSP_dotpr(base, 1, base + lag, 1, &s, vDSP_Length(w - lag))
                ac[lag] = s / Float(w - lag) / energy
            }
        }

        var bestLag = 0
        var bestScore = -Float.infinity
        for lag in lagMin...lagMax {
            let candidateBpm = 60 * frameRate / Double(lag)
            // Prior suave em torno de 125 BPM (música de balada).
            let prior = Float(exp(-0.5 * pow(log2(candidateBpm / 125) / 0.55, 2)))
            var score = ac[lag]
            if 2 * lag <= lagMax { score += 0.4 * ac[2 * lag] }
            score *= prior
            if score > bestScore {
                bestScore = score
                bestLag = lag
            }
        }
        guard bestLag > 0, ac[bestLag] > 0.05 else { return }

        // Interpolação parabólica para refinar o período.
        var lagF = Double(bestLag)
        if bestLag > lagMin, bestLag < lagMax {
            let y0 = Double(ac[bestLag - 1])
            let y1 = Double(ac[bestLag])
            let y2 = Double(ac[bestLag + 1])
            let denom = y0 - 2 * y1 + y2
            if abs(denom) > 1e-9 {
                lagF += min(0.5, max(-0.5, 0.5 * (y0 - y2) / denom))
            }
        }
        let newBpm = min(200, max(60, 60 * frameRate / lagF))

        if bpm == 0 {
            bpm = newBpm
        } else if abs(newBpm - bpm) / bpm < 0.06 {
            bpm = 0.8 * bpm + 0.2 * newBpm
            tempoCandidate = 0
            tempoAgreeCount = 0
        } else {
            if tempoCandidate > 0, abs(newBpm - tempoCandidate) / tempoCandidate < 0.06 {
                tempoAgreeCount += 1
            } else {
                tempoCandidate = newBpm
                tempoAgreeCount = 1
            }
            if tempoAgreeCount >= 3 {
                bpm = tempoCandidate
                tempoCandidate = 0
                tempoAgreeCount = 0
                confidence *= 0.5
            }
        }
        beatPeriod = 60 / bpm
    }

    // MARK: - Relógio de batidas

    private func updateBeatClock(now: TimeInterval, onsetTime: TimeInterval?, strength: Double) {
        let period = beatPeriod
        let tol = 0.2 * period

        if !hasAnchor {
            if let t = onsetTime, strength > 1.3 {
                hasAnchor = true
                lastBeatTime = t
                nextBeatTime = t + period
                beatCount += 1
                confidence = 0.2
            }
            return
        }

        if let t = onsetTime {
            let dLast = t - lastBeatTime
            let dNext = t - nextBeatTime
            let alpha = min(0.6, 0.25 + 0.1 * strength)
            if abs(dLast) <= tol {
                // Onset perto da batida que já foi emitida: só ajusta a previsão.
                nextBeatTime += alpha * dLast
                confidence = confidence * 0.85 + 0.15
                offbeatOnsets.removeAll()
            } else if abs(dNext) <= tol {
                // Onset um pouco antes da batida prevista: emite agora.
                lastBeatTime = t
                beatCount += 1
                nextBeatTime = nextBeatTime + period + alpha * dNext
                confidence = confidence * 0.85 + 0.15
                offbeatOnsets.removeAll()
            } else {
                // Fora de fase. Se vários onsets fortes concordarem entre si, reancora.
                if strength > 1.8 {
                    offbeatOnsets.append(t)
                    offbeatOnsets.removeAll { t - $0 > 4 * period }
                    if offbeatOnsets.count >= 3, phasesAgree(offbeatOnsets, period: period, tol: tol) {
                        lastBeatTime = t
                        beatCount += 1
                        nextBeatTime = t + period
                        offbeatOnsets.removeAll()
                        confidence = 0.3
                    }
                }
                confidence *= 0.95
            }
        }

        // Batidas previstas que já passaram sem onset: segue em frente no mesmo tempo.
        while nextBeatTime <= now {
            lastBeatTime = nextBeatTime
            beatCount += 1
            nextBeatTime += period
            confidence *= 0.96
        }
    }

    private func phasesAgree(_ times: [TimeInterval], period: TimeInterval, tol: TimeInterval) -> Bool {
        guard let first = times.first else { return false }
        for t in times.dropFirst() {
            var d = (t - first).truncatingRemainder(dividingBy: period)
            if d > period / 2 { d -= period }
            if d < -period / 2 { d += period }
            if abs(d) > tol { return false }
        }
        return true
    }
}

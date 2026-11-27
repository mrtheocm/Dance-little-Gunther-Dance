import Foundation
import QuartzCore

/// Resultado de um quadro de análise, produzido pelo `BeatDetector` na thread de áudio.
struct BeatSnapshot {
    var time: TimeInterval
    var level: Float
    var bass: Float
    var mid: Float
    var high: Float
    var isSilent: Bool
    var bpm: Double
    var hasBeat: Bool
    var beatPeriod: TimeInterval
    var lastBeatTime: TimeInterval
    var beatCount: Int
    var confidence: Double
    var onset: Bool
}

enum SyncQuality {
    case searching
    case locking
    case locked
}

/// Estado compartilhado entre o analisador de áudio e a tela.
/// Todos os métodos devem ser chamados na main thread.
final class DanceState: ObservableObject {
    // Valores de baixa frequência, que dirigem textos e rótulos.
    @Published private(set) var bpmText = "—"
    @Published private(set) var isSilent = true
    @Published private(set) var syncQuality: SyncQuality = .searching

    // Valores de alta frequência, lidos pelo Canvas a cada quadro (não publicados de propósito).
    private(set) var level: Float = 0
    private(set) var bass: Float = 0
    private(set) var mid: Float = 0
    private(set) var high: Float = 0
    private(set) var bpm: Double = 0
    private(set) var hasBeat = false
    private(set) var beatPeriod: TimeInterval = 0.48
    private(set) var lastBeatTime: TimeInterval = CACurrentMediaTime()
    private(set) var beatCount = 0
    private(set) var confidence: Double = 0
    private(set) var lastOnsetTime: TimeInterval = 0

    private var displayedBpm: Double = 0

    func apply(_ s: BeatSnapshot) {
        level = s.level
        bass = s.bass
        mid = s.mid
        high = s.high
        bpm = s.bpm
        hasBeat = s.hasBeat
        beatPeriod = s.beatPeriod
        lastBeatTime = s.lastBeatTime
        beatCount = s.beatCount
        confidence = s.confidence
        if s.onset { lastOnsetTime = s.time }

        if s.isSilent != isSilent { isSilent = s.isSilent }

        // Histerese para o número não ficar piscando entre 127 e 128.
        if s.bpm > 0, abs(s.bpm - displayedBpm) >= 0.8 { displayedBpm = s.bpm }
        let text = (s.bpm > 0 && !s.isSilent) ? String(Int(displayedBpm.rounded())) : "—"
        if text != bpmText { bpmText = text }

        let quality: SyncQuality
        if !s.hasBeat || s.isSilent {
            quality = .searching
        } else if s.confidence > 0.55 {
            quality = .locked
        } else {
            quality = .locking
        }
        if quality != syncQuality { syncQuality = quality }
    }

    func reset() {
        level = 0
        bass = 0
        mid = 0
        high = 0
        bpm = 0
        hasBeat = false
        confidence = 0
        lastBeatTime = CACurrentMediaTime()
        displayedBpm = 0
        if bpmText != "—" { bpmText = "—" }
        if !isSilent { isSilent = true }
        if syncQuality != .searching { syncQuality = .searching }
    }
}

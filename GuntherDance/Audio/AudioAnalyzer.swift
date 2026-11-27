import AVFoundation
import Combine
import Foundation

enum AnalyzerError: LocalizedError {
    case noInput

    var errorDescription: String? {
        switch self {
        case .noInput: return "Nenhum microfone disponível."
        }
    }
}

/// Captura o microfone com AVAudioEngine e alimenta o `BeatDetector`.
@MainActor
final class AudioAnalyzer: ObservableObject {
    enum Status: Equatable {
        case idle
        case running
        case permissionDenied
        case failed(String)
    }

    @Published private(set) var status: Status = .idle
    let dance = DanceState()

    private let engine = AVAudioEngine()
    private var detector: BeatDetector?
    private var observers: [NSObjectProtocol] = []
    private var isStarting = false

    func start() async {
        guard !isStarting, status != .running else { return }
        isStarting = true
        defer { isStarting = false }

        switch AVAudioApplication.shared.recordPermission {
        case .denied:
            status = .permissionDenied
            return
        case .undetermined:
            let granted = await AVAudioApplication.requestRecordPermission()
            guard granted else {
                status = .permissionDenied
                return
            }
        default:
            break
        }

        do {
            try configureSession()
            try startEngine()
            installObserversIfNeeded()
            status = .running
        } catch {
            status = .failed(error.localizedDescription)
        }
    }

    func stop() {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        detector = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        dance.reset()
        if status == .running { status = .idle }
    }

    private func restart() {
        guard status == .running else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        do {
            try configureSession()
            try startEngine()
        } catch {
            status = .failed(error.localizedDescription)
        }
    }

    private func configureSession() throws {
        let session = AVAudioSession.sharedInstance()
        // `.measurement` desliga o processamento automático de voz, melhor para música.
        try session.setCategory(.record, mode: .measurement, options: [])
        try session.setPreferredSampleRate(48_000)
        try session.setPreferredIOBufferDuration(1024.0 / 48_000.0)
        try session.setActive(true, options: [])
    }

    private func startEngine() throws {
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else {
            throw AnalyzerError.noInput
        }

        let detector = BeatDetector(sampleRate: format.sampleRate)
        let dance = self.dance
        detector.onSnapshot = { snapshot in
            DispatchQueue.main.async { dance.apply(snapshot) }
        }
        self.detector = detector

        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            detector.process(buffer)
        }
        engine.prepare()
        try engine.start()
    }

    private func installObserversIfNeeded() {
        guard observers.isEmpty else { return }
        let center = NotificationCenter.default

        observers.append(center.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
        ) { [weak self] note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: raw),
                  type == .ended else { return }
            Task { @MainActor in self?.restart() }
        })

        observers.append(center.addObserver(
            forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.restart() }
        })
    }
}

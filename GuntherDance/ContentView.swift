import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var analyzer = AudioAnalyzer()
    @StateObject private var characters = CharacterStore()
    @State private var showGallery = false
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            DancerView(state: analyzer.dance, store: characters)
                .ignoresSafeArea()

            VStack {
                BeatHUD(state: analyzer.dance)
                Spacer()
                StatusFooter(analyzer: analyzer, state: analyzer.dance, characters: characters) {
                    showGallery = true
                }
            }
            .padding(20)
        }
        .sheet(isPresented: $showGallery) {
            CharacterGallery(store: characters, state: analyzer.dance)
        }
        .task { await analyzer.start() }
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:
                Task { await analyzer.start() }
            case .background:
                analyzer.stop()
            default:
                break
            }
        }
    }
}

// MARK: - Cabeçalho com BPM

struct BeatHUD: View {
    @ObservedObject var state: DanceState

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 0) {
                Text("GUNTHER")
                    .font(.caption.weight(.heavy))
                    .tracking(4)
                    .foregroundStyle(.white.opacity(0.7))
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(state.bpmText)
                        .font(.system(size: 52, weight: .black, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                        .animation(.easeOut(duration: 0.2), value: state.bpmText)
                    Text("BPM")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
            Spacer()
            SyncBadge(quality: state.syncQuality, isSilent: state.isSilent)
        }
        .foregroundStyle(.white)
        .shadow(color: .black.opacity(0.5), radius: 6)
    }
}

struct SyncBadge: View {
    let quality: SyncQuality
    let isSilent: Bool

    private var label: String {
        switch quality {
        case .searching: return isSilent ? "Ouvindo..." : "Procurando o ritmo"
        case .locking: return "Pegando o ritmo"
        case .locked: return "No ritmo!"
        }
    }

    private var color: Color {
        switch quality {
        case .searching: return .gray
        case .locking: return .yellow
        case .locked: return .green
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(color)
                .frame(width: 9, height: 9)
                .shadow(color: color, radius: 4)
            Text(label)
                .font(.footnote.weight(.semibold))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial, in: Capsule())
        .animation(.easeInOut(duration: 0.25), value: label)
    }
}

// MARK: - Rodapé com níveis e controles

struct StatusFooter: View {
    @ObservedObject var analyzer: AudioAnalyzer
    @ObservedObject var state: DanceState
    @ObservedObject var characters: CharacterStore
    let openGallery: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            LevelBars(state: state)
            CharacterPicker(store: characters, openGallery: openGallery)
            controls
        }
    }

    @ViewBuilder
    private var controls: some View {
        switch analyzer.status {
        case .permissionDenied:
            VStack(spacing: 8) {
                Text("Sem acesso ao microfone")
                    .font(.headline)
                Text("Permita o microfone nos Ajustes para o Gunther ouvir a música.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.8))
                Button("Abrir Ajustes") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(.borderedProminent)
            }
            .foregroundStyle(.white)
            .padding()
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))

        case .failed(let message):
            VStack(spacing: 8) {
                Text(message)
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                Button("Tentar de novo") {
                    Task { await analyzer.start() }
                }
                .buttonStyle(.borderedProminent)
            }
            .foregroundStyle(.white)
            .padding()
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))

        case .idle:
            Button {
                Task { await analyzer.start() }
            } label: {
                Label("Começar a ouvir", systemImage: "mic.fill")
                    .font(.headline)
                    .padding(.horizontal, 8)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

        case .running:
            Button {
                analyzer.stop()
            } label: {
                Label("Pausar", systemImage: "pause.fill")
                    .font(.headline)
                    .padding(.horizontal, 8)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .tint(.white)
        }
    }
}

struct LevelBars: View {
    let state: DanceState

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1.0 / 30.0)) { _ in
            HStack(spacing: 18) {
                bar(value: state.bass, label: "GRAVE", color: Color(red: 1.0, green: 0.35, blue: 0.5))
                bar(value: state.mid, label: "MÉDIO", color: Color(red: 1.0, green: 0.85, blue: 0.3))
                bar(value: state.high, label: "AGUDO", color: Color(red: 0.4, green: 0.9, blue: 1.0))
            }
        }
    }

    private func bar(value: Float, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            ZStack(alignment: .bottom) {
                Capsule().fill(.white.opacity(0.12))
                Capsule()
                    .fill(color)
                    .frame(height: max(5, CGFloat(min(1, max(0, value))) * 56))
                    .shadow(color: color.opacity(0.8), radius: 4)
            }
            .frame(width: 14, height: 56)
            Text(label)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.white.opacity(0.7))
        }
    }
}

#Preview {
    ContentView()
}

// MARK: - Seletor de personagem

struct CharacterPicker: View {
    @ObservedObject var store: CharacterStore
    let openGallery: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            arrow("chevron.left", label: "Personagem anterior") { store.previous() }
            Button(action: openGallery) {
                HStack(spacing: 8) {
                    Image(systemName: "square.grid.2x2.fill")
                    Text(store.current.name)
                        .tracking(1)
                        .contentTransition(.opacity)
                        .animation(.easeInOut(duration: 0.15), value: store.index)
                }
                .font(.subheadline.weight(.heavy))
                .frame(minWidth: 150)
                .padding(.vertical, 10)
                .padding(.horizontal, 14)
                .background(.ultraThinMaterial, in: Capsule())
            }
            .accessibilityLabel("Escolher personagem. Atual: \(store.current.name)")
            arrow("chevron.right", label: "Próximo personagem") { store.next() }
        }
        .foregroundStyle(.white)
        .shadow(color: .black.opacity(0.5), radius: 6)
    }

    private func arrow(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.headline)
                .frame(width: 38, height: 38)
                .background(.ultraThinMaterial, in: Circle())
        }
        .accessibilityLabel(label)
    }
}

import QuartzCore
import SwiftUI

/// Desenha o personagem escolhido dançando, redesenhado a cada quadro da tela.
struct DancerView: View {
    @ObservedObject var state: DanceState
    @ObservedObject var store: CharacterStore

    var body: some View {
        let character = store.current
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let frame = BeatFrame(
                    state: state,
                    now: CACurrentMediaTime(),
                    wallTime: timeline.date.timeIntervalSinceReferenceDate,
                    // Pequeno adiantamento para compensar latência de captura e de tela.
                    lead: 0.04,
                    moveCount: character.moveCount
                )
                let stage = Stage(size: size)
                Draw.background(&context, stage: stage, frame: frame)
                character.draw(&context, stage: stage, frame: frame)
            }
        }
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 30).onEnded { value in
                if value.translation.width < -50 { store.next() }
                if value.translation.width > 50 { store.previous() }
            }
        )
    }
}

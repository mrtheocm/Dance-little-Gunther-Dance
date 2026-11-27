import QuartzCore
import SwiftUI

/// Tela para escolher o personagem: um cartão para cada um, com uma miniatura dançando ao vivo.
/// Com música tocando, as miniaturas seguem a batida real; sem música, um ritmo de demonstração.
struct CharacterGallery: View {
    @ObservedObject var store: CharacterStore
    let state: DanceState
    @Environment(\.dismiss) private var dismiss

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 14)]
    private let accent = Color(red: 1.0, green: 0.37, blue: 0.64)

    var body: some View {
        NavigationStack {
            ScrollView {
                TimelineView(.animation) { timeline in
                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(store.characters.indices, id: \.self) { i in
                            card(i, date: timeline.date)
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(red: 0.04, green: 0.03, blue: 0.09).ignoresSafeArea())
            .navigationTitle("Escolha quem vai dançar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fechar") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func card(_ i: Int, date: Date) -> some View {
        let character = store.characters[i]
        let selected = i == store.index
        return Button {
            store.select(i)
            dismiss()
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                Canvas { context, size in
                    let now = CACurrentMediaTime()
                    let wall = date.timeIntervalSinceReferenceDate
                    let live = state.hasBeat && !state.isSilent
                    let frame = live
                        ? BeatFrame(state: state, now: now, wallTime: wall, lead: 0.04, moveCount: character.moveCount)
                        : BeatFrame(demoAt: now, wallTime: wall, moveCount: character.moveCount)
                    let stage = Stage(size: size)
                    Draw.background(&context, stage: stage, frame: frame)
                    character.draw(&context, stage: stage, frame: frame)
                }
                .aspectRatio(0.8, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                Text(character.name)
                    .font(.headline)
                    .padding(.horizontal, 4)
                Text(character.summary)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4)
                    .padding(.bottom, 4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(8)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(selected ? accent.opacity(0.14) : Color.white.opacity(0.07))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(selected ? accent : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .foregroundStyle(.white)
        .accessibilityLabel("\(character.name). \(character.summary)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

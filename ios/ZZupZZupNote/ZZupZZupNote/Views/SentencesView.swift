import SwiftUI

struct SentencesView: View {
    @EnvironmentObject private var store: ClipStore
    @State private var onlyFavorite = false

    private var sentences: [Clip] {
        store.sentenceClips
            .filter { onlyFavorite ? $0.favorite : true }
            .prefix(50)
            .map { $0 }
    }

    var body: some View {
        NavigationStack {
            List {
                Toggle("자주 보는 문장만", isOn: $onlyFavorite)

                ForEach(sentences) { clip in
                    NavigationLink {
                        ClipDetailView(clip: clip)
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(clip.sentence.isEmpty ? clip.title : clip.sentence)
                                .lineLimit(5)
                                .fixedSize(horizontal: false, vertical: true)
                            if !clip.reason.isEmpty {
                                Text(clip.reason)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("줍줍문장")
            .toolbar {
                Button {
                    Task { await store.reloadTapped() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
    }
}


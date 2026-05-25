import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: ClipStore

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    summary

                    ForEach(store.inboxClips.prefix(30)) { clip in
                        NavigationLink {
                            ClipDetailView(clip: clip)
                        } label: {
                            ClipCardView(
                                clip: clip,
                                onFavorite: { Task { await store.toggleFavorite(clip) } },
                                onDone: { Task { await store.markDone(clip) } }
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(18)
            }
            .background(Color(.systemGray6))
            .navigationTitle("줍줍노트")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("로그아웃") {
                        store.signOut()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await store.reloadTapped() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .refreshable {
            await store.reloadTapped()
        }
    }

    private var summary: some View {
        HStack(spacing: 12) {
            StatBox(title: "전체", value: store.clips.count)
            StatBox(title: "정리 대기", value: store.inboxClips.count)
            StatBox(title: "문장", value: store.sentenceClips.count)
        }
    }
}

struct StatBox: View {
    let title: String
    let value: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(value)")
                .font(.system(size: 32, weight: .black, design: .monospaced))
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.white)
        .border(.black)
    }
}


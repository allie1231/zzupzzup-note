import SwiftUI

struct ClipDetailView: View {
    @EnvironmentObject private var store: ClipStore
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Clip

    init(clip: Clip) {
        _draft = State(initialValue: clip)
    }

    var body: some View {
        Form {
            Section("기본") {
                Picker("유형", selection: $draft.contentType) {
                    ForEach(ContentType.allCases) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                TextField("제목", text: $draft.title)
                TextField("출처", text: $draft.source)
                Toggle("자주 보는 것", isOn: $draft.favorite)
                Picker("상태", selection: $draft.status) {
                    ForEach(ClipStatus.allCases) { status in
                        Text(status.rawValue).tag(status)
                    }
                }
            }

            Section("주운 글") {
                TextEditor(text: $draft.sentence)
                    .frame(minHeight: 180)
            }

            Section("정리") {
                TextField("수집한 이유", text: $draft.reason, axis: .vertical)
                TextField("연결/확장", text: $draft.connection, axis: .vertical)
                TextField("활용처", text: $draft.useFor)
                TextField("다음 액션", text: $draft.action)
            }

            Section("미디어") {
                TextField("이미지 URL", text: $draft.imageUrl)
                if let url = URL(string: draft.imageUrl), draft.contentType == .image {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFit()
                        default:
                            ProgressView()
                        }
                    }
                    .frame(maxHeight: 240)
                }
            }

            Section {
                Button("변경사항 저장") {
                    Task {
                        await store.save(draft)
                        dismiss()
                    }
                }

                Button("삭제", role: .destructive) {
                    Task {
                        await store.delete(draft)
                        dismiss()
                    }
                }
            }
        }
        .navigationTitle("상세")
    }
}


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
                    PhotoPinEditor(imageURL: url, pins: Binding(
                        get: { draft.pins },
                        set: { draft.pins = $0 }
                    ))
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

struct PhotoPinEditor: View {
    let imageURL: URL
    @Binding var pins: [PhotoPin]
    @State private var selectedPinId: String?
    @State private var draftNote = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            GeometryReader { proxy in
                ZStack(alignment: .topLeading) {
                    AsyncImage(url: imageURL) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFit()
                        default:
                            Rectangle().fill(Color(.systemGray5))
                        }
                    }
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .border(.black)
                    .contentShape(Rectangle())
                    .onTapGesture { point in
                        let pin = PhotoPin(
                            x: max(0, min(1, point.x / max(proxy.size.width, 1))),
                            y: max(0, min(1, point.y / max(proxy.size.height, 1))),
                            note: ""
                        )
                        pins.append(pin)
                        selectedPinId = pin.id
                        draftNote = ""
                    }

                    ForEach(pins) { pin in
                        Button {
                            selectedPinId = pin.id
                            draftNote = pin.note
                        } label: {
                            Text("+")
                                .font(.headline.monospaced())
                                .frame(width: 28, height: 28)
                                .background(Color.black)
                                .foregroundStyle(.white)
                        }
                        .buttonStyle(.plain)
                        .position(
                            x: pin.x * proxy.size.width,
                            y: pin.y * proxy.size.height
                        )
                    }
                }
            }
            .frame(height: 260)

            if let selectedPinId {
                TextField("이 지점을 본 이유나 설명", text: $draftNote, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .onChange(of: draftNote) { _, value in
                        if let index = pins.firstIndex(where: { $0.id == selectedPinId }) {
                            pins[index].note = value
                        }
                    }

                Button("핀 삭제", role: .destructive) {
                    pins.removeAll { $0.id == selectedPinId }
                    self.selectedPinId = nil
                    draftNote = ""
                }
            }

            if pins.isEmpty {
                Text("이미지를 탭하면 시선이 간 부분에 핀을 남길 수 있습니다.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

import SwiftUI

struct CaptureView: View {
    @EnvironmentObject private var store: ClipStore
    @State private var type: ContentType = .link
    @State private var title = ""
    @State private var source = ""
    @State private var text = ""
    @State private var tags = ""
    @State private var favorite = false

    var body: some View {
        NavigationStack {
            Form {
                Section("줍줍하기") {
                    Picker("유형", selection: $type) {
                        ForEach(ContentType.allCases) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }

                    TextField("제목", text: $title)
                    TextField("링크 URL", text: $source)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    TextEditor(text: $text)
                        .frame(minHeight: 160)

                    TextField("#태그 #메모", text: $tags)
                    Toggle("자주 보는 것", isOn: $favorite)
                }

                Button {
                    Task { await save() }
                } label: {
                    Label("서버에 저장", systemImage: "square.and.arrow.down")
                }
            }
            .navigationTitle("모바일 줍기")
        }
    }

    private func save() async {
        let clip = Clip(
            contentType: type,
            sentence: text,
            source: source,
            siteName: siteName(from: source),
            title: title,
            tags: tags.split(separator: " ").map { String($0).hasPrefix("#") ? String($0) : "#\($0)" },
            favorite: favorite
        )
        await store.save(clip)
        title = ""
        source = ""
        text = ""
        tags = ""
        favorite = false
    }

    private func siteName(from urlString: String) -> String {
        guard let host = URL(string: urlString)?.host else { return "" }
        return host.replacingOccurrences(of: "www.", with: "")
    }
}


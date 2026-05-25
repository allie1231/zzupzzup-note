import SwiftUI

struct ShareExtensionView: View {
    let input: ShareInput
    var onComplete: () -> Void
    var onCancel: () -> Void

    @State private var email = KeychainStore.shared.read("shareEmail")
    @State private var password = KeychainStore.shared.read("sharePassword")
    @State private var type: ContentType
    @State private var title: String
    @State private var source: String
    @State private var text: String
    @State private var message = "공유한 항목을 줍줍노트 서버에 저장합니다."
    @State private var isSaving = false

    init(input: ShareInput, onComplete: @escaping () -> Void, onCancel: @escaping () -> Void) {
        self.input = input
        self.onComplete = onComplete
        self.onCancel = onCancel
        _type = State(initialValue: input.suggestedType)
        _title = State(initialValue: input.title)
        _source = State(initialValue: input.url)
        _text = State(initialValue: input.text)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    ZZTag(text: "SHARE")
                    Text("줍줍노트")
                        .font(.system(size: 34, weight: .black))

                    TextField("이메일", text: $email)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)

                    SecureField("비밀번호", text: $password)
                        .textFieldStyle(.roundedBorder)

                    Picker("유형", selection: $type) {
                        ForEach(ContentType.allCases) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)

                    TextField("제목", text: $title)
                        .textFieldStyle(.roundedBorder)
                    TextField("출처", text: $source)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)

                    TextEditor(text: $text)
                        .frame(minHeight: 120)
                        .overlay(Rectangle().stroke(.black, lineWidth: 1))

                    Text(message)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Button {
                        Task { await save() }
                    } label: {
                        Label(isSaving ? "저장 중" : "서버에 줍줍하기", systemImage: "square.and.arrow.down")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                    .disabled(isSaving)
                }
                .padding(18)
                .zzCard()
                .padding(18)
            }
            .background(ZZStyle.page)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기", action: onCancel)
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        do {
            let client = SupabaseClient()
            _ = try await client.signIn(email: email, password: password)
            KeychainStore.shared.save(email, for: "shareEmail")
            KeychainStore.shared.save(password, for: "sharePassword")

            var imagePath = ""
            var imageUrl = ""
            var contentType = type
            if let imageData = input.imageData {
                let uploaded = try await client.uploadImage(data: imageData)
                imagePath = uploaded.path
                imageUrl = uploaded.url
                contentType = .image
            }

            var clip = Clip(
                contentType: contentType,
                sentence: text,
                source: source,
                siteName: siteName(from: source),
                imagePath: imagePath,
                imageUrl: imageUrl,
                title: title
            )
            if contentType == .video, clip.title.isEmpty {
                clip.title = "주운 동영상"
            }
            _ = try await client.upsert(clip)
            message = "저장했습니다."
            onComplete()
        } catch {
            message = error.localizedDescription
        }
    }

    private func siteName(from urlString: String) -> String {
        guard let host = URL(string: urlString)?.host else { return "" }
        return host.replacingOccurrences(of: "www.", with: "")
    }
}


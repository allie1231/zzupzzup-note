import PhotosUI
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

struct CaptureView: View {
    @EnvironmentObject private var store: ClipStore
    @State private var type: ContentType = .link
    @State private var title = ""
    @State private var source = ""
    @State private var text = ""
    @State private var tags = ""
    @State private var favorite = false
    @State private var pickedImage: PhotosPickerItem?
    @State private var pickedImageData: Data?
    @State private var previewImage: Image?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ZZTag(text: "CAPTURE")
                    Picker("유형", selection: $type) {
                        ForEach(ContentType.allCases) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)

                    TextField("제목", text: $title)
                        .textFieldStyle(.roundedBorder)
                    TextField("링크 URL", text: $source)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)

                    Button("링크 제목 자동 채우기") {
                        Task { await fillMetadata() }
                    }
                    .buttonStyle(.bordered)
                    .tint(.black)

                    TextEditor(text: $text)
                        .frame(minHeight: 160)
                        .overlay(Rectangle().stroke(.black, lineWidth: 1))

                    TextField("#태그 #메모", text: $tags)
                        .textFieldStyle(.roundedBorder)
                    Toggle("자주 보는 것", isOn: $favorite)

                    PhotosPicker(selection: $pickedImage, matching: .images) {
                        Label("사진함에서 이미지 선택", systemImage: "photo")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(.black)

                    if let previewImage {
                        previewImage
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 220)
                            .border(.black)
                    }

                    Button {
                        Task { await save() }
                    } label: {
                        Label("서버에 저장", systemImage: "square.and.arrow.down")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                }
                .padding(18)
                .zzCard()
                .padding(18)
            }
            .background(ZZStyle.page)
            .navigationTitle("모바일 줍기")
            .onChange(of: pickedImage) { _, item in
                Task { await loadPickedImage(item) }
            }
        }
    }

    private func save() async {
        var imagePath = ""
        var imageUrl = ""
        if let pickedImageData, let uploaded = await store.uploadImage(data: pickedImageData) {
            imagePath = uploaded.path
            imageUrl = uploaded.url
            type = .image
        }

        let clip = Clip(
            contentType: type,
            sentence: text,
            source: source,
            siteName: siteName(from: source),
            imagePath: imagePath,
            imageUrl: imageUrl,
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
        pickedImage = nil
        pickedImageData = nil
        previewImage = nil
    }

    private func fillMetadata() async {
        guard let metadata = await MetadataService.fetch(urlString: source) else { return }
        if title.isEmpty { title = metadata.title }
        if source.contains("youtube.com") || source.contains("youtu.be") {
            type = .video
        }
    }

    private func loadPickedImage(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        if let data = try? await item.loadTransferable(type: Data.self) {
            #if canImport(UIKit)
            if let uiImage = UIImage(data: data) {
                pickedImageData = uiImage.jpegData(compressionQuality: 0.9) ?? data
                previewImage = Image(uiImage: uiImage)
            }
            #else
            pickedImageData = data
            #endif
        }
    }

    private func siteName(from urlString: String) -> String {
        guard let host = URL(string: urlString)?.host else { return "" }
        return host.replacingOccurrences(of: "www.", with: "")
    }
}

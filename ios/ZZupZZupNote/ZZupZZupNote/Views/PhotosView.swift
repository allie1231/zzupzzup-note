import SwiftUI

struct PhotosView: View {
    @EnvironmentObject private var store: ClipStore
    @State private var mediaType: ContentType? = nil

    private var media: [Clip] {
        store.mediaClips
            .filter { mediaType == nil || $0.contentType == mediaType }
            .prefix(60)
            .map { $0 }
    }

    private let columns = [
        GridItem(.adaptive(minimum: 150), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                Picker("미디어", selection: $mediaType) {
                    Text("전체").tag(Optional<ContentType>.none)
                    Text("이미지").tag(Optional(ContentType.image))
                    Text("동영상").tag(Optional(ContentType.video))
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(media) { clip in
                        NavigationLink {
                            ClipDetailView(clip: clip)
                        } label: {
                            MediaTile(clip: clip)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .background(Color(.systemGray6))
            .navigationTitle("줍줍사진")
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

struct MediaTile: View {
    let clip: Clip

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            AsyncImage(url: previewURL) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    Rectangle().fill(Color(.systemGray5))
                }
            }
            .frame(height: 170)
            .clipped()

            if clip.contentType == .video {
                Image(systemName: "play.fill")
                    .padding(8)
                    .background(.black)
                    .foregroundStyle(.white)
            }
        }
        .border(.black)
    }

    private var previewURL: URL? {
        if clip.contentType == .video, let youtube = youtubeThumbnailURL(from: clip.source) {
            return youtube
        }
        return URL(string: clip.imageUrl)
    }

    private func youtubeThumbnailURL(from source: String) -> URL? {
        guard let url = URL(string: source), let host = url.host else { return nil }
        let id: String?
        if host.contains("youtu.be") {
            id = url.pathComponents.dropFirst().first
        } else if host.contains("youtube.com") {
            id = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?
                .first(where: { $0.name == "v" })?
                .value
        } else {
            id = nil
        }
        guard let id else { return nil }
        return URL(string: "https://img.youtube.com/vi/\(id)/hqdefault.jpg")
    }
}


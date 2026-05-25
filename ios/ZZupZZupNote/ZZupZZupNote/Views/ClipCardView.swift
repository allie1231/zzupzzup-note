import SwiftUI

struct ClipCardView: View {
    let clip: Clip
    var onFavorite: () -> Void
    var onDone: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(clip.contentType.rawValue.uppercased())
                        .font(.caption.monospaced())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black)
                        .foregroundStyle(.white)

                    Text(displayTitle)
                        .font(.headline)
                        .lineLimit(2)
                }

                Spacer()

                Button(action: onFavorite) {
                    Image(systemName: clip.favorite ? "star.fill" : "star")
                }
                .buttonStyle(.plain)
            }

            if !clip.sentence.isEmpty {
                Text(clip.sentence)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .lineLimit(4)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let url = URL(string: clip.imageUrl), clip.contentType == .image {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        Rectangle().fill(Color(.systemGray5))
                    }
                }
                .frame(height: 150)
                .clipped()
                .border(.black)
            }

            HStack {
                Text(clip.status.rawValue)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("정리 완료", action: onDone)
                    .buttonStyle(.bordered)
                    .disabled(clip.status == .done)
            }
        }
        .padding(16)
        .background(Color.white)
        .border(.black, width: 1.5)
        .shadow(color: .black.opacity(0.25), radius: 0, x: 4, y: 4)
    }

    private var displayTitle: String {
        if !clip.title.isEmpty { return clip.title }
        if !clip.siteName.isEmpty { return clip.siteName }
        if !clip.source.isEmpty { return clip.source }
        return "주운 정보"
    }
}


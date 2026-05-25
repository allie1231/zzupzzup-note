import Foundation

enum ContentType: String, CaseIterable, Identifiable, Codable {
    case sentence = "문장"
    case link = "링크"
    case image = "이미지"
    case video = "동영상"
    case material = "자료"

    var id: String { rawValue }
}

enum ClipStatus: String, CaseIterable, Identifiable, Codable {
    case inbox = "새로 수집"
    case reviewed = "확인함"
    case done = "정리 완료"
    case used = "활용함"
    case archived = "보관함"

    var id: String { rawValue }
}

struct Clip: Identifiable, Codable, Equatable {
    var id: String
    var createdAt: Date
    var contentType: ContentType
    var sentence: String
    var reason: String
    var connection: String
    var useFor: String
    var action: String
    var source: String
    var siteName: String
    var iconUrl: String
    var imagePath: String
    var imageUrl: String
    var title: String
    var tags: [String]
    var status: ClipStatus
    var favorite: Bool
    var reviewCount: Int
    var lastReviewed: Date?
    var updatedAt: Date?
    var pins: [PhotoPin] {
        get { PhotoPin.decode(from: connection) }
        set { connection = PhotoPin.encode(newValue, into: connection) }
    }

    init(
        id: String = UUID().uuidString,
        createdAt: Date = Date(),
        contentType: ContentType = .link,
        sentence: String = "",
        reason: String = "",
        connection: String = "",
        useFor: String = "정리필요",
        action: String = "정리필요",
        source: String = "",
        siteName: String = "",
        iconUrl: String = "",
        imagePath: String = "",
        imageUrl: String = "",
        title: String = "",
        tags: [String] = [],
        status: ClipStatus = .inbox,
        favorite: Bool = false,
        reviewCount: Int = 0,
        lastReviewed: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.createdAt = createdAt
        self.contentType = contentType
        self.sentence = sentence
        self.reason = reason
        self.connection = connection
        self.useFor = useFor
        self.action = action
        self.source = source
        self.siteName = siteName
        self.iconUrl = iconUrl
        self.imagePath = imagePath
        self.imageUrl = imageUrl
        self.title = title
        self.tags = tags
        self.status = status
        self.favorite = favorite
        self.reviewCount = reviewCount
        self.lastReviewed = lastReviewed
        self.updatedAt = updatedAt
    }
}

struct PhotoPin: Identifiable, Codable, Equatable {
    var id: String
    var x: Double
    var y: Double
    var note: String

    init(id: String = UUID().uuidString, x: Double, y: Double, note: String = "") {
        self.id = id
        self.x = x
        self.y = y
        self.note = note
    }

    private static let start = "[줍줍사진 핀]"
    private static let end = "[/줍줍사진 핀]"

    static func decode(from text: String) -> [PhotoPin] {
        guard
            let startRange = text.range(of: start),
            let endRange = text.range(of: end),
            startRange.upperBound <= endRange.lowerBound
        else { return [] }

        let jsonText = text[startRange.upperBound..<endRange.lowerBound]
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let data = jsonText.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([PhotoPin].self, from: data)) ?? []
    }

    static func encode(_ pins: [PhotoPin], into text: String) -> String {
        let cleaned = removeBlock(from: text)
        guard !pins.isEmpty else { return cleaned }
        let data = (try? JSONEncoder().encode(pins)) ?? Data("[]".utf8)
        let json = String(data: data, encoding: .utf8) ?? "[]"
        return [cleaned, start, json, end]
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .joined(separator: "\n")
    }

    private static func removeBlock(from text: String) -> String {
        guard
            let startRange = text.range(of: start),
            let endRange = text.range(of: end),
            startRange.upperBound <= endRange.lowerBound
        else { return text }

        var next = text
        next.removeSubrange(startRange.lowerBound..<endRange.upperBound)
        return next.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct ClipRow: Codable {
    var id: String
    var userId: String?
    var createdAt: Date?
    var contentType: String
    var sentence: String
    var reason: String
    var connection: String
    var useFor: String
    var action: String
    var source: String
    var siteName: String
    var iconUrl: String
    var imagePath: String
    var imageUrl: String
    var title: String
    var tags: [String]
    var status: String
    var favorite: Bool
    var reviewCount: Int
    var lastReviewed: Date?
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case createdAt = "created_at"
        case contentType = "content_type"
        case sentence
        case reason
        case connection
        case useFor = "use_for"
        case action
        case source
        case siteName = "site_name"
        case iconUrl = "icon_url"
        case imagePath = "image_path"
        case imageUrl = "image_url"
        case title
        case tags
        case status
        case favorite
        case reviewCount = "review_count"
        case lastReviewed = "last_reviewed"
        case updatedAt = "updated_at"
    }

    init(clip: Clip) {
        id = clip.id
        userId = nil
        createdAt = clip.createdAt
        contentType = clip.contentType.rawValue
        sentence = clip.sentence
        reason = clip.reason
        connection = clip.connection
        useFor = clip.useFor
        action = clip.action
        source = clip.source
        siteName = clip.siteName
        iconUrl = clip.iconUrl
        imagePath = clip.imagePath
        imageUrl = clip.imageUrl
        title = clip.title
        tags = clip.tags
        status = clip.status.rawValue
        favorite = clip.favorite
        reviewCount = clip.reviewCount
        lastReviewed = clip.lastReviewed
        updatedAt = Date()
    }

    func toClip() -> Clip {
        Clip(
            id: id,
            createdAt: createdAt ?? Date(),
            contentType: ContentType(rawValue: contentType) ?? .link,
            sentence: sentence,
            reason: reason,
            connection: connection,
            useFor: useFor.isEmpty ? "정리필요" : useFor,
            action: action.isEmpty ? "정리필요" : action,
            source: source,
            siteName: siteName,
            iconUrl: iconUrl,
            imagePath: imagePath,
            imageUrl: imageUrl,
            title: title,
            tags: tags,
            status: ClipStatus(rawValue: status) ?? .inbox,
            favorite: favorite,
            reviewCount: reviewCount,
            lastReviewed: lastReviewed,
            updatedAt: updatedAt
        )
    }
}

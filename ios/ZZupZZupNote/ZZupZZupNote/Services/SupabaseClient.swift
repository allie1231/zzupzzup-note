import Foundation

struct SupabaseSession: Codable {
    var accessToken: String
    var refreshToken: String
    var userId: String

    var isSignedIn: Bool {
        !accessToken.isEmpty
    }
}

struct SupabaseAuthResponse: Codable {
    struct User: Codable {
        var id: String
    }

    var accessToken: String
    var refreshToken: String
    var user: User?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

final class SupabaseClient {
    var baseURL: URL
    var anonKey: String
    var session: SupabaseSession

    init(
        baseURL: URL = AppConfig.defaultSupabaseURL,
        anonKey: String = AppConfig.defaultAnonKey,
        session: SupabaseSession = SupabaseSession(accessToken: "", refreshToken: "", userId: "")
    ) {
        self.baseURL = baseURL
        self.anonKey = anonKey
        self.session = session
    }

    func signIn(email: String, password: String) async throws -> SupabaseSession {
        let url = baseURL.appending(path: "/auth/v1/token")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "password")]

        let response: SupabaseAuthResponse = try await request(
            components.url!,
            method: "POST",
            authorized: false,
            body: [
                "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
                "password": password
            ]
        )

        let next = SupabaseSession(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            userId: response.user?.id ?? ""
        )
        session = next
        return next
    }

    func refreshSession() async throws -> SupabaseSession {
        guard !session.refreshToken.isEmpty else {
            throw SupabaseError.message("로그인 세션이 없습니다.")
        }

        let url = baseURL.appending(path: "/auth/v1/token")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token")]

        let response: SupabaseAuthResponse = try await request(
            components.url!,
            method: "POST",
            authorized: false,
            body: ["refresh_token": session.refreshToken]
        )

        let next = SupabaseSession(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken.isEmpty ? session.refreshToken : response.refreshToken,
            userId: response.user?.id ?? session.userId
        )
        session = next
        return next
    }

    func fetchClips() async throws -> [Clip] {
        let url = baseURL.appending(path: "/rest/v1/\(AppConfig.tableName)")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ]

        let rows: [ClipRow] = try await authorizedRequest(components.url!, method: "GET")
        return rows.map { $0.toClip() }
    }

    func upsert(_ clip: Clip) async throws -> Clip {
        let url = baseURL.appending(path: "/rest/v1/\(AppConfig.tableName)")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "on_conflict", value: "id")]

        let rows: [ClipRow] = try await authorizedRequest(
            components.url!,
            method: "POST",
            extraHeaders: ["Prefer": "resolution=merge-duplicates,return=representation"],
            body: [ClipRow(clip: clip)]
        )
        return rows.first?.toClip() ?? clip
    }

    func deleteClip(id: String) async throws {
        let url = baseURL.appending(path: "/rest/v1/\(AppConfig.tableName)")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "id", value: "eq.\(id)")]
        let _: EmptyResponse = try await authorizedRequest(components.url!, method: "DELETE")
    }

    private func authorizedRequest<T: Decodable>(
        _ url: URL,
        method: String,
        extraHeaders: [String: String] = [:],
        body: Encodable? = nil
    ) async throws -> T {
        do {
            return try await request(url, method: method, authorized: true, extraHeaders: extraHeaders, body: body)
        } catch SupabaseError.unauthorized {
            _ = try await refreshSession()
            return try await request(url, method: method, authorized: true, extraHeaders: extraHeaders, body: body)
        }
    }

    private func request<T: Decodable>(
        _ url: URL,
        method: String,
        authorized: Bool,
        extraHeaders: [String: String] = [:],
        body: Encodable? = nil
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if authorized {
            guard !session.accessToken.isEmpty else {
                throw SupabaseError.message("로그인이 필요합니다.")
            }
            request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        }
        extraHeaders.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }

        if let body {
            request.httpBody = try JSONEncoder.supabase.encode(AnyEncodable(body))
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw SupabaseError.message("서버 응답을 읽지 못했습니다.")
        }
        if http.statusCode == 401 {
            throw SupabaseError.unauthorized
        }
        guard (200..<300).contains(http.statusCode) else {
            throw SupabaseError.message(parseErrorMessage(data) ?? "Supabase 요청에 실패했습니다.")
        }

        if data.isEmpty || T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }
        return try JSONDecoder.supabase.decode(T.self, from: data)
    }

    private func parseErrorMessage(_ data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return String(data: data, encoding: .utf8)
        }
        return object["message"] as? String
            ?? object["error_description"] as? String
            ?? object["error"] as? String
    }
}

struct EmptyResponse: Codable {}

struct AnyEncodable: Encodable {
    private let encodeValue: (Encoder) throws -> Void

    init(_ value: Encodable) {
        encodeValue = value.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeValue(encoder)
    }
}

enum SupabaseError: LocalizedError {
    case unauthorized
    case message(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "로그인 세션이 만료되었습니다."
        case .message(let message):
            return message
        }
    }
}

extension JSONEncoder {
    static var supabase: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

extension JSONDecoder {
    static var supabase: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let text = try container.decode(String.self)
            if let date = DateFormatters.iso8601WithFractional.date(from: text)
                ?? DateFormatters.iso8601.date(from: text) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid ISO8601 date: \(text)")
        }
        return decoder
    }
}

enum DateFormatters {
    static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let iso8601WithFractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

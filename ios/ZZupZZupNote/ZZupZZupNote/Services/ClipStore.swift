import Foundation
import SwiftUI

@MainActor
final class ClipStore: ObservableObject {
    @Published var clips: [Clip] = []
    @Published var isLoading = false
    @Published var message = "로그인하면 Supabase 저장함을 불러옵니다."
    @Published var email = ""
    @Published var password = ""
    @Published var isSignedIn = false

    private let keychain = KeychainStore.shared
    private let client: SupabaseClient

    init(client: SupabaseClient = SupabaseClient()) {
        self.client = client
        restoreCredentials()
    }

    var inboxClips: [Clip] {
        clips.filter { $0.status != .done }
    }

    var sentenceClips: [Clip] {
        clips.filter { $0.contentType == .sentence }
    }

    var mediaClips: [Clip] {
        clips.filter { $0.contentType == .image || $0.contentType == .video }
    }

    func signIn() async {
        guard !email.isEmpty, !password.isEmpty else {
            message = "이메일과 비밀번호를 입력해 주세요."
            return
        }

        await runLoading {
            let session = try await client.signIn(email: email, password: password)
            saveCredentials(session: session)
            isSignedIn = true
            message = "로그인되었습니다."
            try await reload()
        }
    }

    func signOut() {
        ["email", "password", "accessToken", "refreshToken", "userId"].forEach(keychain.delete)
        client.session = SupabaseSession(accessToken: "", refreshToken: "", userId: "")
        clips = []
        email = ""
        password = ""
        isSignedIn = false
        message = "로그아웃했습니다."
    }

    func reload() async throws {
        let fetched = try await client.fetchClips()
        clips = fetched.sorted { $0.createdAt > $1.createdAt }
        message = "서버에서 \(clips.count)개를 불러왔습니다."
        saveSession()
    }

    func reloadTapped() async {
        await runLoading {
            try await reload()
        }
    }

    func save(_ clip: Clip) async {
        await runLoading {
            let saved = try await client.upsert(clip)
            upsertLocal(saved)
            message = "서버에 저장했습니다."
            saveSession()
        }
    }

    func delete(_ clip: Clip) async {
        await runLoading {
            try await client.deleteClip(id: clip.id)
            clips.removeAll { $0.id == clip.id }
            message = "삭제했습니다."
            saveSession()
        }
    }

    func markDone(_ clip: Clip) async {
        var next = clip
        next.status = .done
        next.reviewCount += 1
        next.lastReviewed = Date()
        await save(next)
    }

    func toggleFavorite(_ clip: Clip) async {
        var next = clip
        next.favorite.toggle()
        await save(next)
    }

    private func upsertLocal(_ clip: Clip) {
        if let index = clips.firstIndex(where: { $0.id == clip.id }) {
            clips[index] = clip
        } else {
            clips.insert(clip, at: 0)
        }
        clips.sort { $0.createdAt > $1.createdAt }
    }

    private func restoreCredentials() {
        email = keychain.read("email")
        password = keychain.read("password")
        let session = SupabaseSession(
            accessToken: keychain.read("accessToken"),
            refreshToken: keychain.read("refreshToken"),
            userId: keychain.read("userId")
        )
        client.session = session
        isSignedIn = session.isSignedIn
        if isSignedIn {
            message = "저장된 로그인 세션이 있습니다. 새로고침을 눌러 주세요."
        }
    }

    private func saveCredentials(session: SupabaseSession) {
        keychain.save(email, for: "email")
        keychain.save(password, for: "password")
        keychain.save(session.accessToken, for: "accessToken")
        keychain.save(session.refreshToken, for: "refreshToken")
        keychain.save(session.userId, for: "userId")
    }

    private func saveSession() {
        keychain.save(client.session.accessToken, for: "accessToken")
        keychain.save(client.session.refreshToken, for: "refreshToken")
        keychain.save(client.session.userId, for: "userId")
    }

    private func runLoading(_ work: () async throws -> Void) async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await work()
        } catch {
            message = error.localizedDescription
        }
    }
}


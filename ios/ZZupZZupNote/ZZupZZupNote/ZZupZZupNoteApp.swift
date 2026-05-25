import SwiftUI

@main
struct ZZupZZupNoteApp: App {
    @StateObject private var store = ClipStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}


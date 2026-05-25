import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: ClipStore

    var body: some View {
        Group {
            if store.isSignedIn {
                TabView {
                    HomeView()
                        .tabItem { Label("웹홈", systemImage: "square.grid.2x2") }

                    CaptureView()
                        .tabItem { Label("줍기", systemImage: "plus.square") }

                    SentencesView()
                        .tabItem { Label("문장", systemImage: "quote.bubble") }

                    PhotosView()
                        .tabItem { Label("사진", systemImage: "photo.on.rectangle") }
                }
                .overlay(alignment: .bottom) {
                    if store.isLoading {
                        ProgressView()
                            .padding(12)
                            .background(.regularMaterial)
                            .clipShape(Capsule())
                            .padding(.bottom, 58)
                    }
                }
                .task {
                    await store.reloadTapped()
                }
            } else {
                LoginView()
            }
        }
    }
}


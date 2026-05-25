import SwiftUI

enum ZZStyle {
    static let page = Color(red: 0.56, green: 0.56, blue: 0.53)
    static let paper = Color(red: 0.98, green: 0.98, blue: 0.95)
    static let ink = Color.black
    static let muted = Color(red: 0.38, green: 0.38, blue: 0.38)
}

struct ZZCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(ZZStyle.paper)
            .overlay(Rectangle().stroke(.black, lineWidth: 1.5))
    }
}

extension View {
    func zzCard() -> some View {
        modifier(ZZCardModifier())
    }
}

struct ZZTag: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption.monospaced())
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Color.black)
            .foregroundStyle(.white)
    }
}

import SwiftUI
import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        Task {
            let input = await ShareInput.load(from: extensionContext)
            await MainActor.run {
                let view = ShareExtensionView(input: input) { [weak self] in
                    self?.extensionContext?.completeRequest(returningItems: nil)
                } onCancel: { [weak self] in
                    self?.extensionContext?.cancelRequest(withError: ShareError.cancelled)
                }
                let host = UIHostingController(rootView: view)
                addChild(host)
                view.addSubview(host.view)
                host.view.translatesAutoresizingMaskIntoConstraints = false
                NSLayoutConstraint.activate([
                    host.view.topAnchor.constraint(equalTo: view.topAnchor),
                    host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                    host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                    host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
                ])
                host.didMove(toParent: self)
            }
        }
    }
}

enum ShareError: Error {
    case cancelled
}

struct ShareInput {
    var url = ""
    var title = ""
    var text = ""
    var imageData: Data?

    var suggestedType: ContentType {
        if imageData != nil { return .image }
        if url.contains("youtube.com") || url.contains("youtu.be") { return .video }
        if !url.isEmpty { return .link }
        return .sentence
    }

    static func load(from context: NSExtensionContext?) async -> ShareInput {
        var input = ShareInput()
        let providers = context?.inputItems
            .compactMap { $0 as? NSExtensionItem }
            .flatMap { $0.attachments ?? [] } ?? []

        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
               let item = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier),
               let url = item as? URL {
                input.url = url.absoluteString
            }

            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
               let item = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier),
               let text = item as? String {
                if input.text.isEmpty { input.text = text }
            }

            if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier),
               let item = try? await provider.loadItem(forTypeIdentifier: UTType.image.identifier) {
                if let url = item as? URL {
                    input.imageData = try? Data(contentsOf: url)
                } else if let image = item as? UIImage {
                    input.imageData = image.jpegData(compressionQuality: 0.9)
                } else if let data = item as? Data {
                    input.imageData = data
                }
            }
        }

        if let metadata = await MetadataService.fetch(urlString: input.url) {
            input.title = metadata.title
        }
        return input
    }
}

extension NSItemProvider {
    func loadItem(forTypeIdentifier typeIdentifier: String) async throws -> NSSecureCoding? {
        try await withCheckedThrowingContinuation { continuation in
            loadItem(forTypeIdentifier: typeIdentifier) { item, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: item)
                }
            }
        }
    }
}


import Foundation

struct LinkMetadata {
    var title: String
    var siteName: String
}

enum MetadataService {
    static func fetch(urlString: String) async -> LinkMetadata? {
        guard let url = URL(string: urlString), ["http", "https"].contains(url.scheme?.lowercased()) else {
            return nil
        }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let html = String(data: data, encoding: .utf8)
                    ?? String(data: data, encoding: .isoLatin1) else {
                return LinkMetadata(title: "", siteName: siteName(from: url))
            }
            return LinkMetadata(
                title: extractMeta("og:title", from: html) ?? extractTitle(from: html) ?? "",
                siteName: extractMeta("og:site_name", from: html) ?? siteName(from: url)
            )
        } catch {
            return LinkMetadata(title: "", siteName: siteName(from: url))
        }
    }

    static func siteName(from url: URL) -> String {
        (url.host ?? "").replacingOccurrences(of: "www.", with: "")
    }

    private static func extractMeta(_ property: String, from html: String) -> String? {
        let pattern = #"<meta[^>]+(?:property|name)=["']\#(property)["'][^>]+content=["']([^"']+)["'][^>]*>"#
        return firstMatch(pattern, in: html)
    }

    private static func extractTitle(from html: String) -> String? {
        firstMatch(#"<title[^>]*>(.*?)</title>"#, in: html)
    }

    private static func firstMatch(_ pattern: String, in html: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators]) else {
            return nil
        }
        let range = NSRange(html.startIndex..<html.endIndex, in: html)
        guard let match = regex.firstMatch(in: html, range: range), match.numberOfRanges > 1 else {
            return nil
        }
        let captureRange = match.range(at: match.numberOfRanges - 1)
        guard let swiftRange = Range(captureRange, in: html) else { return nil }
        return html[swiftRange]
            .replacingOccurrences(of: "\n", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}


import Foundation
import WebKit

/* the app has no server, so this is one: it serves the web/ folder out of the
   app bundle.

   a custom scheme rather than file:// on purpose. a file url is an opaque
   origin, and webkit refuses to keep localStorage for one — the notebook would
   quietly empty itself on every launch. app://local is a real origin, so the
   page can save. */
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "app"
    static let host = "local"

    /* where the app starts */
    static var startURL: URL {
        URL(string: "\(scheme)://\(host)/index.html") ?? URL(fileURLWithPath: "/")
    }

    private static let types: [String: String] = [
        "html": "text/html; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "js": "text/javascript; charset=utf-8",
        "json": "application/json; charset=utf-8",
        "woff2": "font/woff2",
        "svg": "image/svg+xml",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "txt": "text/plain; charset=utf-8"
    ]

    /* resourceURL/web — but the folder reference may arrive capitalised
       depending on how the project was generated, so both are tried */
    private lazy var root: URL? = {
        guard let base = Bundle.main.resourceURL else { return nil }
        for name in ["web", "Web"] {
            let candidate = base.appendingPathComponent(name, isDirectory: true)
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        }
        return nil
    }()

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return fail(task) }
        guard let root = root else { return fail(task) }
        guard var file = resolve(url, under: root) else { return fail(task) }

        if !FileManager.default.fileExists(atPath: file.path) {
            // a path with no extension is a page request; the app is one page,
            // so hand it the page. anything else is a genuinely missing asset.
            if file.pathExtension.isEmpty {
                file = root.appendingPathComponent("index.html")
            }
            guard FileManager.default.fileExists(atPath: file.path) else { return fail(task) }
        }
        guard let data = try? Data(contentsOf: file) else { return fail(task) }

        let type = Self.types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        let headers = [
            "Content-Type": type,
            "Content-Length": String(data.count),
            // always re-read: this is a local file and the page is not versioned
            "Cache-Control": "no-cache"
        ]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)
            ?? URLResponse(url: url, mimeType: type, expectedContentLength: data.count, textEncodingName: nil)

        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    /* nothing to cancel: every response above is written before this can be
       called, because the bundle is read synchronously */
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    /* the request path, confined to the web folder */
    private func resolve(_ url: URL, under root: URL) -> URL? {
        let decoded = url.path.removingPercentEncoding ?? url.path
        let parts = decoded.split(separator: "/").map(String.init).filter { !$0.isEmpty && $0 != "." }
        guard !parts.contains("..") else { return nil }

        var relative = parts.joined(separator: "/")
        if relative.isEmpty { relative = "index.html" }

        var candidate = root.appendingPathComponent(relative)
        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: candidate.path, isDirectory: &isDirectory), isDirectory.boolValue {
            candidate = candidate.appendingPathComponent("index.html")
        }

        // belt and braces: whatever comes out must still live inside the folder
        let base = root.resolvingSymlinksInPath().standardizedFileURL.path
        let target = candidate.standardizedFileURL.path
        guard target == base || target.hasPrefix(base + "/") else { return nil }
        return candidate
    }

    private func fail(_ task: WKURLSchemeTask) {
        task.didFailWithError(NSError(domain: NSURLErrorDomain,
                                      code: NSURLErrorFileDoesNotExist,
                                      userInfo: [NSLocalizedDescriptionKey: "not in the app bundle"]))
    }
}

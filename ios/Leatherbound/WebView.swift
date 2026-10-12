import SwiftUI
import WebKit

/* the paper the app is printed on, taken from css/tokens.css so the launch
   screen, the web view and the page are the same colour and nothing flashes
   white while the first paint happens */
enum Paper {
    private static let light = UIColor(red: 0xfb / 255.0, green: 0xf4 / 255.0, blue: 0xe4 / 255.0, alpha: 1)
    private static let dark = UIColor(red: 0x1d / 255.0, green: 0x19 / 255.0, blue: 0x14 / 255.0, alpha: 1)

    static var backgroundUIColor: UIColor {
        UIColor { $0.userInterfaceStyle == .dark ? dark : light }
    }

    static var background: Color { Color(uiColor: backgroundUIColor) }
}

struct WebView: UIViewRepresentable {
    /* set when the page itself could not be opened, so the app can say so
       instead of showing an empty screen */
    @Binding var failure: String?
    /* bumped by the view to ask for another load */
    var attempt: Int

    func makeCoordinator() -> Coordinator {
        Coordinator(failure: $failure)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()             // localStorage has to outlive the process
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = false
        web.allowsLinkPreview = false
        web.isOpaque = false
        web.backgroundColor = Paper.backgroundUIColor
        web.scrollView.backgroundColor = Paper.backgroundUIColor
        web.scrollView.bounces = false
        web.scrollView.showsVerticalScrollIndicator = false
        /* the page does its own safe-area padding with env(), so webkit must not
           add a second set of insets on top of it */
        web.scrollView.contentInsetAdjustmentBehavior = .never

        context.coordinator.start(web, attempt: attempt)
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        context.coordinator.retryIfAsked(web, attempt: attempt)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let failure: Binding<String?>
        private var lastAttempt = -1

        init(failure: Binding<String?>) {
            self.failure = failure
        }

        func start(_ web: WKWebView, attempt: Int) {
            lastAttempt = attempt
            web.load(URLRequest(url: BundleSchemeHandler.startURL))
        }

        func retryIfAsked(_ web: WKWebView, attempt: Int) {
            guard attempt != lastAttempt else { return }
            lastAttempt = attempt
            failure.wrappedValue = nil
            web.load(URLRequest(url: BundleSchemeHandler.startURL))
        }

        /* a real link belongs in the browser, not trapped inside the app */
        func webView(_ web: WKWebView,
                     decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url, let scheme = url.scheme?.lowercased() else {
                decisionHandler(.cancel)
                return
            }
            if scheme == BundleSchemeHandler.scheme {
                decisionHandler(.allow)
                return
            }
            if UIApplication.shared.canOpenURL(url) { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        }

        func webView(_ web: WKWebView, didFinish navigation: WKNavigation!) {
            failure.wrappedValue = nil
        }

        func webView(_ web: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            failure.wrappedValue = error.localizedDescription
        }

        func webView(_ web: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            failure.wrappedValue = error.localizedDescription
        }

        /* webkit kills its content process under memory pressure; the notebook is
           already on disk, so the honest answer is to load the page again */
        func webViewWebContentProcessDidTerminate(_ web: WKWebView) {
            web.load(URLRequest(url: BundleSchemeHandler.startURL))
        }
    }
}

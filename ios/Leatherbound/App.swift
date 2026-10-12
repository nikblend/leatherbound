import SwiftUI

/* the planner is a single page in web/, so the app is a single web view around
   it — no storyboards, nothing to keep in step with the page */
@main
struct LeatherboundApp: App {
    var body: some Scene {
        WindowGroup {
            PlannerView()
        }
    }
}

private struct PlannerView: View {
    @State private var failure: String?
    @State private var attempt = 0

    var body: some View {
        ZStack {
            Paper.background.ignoresSafeArea()
            /* the container ignores the top and bottom safe areas because the
               page pads itself with env(safe-area-inset-*). the keyboard is left
               alone on purpose: when the note sheet opens, the web view shrinks
               so the composer stays above the keyboard instead of under it. */
            WebView(failure: $failure, attempt: attempt)
                .ignoresSafeArea(.container, edges: [.top, .bottom])
        }
        .overlay {
            if let failure {
                Message(text: failure) {
                    attempt += 1
                    self.failure = nil
                }
            }
        }
    }
}

/* only ever seen if the bundle is broken: a page that cannot load says why */
private struct Message: View {
    let text: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Text("Leatherbound could not open its pages.")
                .font(.headline)
            Text(text)
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try again", action: retry)
                .buttonStyle(.borderedProminent)
        }
        .padding(22)
        .frame(maxWidth: 300)
        .background(Paper.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(radius: 12)
    }
}

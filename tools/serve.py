#!/usr/bin/env python3
"""Serve web/ the way the phone serves it.

    python3 tools/serve.py [port]        # defaults to 8137

In the app the page is served by BundleScheme.swift, which answers every request with
Cache-Control: no-cache, because the page is a local file that changes whenever it is
edited.  `python3 -m http.server` sends no cache headers at all, and a browser is then
free to reuse a stylesheet or a script it fetched half an hour ago — which is how a page
ends up running yesterday's JavaScript against today's HTML, and how a fix appears not to
work.  Same headers here, so the harness cannot lie.
"""

import http.server
import os
import socketserver
import sys

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8137
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        print("leatherbound on http://127.0.0.1:%d/ (serving web/, no caching)" % port)
        httpd.serve_forever()


if __name__ == "__main__":
    main()

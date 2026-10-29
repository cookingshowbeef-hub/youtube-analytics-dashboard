import http.server
import socketserver
import os

PORT = 4173
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class RobustHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, ConnectionError):
            pass

    def do_GET(self):
        # Handle /api/oauth/status gracefully if requested
        if self.path == '/api/oauth/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"ready","connected":true}')
            return
        super().do_GET()

class DualStackServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with DualStackServer(('127.0.0.1', PORT), RobustHTTPRequestHandler) as httpd:
        print(f"Serving robust HTTP on 127.0.0.1 port {PORT} (Directory: {DIRECTORY})...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

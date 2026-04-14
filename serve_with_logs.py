import http.server
import socketserver
import json
import logging
import urllib.parse
from datetime import datetime
import os

PORT = 8080
LOG_FILE = "frontend_error.log"

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(message)s'
)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/log':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                
                # Format to a nice readable log string
                time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                msg = data.get('message', 'Unknown Error')
                source = data.get('source', '')
                lineno = data.get('lineno', '')
                stack = data.get('stack', '')
                
                log_entry = f"[{time_str}] ERROR: {msg}"
                if source:
                    log_entry += f"\n  Location: {source}:{lineno}"
                if stack:
                    log_entry += f"\n  Stack Trace:\n{stack}"
                log_entry += "\n" + "="*50 + "\n"
                
                logging.info(log_entry)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b'{"error":"log parsing failed"}')
        else:
            self.send_response(404)
            self.end_headers()

# Disable noisy request logging from standard dev server unless it's an error
def log_message(self, format, *args):
    pass
http.server.SimpleHTTPRequestHandler.log_message = log_message

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Server berjalan di http://localhost:{PORT}")
    print(f"Frontend error logs akan disimpan ke: {os.path.abspath(LOG_FILE)}")
    httpd.serve_forever()

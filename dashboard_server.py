# -*- coding: utf-8 -*-
"""
TubePulse Analytics Dashboard Integrated Server
Serves static frontend assets on port 4173 and provides API endpoints for:
  - /api/oauth/status: Check OAuth connection status & authorized channel
  - /api/oauth/reconnect: Start OAuth listener on port 8080 & return auth URL
  - /api/analytics/test: Query YouTube Analytics API v2 (views, minutes, estimatedRevenue)
"""

import os
import sys
import json
import threading
import http.server
import socketserver
import urllib.parse
from datetime import datetime, timedelta

# Import OAuth service
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import oauth_service

PORT = 4173

class DashboardRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for dev/testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/oauth/status':
            self.handle_oauth_status()
        elif path == '/api/oauth/reconnect' or path == '/api/oauth/start':
            self.handle_oauth_start()
        elif path == '/api/analytics/test':
            self.handle_analytics_test(parsed.query)
        elif path == '/api/analytics/report':
            self.handle_analytics_report(parsed.query)
        elif path == '/api/analytics/report':
            self.handle_analytics_report(parsed.query)
        else:
            # Fall back to serving static files
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/oauth/reconnect' or path == '/api/oauth/start':
            self.handle_oauth_start()
        elif path == '/api/analytics/test':
            self.handle_analytics_test(parsed.query)
        else:
            self.send_error(404, "Endpoint not found")

    def handle_oauth_status(self):
        token_data = oauth_service.load_token()
        if not token_data:
            res = {
                "connected": False,
                "message": "Chưa có token OAuth. Vui lòng kết nối tài khoản chủ kênh."
            }
        else:
            ch = token_data.get("channel", {})
            res = {
                "connected": True,
                "channel": ch,
                "scope": token_data.get("scope", ""),
                "expires_at": token_data.get("expires_at", 0),
                "created_at": token_data.get("created_at", 0),
                "has_monetary": "yt-analytics-monetary.readonly" in token_data.get("scope", ""),
                "has_analytics": "yt-analytics.readonly" in token_data.get("scope", "")
            }
        self.send_json(200, res)

    def handle_oauth_start(self):
        # Generate auth URL
        auth_url = oauth_service.get_authorization_url()
        
        # Start background listener on port 8080 if not already running
        def listener():
            try:
                oauth_service.run_oauth_flow(open_browser=False, port=8080, timeout_seconds=180)
            except Exception as e:
                print(f"[OAuth Server Error] {e}")

        t = threading.Thread(target=listener, daemon=True)
        t.start()

        self.send_json(200, {
            "success": True,
            "auth_url": auth_url,
            "callback_port": 8080,
            "message": "OAuth listener đang hoạt động tại port 8080. Vui lòng mở auth_url để cấp quyền."
        })

    def handle_analytics_report(self, query_string):
        try:
            qs = urllib.parse.parse_qs(query_string)
            channel_id = qs.get("channelId", [None])[0]
            start_date = qs.get("startDate", [None])[0]
            end_date = qs.get("endDate", [None])[0]
            dimensions = qs.get("dimensions", ["day"])[0]
            if dimensions == "none" or dimensions == "":
                dimensions = None
            currency = qs.get("currency", ["USD"])[0]

            res = oauth_service.query_channel_report(
                channel_id=channel_id,
                start_date=start_date,
                end_date=end_date,
                dimensions=dimensions,
                currency=currency
            )
            self.send_json(200 if res.get("success") else 500, res)
        except Exception as e:
            self.send_json(500, {
                "success": False,
                "status": "server_error",
                "error": str(e)
            })

    def handle_analytics_test(self, query_string):
        try:
            qs = urllib.parse.parse_qs(query_string)
            start_date = qs.get("startDate", [None])[0]
            end_date = qs.get("endDate", [None])[0]

            report = oauth_service.test_youtube_analytics_api(start_date=start_date, end_date=end_date)
            if not report:
                self.send_json(500, {
                    "success": False,
                    "error": "Không thể truy vấn YouTube Analytics API. Vui lòng kiểm tra token hoặc quyền tài khoản."
                })
                return

            headers = [h["name"] for h in report.get("columnHeaders", [])]
            rows = report.get("rows", [])
            views = 0
            minutes = 0
            revenue = 0.0

            if rows:
                row_dict = dict(zip(headers, rows[0]))
                views = row_dict.get("views", 0)
                minutes = row_dict.get("estimatedMinutesWatched", 0)
                revenue = row_dict.get("estimatedRevenue", 0.0)

            hours = round(minutes / 60.0, 2)
            proxy_rpm = round((revenue / views * 1000), 2) if views > 0 else 0.0

            tok = oauth_service.load_token() or {}
            self.send_json(200, {
                "success": True,
                "channel": tok.get("channel", {}),
                "metrics": {
                    "views": views,
                    "estimatedMinutesWatched": minutes,
                    "estimatedHoursWatched": hours,
                    "estimatedRevenue": revenue,
                    "proxyRpm": proxy_rpm
                },
                "rawReport": report
            })
        except Exception as e:
            self.send_json(500, {
                "success": False,
                "error": str(e)
            })

    def send_json(self, status_code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), DashboardRequestHandler) as httpd:
        print(f"============================================================")
        print(f"TubePulse Analytics Dashboard Server running at:")
        print(f"  http://127.0.0.1:{PORT}")
        print(f"API Endpoints:")
        print(f"  - GET  /api/oauth/status")
        print(f"  - POST /api/oauth/reconnect")
        print(f"  - GET  /api/analytics/test")
        print(f"============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()

if __name__ == "__main__":
    run()

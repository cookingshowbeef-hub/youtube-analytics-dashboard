# -*- coding: utf-8 -*-
"""
TubePulse YouTube OAuth 2.0 & Analytics API Integration Service
Handles:
  - OAuth 2.0 authorization code flow with offline access & consent prompt
  - Required scopes: youtube.readonly, yt-analytics.readonly, yt-analytics-monetary.readonly, youtube.force-ssl
  - Token persistence (access_token, refresh_token) in oauth_token.json
  - Verification with YouTube Analytics API v2 (views, estimatedMinutesWatched, estimatedRevenue)
"""

import os
import sys
import json
import time
import datetime
import urllib.request
import urllib.parse
import urllib.error
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler

# Working directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(BASE_DIR, "oauth_token.json")
ENV_FILE = os.path.join(BASE_DIR, ".env")

def load_env():
    env_vars = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip()
    return env_vars

# Default Client Credentials loaded dynamically from .env or environment
_env = load_env()
DEFAULT_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", _env.get("GOOGLE_CLIENT_ID", ""))
DEFAULT_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", _env.get("GOOGLE_CLIENT_SECRET", ""))
DEFAULT_CLIENT_SECRET_BACKUP = os.environ.get("GOOGLE_CLIENT_SECRET_BACKUP", _env.get("GOOGLE_CLIENT_SECRET_BACKUP", ""))
DEFAULT_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", _env.get("GOOGLE_REDIRECT_URI", "http://localhost:8080/"))

# App 2 Fallback (Youtube-uploader)
APP2_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID_APP2", _env.get("GOOGLE_CLIENT_ID_APP2", ""))
APP2_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET_APP2", _env.get("GOOGLE_CLIENT_SECRET_APP2", ""))

# Full Scopes
SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube"
]

def get_config():
    env = load_env()
    client_id = env.get("GOOGLE_CLIENT_ID", DEFAULT_CLIENT_ID)
    client_secret = env.get("GOOGLE_CLIENT_SECRET", DEFAULT_CLIENT_SECRET)
    backup_secret = env.get("GOOGLE_CLIENT_SECRET_BACKUP", DEFAULT_CLIENT_SECRET_BACKUP)
    redirect_uri = env.get("GOOGLE_REDIRECT_URI", DEFAULT_REDIRECT_URI)
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "backup_secret": backup_secret,
        "redirect_uri": redirect_uri,
        "app2_client_id": APP2_CLIENT_ID,
        "app2_client_secret": APP2_CLIENT_SECRET,
        "scopes": SCOPES
    }

def get_authorization_url(client_id=None, redirect_uri=None):
    cfg = get_config()
    cid = client_id or cfg["client_id"]
    ruri = redirect_uri or cfg["redirect_uri"]
    
    params = {
        "client_id": cid,
        "redirect_uri": ruri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true"
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

def exchange_code_for_tokens(auth_code, client_id=None, redirect_uri=None):
    cfg = get_config()
    ruri = redirect_uri or cfg["redirect_uri"]
    
    # Try candidate pairs of (client_id, client_secret)
    pairs = []
    if client_id:
        if client_id == cfg["app2_client_id"]:
            pairs.append((cfg["app2_client_id"], cfg["app2_client_secret"]))
        else:
            pairs.append((cfg["client_id"], cfg["client_secret"]))
            pairs.append((cfg["client_id"], cfg["backup_secret"]))
            
    pairs.append((cfg["app2_client_id"], cfg["app2_client_secret"]))
    pairs.append((cfg["client_id"], cfg["client_secret"]))
    pairs.append((cfg["client_id"], cfg["backup_secret"]))
    
    seen = set()
    deduped = []
    for cid, sec in pairs:
        if not sec:
            continue
        key = (cid, sec)
        if key not in seen:
            seen.add(key)
            deduped.append(key)
    
    last_err = None
    for cid, secret in deduped:
        token_data = urllib.parse.urlencode({
            "code": auth_code,
            "client_id": cid,
            "client_secret": secret,
            "redirect_uri": ruri,
            "grant_type": "authorization_code"
        }).encode("utf-8")
        
        req = urllib.request.Request("https://oauth2.googleapis.com/token", data=token_data)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        
        try:
            with urllib.request.urlopen(req) as resp:
                token_res = json.loads(resp.read().decode("utf-8"))
                token_res["client_id"] = cid
                token_res["client_secret"] = secret
                token_res["created_at"] = time.time()
                token_res["expires_at"] = time.time() + token_res.get("expires_in", 3600)
                return token_res
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}: {e.read().decode('utf-8')}"
        except Exception as ex:
            last_err = str(ex)
            
    raise RuntimeError(f"Token exchange failed: {last_err}")

def fetch_channel_info(access_token):
    url = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("items", [])
            if not items:
                return None
            ch = items[0]
            return {
                "id": ch["id"],
                "title": ch["snippet"]["title"],
                "handle": ch["snippet"].get("customUrl", ""),
                "description": ch["snippet"].get("description", "")[:200],
                "avatar": ch["snippet"]["thumbnails"].get("default", {}).get("url", ""),
                "subscribers": ch["statistics"].get("subscriberCount", "0"),
                "views": ch["statistics"].get("viewCount", "0"),
                "videoCount": ch["statistics"].get("videoCount", "0")
            }
    except Exception as e:
        print(f"Loi khi lay thong tin kenh: {e}")
        return None

def save_token(token_data, channel_info=None):
    if channel_info:
        token_data["channel"] = channel_info
    token_data["updated_at"] = datetime.datetime.now().isoformat()
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump(token_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Da luu token vao file: {TOKEN_FILE}")

def load_token():
    if not os.path.exists(TOKEN_FILE):
        return None
    try:
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def get_valid_access_token():
    token_data = load_token()
    if not token_data:
        raise RuntimeError("Chua co token OAuth. Vui long chay ket noi lai OAuth truoc.")
    
    expires_at = token_data.get("expires_at", 0)
    # Neu con han it nhat 2 phut
    if time.time() < (expires_at - 120):
        return token_data.get("access_token"), token_data
        
    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        raise RuntimeError("Token da het han va khong co refresh_token. Vui long cap quyen lai.")
        
    cfg = get_config()
    cid = token_data.get("client_id", cfg["client_id"])
    csecret = token_data.get("client_secret", cfg["client_secret"])
    
    data = urllib.parse.urlencode({
        "client_id": cid,
        "client_secret": csecret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode("utf-8")
    
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as resp:
            new_tokens = json.loads(resp.read().decode("utf-8"))
            token_data["access_token"] = new_tokens["access_token"]
            token_data["expires_in"] = new_tokens.get("expires_in", 3600)
            token_data["expires_at"] = time.time() + token_data["expires_in"]
            if "refresh_token" in new_tokens:
                token_data["refresh_token"] = new_tokens["refresh_token"]
            save_token(token_data, token_data.get("channel"))
            return token_data["access_token"], token_data
    except Exception as e:
        raise RuntimeError(f"Loi khi refresh token: {e}")

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    auth_code = None
    server_instance = None
    error_msg = None

    def log_message(self, format, *args):
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        
        if "code" in qs:
            OAuthCallbackHandler.auth_code = qs["code"][0]
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            html = """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>Ket Noi Thanh Cong - Lunavia Analytics Hub</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0E1A; color: #F1F5F9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #151D2A; border: 1px solid #1E293B; border-radius: 12px; padding: 40px; text-align: center; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                    .icon { font-size: 54px; color: #10B981; margin-bottom: 16px; }
                    h2 { margin: 0 0 12px 0; color: #FFFFFF; font-size: 22px; }
                    p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
                    .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #10B981; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✅</div>
                    <h2>Ket Noi YouTube Analytics Thanh Cong!</h2>
                    <p>Chu kenh da cap du cac quyen yeu cau (YouTube Readonly, Analytics & Doanh thu Monetary).<br>Token da duoc luu tai backend va san sang su dung.</p>
                    <span class="badge">Ban co the dong tab nay va quay lai Dashboard</span>
                </div>
            </body>
            </html>
            """
            self.wfile.write(html.encode("utf-8"))
        elif "error" in qs:
            OAuthCallbackHandler.error_msg = qs.get("error_description", qs.get("error", ["Unknown error"]))[0]
            self.send_response(400)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            err_html = f"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><title>Loi Cap Quyen</title></head>
            <body style="background:#0A0E1A;color:#EF4444;text-align:center;padding:50px;">
                <h2>Tu Choi Cap Quyen Hoac Loi</h2>
                <p>{OAuthCallbackHandler.error_msg}</p>
            </body>
            </html>
            """
            self.wfile.write(err_html.encode("utf-8"))
        else:
            self.send_response(200)
            self.send_header("Content-type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write("OAuth Callback Listener is running...".encode("utf-8"))

def run_oauth_flow(open_browser=True, port=8080, timeout_seconds=180, client_id=None):
    cfg = get_config()
    cid = client_id or cfg["client_id"]
    ruri = f"http://localhost:{port}/"
    auth_url = get_authorization_url(client_id=cid, redirect_uri=ruri)
    
    OAuthCallbackHandler.auth_code = None
    OAuthCallbackHandler.error_msg = None
    
    print(f"\n{'='*70}")
    print("TUBE PULSE YOUTUBE OAUTH 2.0 RECONNECT FLOW")
    print(f"{'='*70}")
    print(f"Client ID: {cid[:35]}...")
    print(f"Redirect URI: {ruri}")
    print("Scopes yeu cau:")
    for s in SCOPES:
        print(f"  + {s}")
    print(f"{'='*70}")
    print(f"Authorization URL:\n{auth_url}\n")
    
    server_address = ('', port)
    try:
        httpd = HTTPServer(server_address, OAuthCallbackHandler)
    except OSError as e:
        print(f"[ERROR] Khong the mo port {port}: {e}")
        return None
        
    httpd.timeout = 1.0
    
    if open_browser:
        print(f"Dang tu dong mo trinh duyet den trang cap quyen Google...")
        webbrowser.open(auth_url)
        
    print(f"Dang lang nghe callback tai {ruri} (Timeout: {timeout_seconds}s)...")
    start_time = time.time()
    
    while time.time() - start_time < timeout_seconds:
        httpd.handle_request()
        if OAuthCallbackHandler.auth_code:
            break
        if OAuthCallbackHandler.error_msg:
            print(f"[ERROR] Loi tu Google OAuth: {OAuthCallbackHandler.error_msg}")
            httpd.server_close()
            return None
            
    httpd.server_close()
    
    if not OAuthCallbackHandler.auth_code:
        print("[TIMEOUT] Khong nhan duoc authorization code tu Google trong thoi gian cho.")
        return None
        
    print("[OK] Da nhan authorization code tu Google! Dang trao doi lay tokens...")
    try:
        tokens = exchange_code_for_tokens(OAuthCallbackHandler.auth_code, client_id=cid, redirect_uri=ruri)
        acc_token = tokens["access_token"]
        print(f"[OK] Trao doi token thanh cong! Access token: {acc_token[:25]}...")
        
        print("Dang truy van thong tin kenh duoc cap quyen (Data API v3)...")
        channel_info = fetch_channel_info(acc_token)
        if channel_info:
            print(f"[OK] Kenh xac thuc: {channel_info['title']} ({channel_info['handle']}) | ID: {channel_info['id']}")
            print(f"    Subs: {channel_info['subscribers']} | Views: {channel_info['views']} | Videos: {channel_info['videoCount']}")
        else:
            print("[WARN] Khong tim thay thong tin kenh hoac user chua tao kenh YouTube tren tai khoan nay.")
            
        save_token(tokens, channel_info)
        return tokens
    except Exception as e:
        print(f"[ERROR] Loi khi xu ly token: {e}")
        return None

def test_youtube_analytics_api(start_date=None, end_date=None):
    """
    Truy van truc tiep YouTube Analytics API v2 voi:
      - views
      - estimatedMinutesWatched
      - estimatedRevenue
    cua dung kenh duoc chu kenh cap quyen.
    """
    print(f"\n{'='*70}")
    print("KIEM TRA YOUTUBE ANALYTICS API V2 (VIEWS, MINUTES, ESTIMATED REVENUE)")
    print(f"{'='*70}")
    
    try:
        access_token, token_data = get_valid_access_token()
    except Exception as e:
        print(f"[ERROR] Khong the lay access token: {e}")
        return None
        
    channel_info = token_data.get("channel") or {}
    ch_id = channel_info.get("id")
    ch_title = channel_info.get("title", "Unknown Channel")
    print(f"Target Channel: {ch_title} (ID: {ch_id or 'MINE'})")
    
    # Mac dinh lay 28 ngay gan nhat tinh den hom qua (Pacific Time)
    today = datetime.date.today()
    if not end_date:
        end_date = (today - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    if not start_date:
        start_date = (today - datetime.timedelta(days=29)).strftime("%Y-%m-%d")
        
    print(f"Khoang thoi gian truy van: {start_date} den {end_date}")
    
    # Query tong quan ky
    query_params = {
        "ids": "channel==MINE",
        "startDate": start_date,
        "endDate": end_date,
        "metrics": "views,estimatedMinutesWatched,estimatedRevenue"
    }
    
    url = f"https://youtubeanalytics.googleapis.com/v2/reports?{urllib.parse.urlencode(query_params)}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("Accept", "application/json")
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("\n[KET QUA YOUTUBE ANALYTICS API V2]")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            headers = [h["name"] for h in data.get("columnHeaders", [])]
            rows = data.get("rows", [])
            
            print(f"\n{'='*70}")
            print("CHI TIET CHI SO THUC TE TU YOUTUBE ANALYTICS:")
            print(f"{'='*70}")
            if rows:
                row = rows[0]
                row_dict = dict(zip(headers, row))
                views = row_dict.get("views", 0)
                minutes = row_dict.get("estimatedMinutesWatched", 0)
                hours = round(minutes / 60.0, 2)
                revenue = row_dict.get("estimatedRevenue", 0.0)
                proxy_rpm = round((revenue / views * 1000), 2) if views > 0 else 0.0
                
                print(f"  1. Views trong ky:                  {views:,} luot xem")
                print(f"  2. Gio xem (estimatedMinutesWatched/60): {hours:,} gio ({minutes:,} phut)")
                print(f"  3. Doanh thu uoc tinh (estimatedRevenue): ${revenue:,.2f} USD")
                print(f"  4. Doanh thu API / 1.000 views (Proxy RPM): ${proxy_rpm:.2f} USD")
            else:
                print("  [Thong bao] Khong co du lieu (Kenh moi hoac chua co luot xem trong ky da chon).")
            print(f"{'='*70}\n")
            return data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"[ERROR API] HTTP {e.code}: {err_body}")
        try:
            err_json = json.loads(err_body)
            msg = err_json.get("error", {}).get("message", "")
            print(f"Chi tiet loi tu Google: {msg}")
        except Exception:
            pass
        return None
    except Exception as ex:
        print(f"[ERROR] Ngoai le khi goi API: {ex}")
        return None

def query_channel_report(channel_id=None, start_date=None, end_date=None, dimensions='day', currency='USD', metrics=None):
    """
    Query YouTube Analytics API v2 for a given channel and date range.
    Supports dimensions='day' for time series or None for aggregates.
    Automatically handles monetary separation if estimatedRevenue fails.
    """
    token_data = load_token()
    if not token_data:
        return {
            "success": False,
            "status": "not_authenticated",
            "message": "Chưa có token OAuth. Vui lòng kết nối tài khoản chủ kênh trước."
        }

    auth_channel = token_data.get("channel") or {}
    auth_channel_id = auth_channel.get("id")

    # If specific channel_id requested and does not match authenticated channel:
    if channel_id and channel_id not in ("MINE", "mine", auth_channel_id):
        return {
            "success": True,
            "status": "not_connected",
            "channel_id": channel_id,
            "has_analytics": False,
            "has_monetary": False,
            "message": f"Kênh {channel_id} chưa được cấp quyền YouTube Analytics qua OAuth 2.0. Hiện tại chỉ có kênh '{auth_channel.get('title')}' ({auth_channel_id}) được cấp quyền.",
            "report_timezone": "America/Los_Angeles",
            "rows": [],
            "totals": {}
        }

    try:
        access_token, token_data = get_valid_access_token()
    except Exception as e:
        return {
            "success": False,
            "status": "token_refresh_failed",
            "message": f"Lỗi khi làm mới token OAuth: {e}"
        }

    today = datetime.date.today()
    if not end_date:
        end_date = (today - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    if not start_date:
        start_date = (today - datetime.timedelta(days=29)).strftime("%Y-%m-%d")

    target_id_param = f"channel=={auth_channel_id}" if auth_channel_id else "channel==MINE"

    # Default full metrics list
    full_metrics = metrics or "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,estimatedRevenue"

    # Try query with full metrics first
    query_params = {
        "ids": target_id_param,
        "startDate": start_date,
        "endDate": end_date,
        "metrics": full_metrics,
        "currency": currency
    }
    if dimensions:
        query_params["dimensions"] = dimensions

    url = f"https://youtubeanalytics.googleapis.com/v2/reports?{urllib.parse.urlencode(query_params)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})

    has_monetary = True
    monetary_error = None
    data = None

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        # If error was caused by estimatedRevenue/monetary scope missing (403 or 400 with revenue metric)
        if "estimatedRevenue" in full_metrics and ("403" in str(e.code) or "monetary" in err_body.lower() or "estimatedrevenue" in err_body.lower()):
            has_monetary = False
            monetary_error = f"HTTP {e.code}: Quyền monetary chưa được cấp hoặc kênh chưa kích hoạt kiếm tiền."
            # Fall back to standard non-monetary metrics
            std_metrics = [m.strip() for m in full_metrics.split(",") if "revenue" not in m.lower() and "cpm" not in m.lower()]
            query_params["metrics"] = ",".join(std_metrics)
            url2 = f"https://youtubeanalytics.googleapis.com/v2/reports?{urllib.parse.urlencode(query_params)}"
            req2 = urllib.request.Request(url2, headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})
            try:
                with urllib.request.urlopen(req2) as resp2:
                    data = json.loads(resp2.read().decode("utf-8"))
            except Exception as ex2:
                return {
                    "success": False,
                    "status": "api_error",
                    "message": f"Lỗi khi gọi YouTube Analytics API (non-monetary fallback): {ex2}"
                }
        else:
            return {
                "success": False,
                "status": "api_error",
                "message": f"Lỗi HTTP {e.code} từ YouTube Analytics API: {err_body}"
            }
    except Exception as ex:
        return {
            "success": False,
            "status": "network_error",
            "message": f"Lỗi kết nối YouTube Analytics API: {ex}"
        }

    # Format result rows
    column_headers = [h["name"] for h in data.get("columnHeaders", [])]
    raw_rows = data.get("rows", [])
    formatted_rows = []

    totals = {
        "views": 0,
        "estimatedMinutesWatched": 0,
        "estimatedHoursWatched": 0.0,
        "subscribersGained": 0,
        "subscribersLost": 0,
        "netSubscribers": 0,
        "likes": 0,
        "comments": 0,
        "estimatedRevenue": 0.0 if has_monetary else None,
        "proxyRpm": 0.0 if has_monetary else None
    }

    for r in raw_rows:
        row_dict = dict(zip(column_headers, r))
        formatted_rows.append(row_dict)
        totals["views"] += row_dict.get("views", 0)
        totals["estimatedMinutesWatched"] += row_dict.get("estimatedMinutesWatched", 0)
        totals["subscribersGained"] += row_dict.get("subscribersGained", 0)
        totals["subscribersLost"] += row_dict.get("subscribersLost", 0)
        totals["likes"] += row_dict.get("likes", 0)
        totals["comments"] += row_dict.get("comments", 0)
        if has_monetary and "estimatedRevenue" in row_dict:
            totals["estimatedRevenue"] = round(totals["estimatedRevenue"] + (row_dict.get("estimatedRevenue") or 0.0), 2)

    totals["estimatedHoursWatched"] = round(totals["estimatedMinutesWatched"] / 60.0, 1)
    totals["netSubscribers"] = totals["subscribersGained"] - totals["subscribersLost"]
    if has_monetary and totals["views"] > 0 and totals["estimatedRevenue"] is not None:
        totals["proxyRpm"] = round((totals["estimatedRevenue"] / totals["views"]) * 1000, 2)

    return {
        "success": True,
        "status": "ok",
        "channel_id": auth_channel_id,
        "channel": auth_channel,
        "requested_period": {"start_date": start_date, "end_date": end_date},
        "report_timezone": "America/Los_Angeles",
        "currency": currency,
        "fetched_at": datetime.datetime.utcnow().isoformat() + "Z",
        "has_analytics": True,
        "has_monetary": has_monetary,
        "monetary_error": monetary_error,
        "column_headers": column_headers,
        "rows": formatted_rows,
        "totals": totals,
        "row_count": len(formatted_rows),
        "is_empty": len(formatted_rows) == 0,
        "raw_response": data
    }

if __name__ == "__main__":
    args = sys.argv[1:]
    if "--login" in args or "--connect" in args or "--reconnect" in args:
        cid = None
        if "--app2" in args:
            cfg = get_config()
            cid = cfg["app2_client_id"]
        open_b = "--no-browser" not in args
        run_oauth_flow(open_browser=open_b, timeout_seconds=300, client_id=cid)
    elif "--test-analytics" in args or "--test" in args:
        test_youtube_analytics_api()
    elif "--status" in args:
        tok = load_token()
        if tok:
            ch = tok.get("channel", {})
            print(f"Da luu token. Kenh: {ch.get('title')} ({ch.get('handle')}) | Exp: {datetime.datetime.fromtimestamp(tok.get('expires_at',0))}")
        else:
            print("Chua co token OAuth.")
    elif "--url" in args:
        cid = None
        if "--app2" in args:
            cfg = get_config()
            cid = cfg["app2_client_id"]
        print(get_authorization_url(client_id=cid))
    else:
        print("Cach dung:")
        print("  python oauth_service.py --login           (Mo trinh duyet ket noi lai OAuth)")
        print("  python oauth_service.py --login --app2    (Dung Client App 2)")
        print("  python oauth_service.py --test-analytics  (Kiem tra views, minutes, revenue)")
        print("  python oauth_service.py --status          (Xem trang thai token hien tai)")
        print("  python oauth_service.py --url             (In URL cap quyen Google OAuth)")

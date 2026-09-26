#!/usr/bin/env python3
"""Local site plus story editor. Not the public GitHub Pages server."""
import base64
import hashlib
import json
import re
import secrets
import smtplib
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent
SECRET_DIR = ROOT / ".secrets"
CATALOG = ROOT / "data" / "stories.js"
ADDED = ROOT / "data" / "added.js"
ORIGINAL_PREFIX = "window.STORIES = "
ADDED_PREFIX = "window.ADDED_STORIES = "
LINKS = SECRET_DIR / "links.json"
SESSIONS = SECRET_DIR / "sessions.json"
LOCK = threading.Lock()
ATTEMPTS = {}
JWKS = {"at": 0, "keys": []}
THEMES = {
    "מוות ואבל", "זקנה ושיכחה", "משפחה ודם", "אהבה ופרידה", "תשוקה וגוף",
    "מלחמה ואלימות", "שואה וגרמנים", "קיבוץ ומקום", "זהות וכפילות",
    "יום־יום ישראלי", "אמנות וכתיבה", "אבסורד וחלום", "ילדות", "בעלי חיים",
}
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
DATE_ONLY = re.compile(r"^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$")
DATE_TAIL = re.compile(r"^(.*?)[ \t]{2,}(\d{1,2}[./]\d{1,2}[./]\d{2,4})$")
LINK_SENT = "אם המייל מורשה, נשלח אליו קישור התחברות."


def allowlist():
    path = SECRET_DIR / "allowlist"
    if not path.exists():
        return set()
    return {line.strip().lower() for line in path.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")}


def google_client_id():
    path = SECRET_DIR / "google_client_id"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def load_records(path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def store_record(path, token, expiry):
    with LOCK:
        now = time.time()
        records = {key: exp for key, exp in load_records(path).items() if exp > now}
        records[token_hash(token)] = expiry
        path.write_text(json.dumps(records), encoding="utf-8")
        path.chmod(0o600)


def take_record(path, token):
    if not token:
        return False
    digest = token_hash(token)
    with LOCK:
        now = time.time()
        records = {key: exp for key, exp in load_records(path).items() if exp > now}
        ok = digest in records
        records.pop(digest, None)
        path.write_text(json.dumps(records), encoding="utf-8")
        path.chmod(0o600)
        return ok


def drop_record(path, token):
    take_record(path, token)


def session_ok(token):
    if not token:
        return False
    digest = token_hash(token)
    now = time.time()
    return load_records(SESSIONS).get(digest, 0) > now


def limited(ip):
    now = time.time()
    hits = [stamp for stamp in ATTEMPTS.get(ip, []) if now - stamp < 600]
    if len(hits) >= 8:
        ATTEMPTS[ip] = hits
        return True
    hits.append(now)
    ATTEMPTS[ip] = hits
    return False


def cookie_value(header, name):
    for part in (header or "").split(";"):
        key, _, value = part.strip().partition("=")
        if key == name:
            return value
    return ""


def session_cookie(token, clear=False):
    age = 0 if clear else 30 * 24 * 3600
    return f"session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={age}"


def b64url(data):
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def der_len(n):
    if n < 0x80:
        return bytes([n])
    size = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([0x80 | len(size)]) + size


def der_int(number):
    raw = number.to_bytes((number.bit_length() + 7) // 8 or 1, "big")
    if raw[0] & 0x80:
        raw = b"\x00" + raw
    return b"\x02" + der_len(len(raw)) + raw


def der_seq(payload):
    return b"\x30" + der_len(len(payload)) + payload


def jwk_pem(n_b64, e_b64):
    rsa = der_seq(der_int(int.from_bytes(b64url(n_b64), "big")) + der_int(int.from_bytes(b64url(e_b64), "big")))
    oid = bytes.fromhex("300d06092a864886f70d0101010500")
    bit = b"\x03" + der_len(len(rsa) + 1) + b"\x00" + rsa
    spki = der_seq(oid + bit)
    body = base64.encodebytes(spki).decode()
    return f"-----BEGIN PUBLIC KEY-----\n{body}-----END PUBLIC KEY-----\n"


def google_keys():
    if JWKS["keys"] and time.time() - JWKS["at"] < 3600:
        return JWKS["keys"]
    with urllib.request.urlopen("https://www.googleapis.com/oauth2/v3/certs", timeout=10) as res:
        JWKS["keys"] = json.loads(res.read().decode())["keys"]
    JWKS["at"] = time.time()
    return JWKS["keys"]


def verify_google(credential, client_id):
    header_b64, payload_b64, sig_b64 = credential.split(".")
    header = json.loads(b64url(header_b64))
    if header.get("alg") != "RS256":
        raise ValueError("bad alg")
    key = next(item for item in google_keys() if item.get("kid") == header.get("kid"))
    signed = f"{header_b64}.{payload_b64}".encode()
    signature = b64url(sig_b64)
    with tempfile.TemporaryDirectory() as folder:
        pub = Path(folder) / "pub.pem"
        data = Path(folder) / "data"
        sig = Path(folder) / "sig"
        pub.write_text(jwk_pem(key["n"], key["e"]))
        data.write_bytes(signed)
        sig.write_bytes(signature)
        check = subprocess.run(
            ["openssl", "dgst", "-sha256", "-verify", str(pub), "-signature", str(sig), str(data)],
            capture_output=True, text=True,
        )
    if check.returncode != 0:
        raise ValueError("bad signature")
    payload = json.loads(b64url(payload_b64))
    aud = payload.get("aud")
    audience = aud if isinstance(aud, list) else [aud]
    issuer = payload.get("iss")
    email = (payload.get("email") or "").strip().lower()
    verified = payload.get("email_verified") in (True, "true")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValueError("bad issuer")
    if client_id not in audience or payload.get("exp", 0) < time.time() or not verified:
        raise ValueError("bad claim")
    if email not in allowlist():
        raise ValueError("not allowed")
    return email


def send_mail_app(address, subject, body):
    script = """
on run argv
  tell application "Mail"
    set msg to make new outgoing message with properties {subject:item 1 of argv, visible:false}
    tell msg
      make new to recipient at end of to recipients with properties {address:item 3 of argv}
      set content to item 2 of argv
    end tell
    delay 1
    send msg
  end tell
end run
"""
    try:
        subprocess.run(["osascript", "-e", script, subject, body, address], check=True, capture_output=True, timeout=40)
        return True
    except (OSError, subprocess.SubprocessError):
        return False


def send_smtp(address, subject, body):
    path = SECRET_DIR / "smtp.json"
    if not path.exists():
        return False
    cfg = json.loads(path.read_text(encoding="utf-8"))
    message = EmailMessage()
    message["From"] = cfg["user"]
    message["To"] = address
    message["Subject"] = subject
    message.set_content(body)
    with smtplib.SMTP(cfg["host"], int(cfg.get("port", 587)), timeout=20) as smtp:
        smtp.starttls()
        smtp.login(cfg["user"], cfg["password"])
        smtp.send_message(message)
    return True


def deliver(address, url):
    subject = "קישור התחברות · אודי סיפורים"
    body = "להתחברות לחצו על הקישור. הוא נפתח במחשב שבו רץ האתר, תקף לרבע שעה, ולשימוש אחד.\n\n" + url + "\n"
    if (SECRET_DIR / "smtp.json").exists():
        try:
            return send_smtp(address, subject, body)
        except (OSError, smtplib.SMTPException, KeyError, json.JSONDecodeError):
            return False
    return send_mail_app(address, subject, body)


def date_value(text):
    match = DATE_ONLY.match(text.strip())
    if not match:
        return None
    day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
    if year < 100:
        year += 2000
    return year, month, day


def label_for(year, month, day):
    return f"{day}.{month}.{year}"


def iso_for(year, month, day):
    return f"{year:04d}-{month:02d}-{day:02d}"


def load_js(path, prefix):
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith(prefix):
        raise ValueError(path.name + " is not a story catalog")
    body = raw[len(prefix):].strip()
    if body.endswith(";"):
        body = body[:-1]
    return json.loads(body)


def save_added(stories):
    ADDED.write_text(ADDED_PREFIX + json.dumps(stories, ensure_ascii=False, separators=(", ", ": ")) + ";\n", encoding="utf-8")


def catalogs():
    return load_js(CATALOG, ORIGINAL_PREFIX), load_js(ADDED, ADDED_PREFIX)


def next_slug(stories):
    nums = [int(s["slug"]) for s in stories if str(s.get("slug", "")).isdigit()]
    n = (max(nums) + 1) if nums else 0
    return f"{n:03d}" if n < 1000 else str(n)


def extract_text(filename, data):
    suffix = Path(filename).suffix.lower()
    if suffix not in {".doc", ".docx"}:
        raise ValueError("רק קובץ וורד, doc או docx")
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        path = tmp.name
    try:
        out = subprocess.check_output(["textutil", "-convert", "txt", "-stdout", path], stderr=subprocess.STDOUT)
    finally:
        Path(path).unlink(missing_ok=True)
    return out.decode("utf-8", "replace")


def same_title(line, stem):
    def norm(value):
        return re.sub(r"\s+", " ", value).strip()
    return norm(line) == norm(stem)


def parse_document(filename, data):
    lines = [line.strip() for line in extract_text(filename, data).splitlines() if line.strip()]
    stem = Path(filename).stem
    dates = []
    body = []
    for line in lines:
        only = date_value(line)
        if only:
            dates.append(only)
            continue
        tail = DATE_TAIL.match(line)
        if tail:
            text = tail.group(1).strip()
            found = date_value(tail.group(2))
            if found:
                dates.append(found)
            if text and not same_title(text, stem):
                body.append(text)
            continue
        if not body and same_title(line, stem):
            continue
        body.append(line)
    earliest = min(dates) if dates else None
    hook = body[0] if body else ""
    if len(hook) > 140:
        hook = hook[:140].rsplit(" ", 1)[0]
    return {
        "title": re.sub(r"\s+", " ", stem).strip(),
        "text": "\n".join(body),
        "hook": hook,
        "date": iso_for(*earliest) if earliest else "",
        "dateLabel": label_for(*earliest) if earliest else "",
    }


def next_icon(stories, theme):
    group = sorted((s for s in stories if s.get("primary") == theme), key=lambda s: s.get("slug", ""))
    shift = sum(ord(ch) for ch in theme)
    size = 27
    used = set()
    for n, story in enumerate(group):
        icon = story.get("icon")
        used.add(((icon if isinstance(icon, int) else n + shift) % size))
    return next((i for i in range(size) if i not in used), 0)


def story_fields(item):
    title = (item.get("title") or "").strip()
    text = (item.get("text") or "").strip()
    primary = item.get("primary") or ""
    if not title or not text:
        raise ValueError("חסרים כותרת או טקסט")
    if primary not in THEMES:
        raise ValueError("צריך לבחור קטגוריה")
    return title, text, primary


def story_record(item, slug, icon, text, title, primary):
    return {
        "slug": slug,
        "title": title,
        "form": "סיפור",
        "hook": (item.get("hook") or text.splitlines()[0])[:140],
        "synopsis": (item.get("synopsis") or "").strip(),
        "primary": primary,
        "secondary": [],
        "keywords": item.get("keywords") or [],
        "places": [],
        "figures": item.get("figures") or [],
        "tone": "",
        "text": text,
        "date": item.get("date") or "",
        "dateLabel": item.get("dateLabel") or "",
        "icon": icon,
    }


def add_story(item):
    title, text, primary = story_fields(item)
    original, added = catalogs()
    both = original + added
    slug = next_slug(both)
    added.append(story_record(item, slug, next_icon(both, primary), text, title, primary))
    save_added(added)
    return {"slug": slug, "count": len(both) + 1}


def update_story(item):
    title, text, primary = story_fields(item)
    slug = str(item.get("slug") or "")
    original, added = catalogs()
    idx = next((i for i, story in enumerate(added) if story.get("slug") == slug), -1)
    if idx < 0:
        raise ValueError("אפשר לערוך רק סיפור שנוסף לאתר")
    current = added[idx]
    others = original + [story for story in added if story.get("slug") != slug]
    icon = current.get("icon") if primary == current.get("primary") and isinstance(current.get("icon"), int) else next_icon(others, primary)
    added[idx] = story_record(item, slug, icon, text, title, primary)
    save_added(added)
    return {"slug": slug, "count": len(original) + len(added)}


def delete_story(item):
    slug = str(item.get("slug") or "")
    original, added = catalogs()
    kept = [story for story in added if story.get("slug") != slug]
    if len(kept) == len(added):
        raise ValueError("אפשר למחוק רק סיפור שנוסף לאתר")
    save_added(kept)
    return {"ok": True, "count": len(original) + len(kept)}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        try:
            text = fmt % args
        except TypeError:
            text = str(fmt)
        sys.stderr.write("%s - %s\n" % (self.address_string(), text.split("?", 1)[0]))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        resolved = Path(super().translate_path(path)).resolve()
        if resolved == SECRET_DIR or SECRET_DIR in resolved.parents:
            return str(ROOT / "missing")
        return str(resolved)

    def _session(self):
        return session_ok(cookie_value(self.headers.get("Cookie"), "session"))

    def _origin_ok(self):
        origin = self.headers.get("Origin", "")
        host = self.headers.get("Host", "")
        return bool(origin and host and urlparse(origin).netloc == host)

    def _json(self, code, payload, cookie=None):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(data)

    def _redirect(self, location, cookie=None):
        self.send_response(302)
        self.send_header("Location", location)
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path)
        if path.path.startswith("/.secrets"):
            return self.send_error(404)
        if path.path == "/api/me":
            ok = self._session()
            return self._json(200 if ok else 401, {"ok": ok})
        if path.path == "/api/auth/config":
            client_id = google_client_id()
            return self._json(200, {"googleClientId": client_id or None})
        if path.path == "/auth/finish":
            token = parse_qs(path.query).get("t", [""])[0]
            if not take_record(LINKS, token):
                return self._redirect("/index.html?denied=1")
            issued = secrets.token_urlsafe(32)
            store_record(SESSIONS, issued, time.time() + 30 * 24 * 3600)
            return self._redirect("/index.html", session_cookie(issued))
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length < 0 or length > 15 * 1024 * 1024:
            return self._json(400, {"error": "הקובץ גדול מדי"})
        raw = self.rfile.read(length)
        if not self._origin_ok():
            return self._json(403, {"error": "ההתחברות נכשלה"})
        if path.path == "/api/login/email":
            return self._login_email(raw)
        if path.path == "/api/login/google":
            return self._login_google(raw)
        if path.path == "/api/logout":
            take_record(SESSIONS, cookie_value(self.headers.get("Cookie"), "session"))
            return self._json(200, {"ok": True}, session_cookie("", clear=True))
        if path.path not in {"/api/extract", "/api/save", "/api/update", "/api/delete"}:
            return self._json(404, {"error": "לא נמצא"})
        if not self._session():
            return self._json(401, {"error": "צריך להתחבר"})
        try:
            if path.path == "/api/extract":
                name = unquote(parse_qs(path.query).get("name", ["story.docx"])[0], encoding="utf-8")
                payload = parse_document(name, raw)
            else:
                item = json.loads(raw.decode("utf-8"))
                if path.path == "/api/update":
                    payload = update_story(item)
                elif path.path == "/api/delete":
                    payload = delete_story(item)
                else:
                    payload = add_story(item)
        except Exception as exc:
            return self._json(400, {"error": str(exc)})
        self._json(200, payload)

    def _login_email(self, raw):
        if limited(self.client_address[0]):
            return self._json(200, {"ok": True, "message": LINK_SENT})
        try:
            email = json.loads(raw.decode("utf-8")).get("email", "")
        except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            email = ""
        email = email.strip().lower()
        if EMAIL_RE.match(email) and email in allowlist():
            token = secrets.token_urlsafe(32)
            store_record(LINKS, token, time.time() + 15 * 60)
            host = self.headers.get("Host", "")
            base = "http://" + host if host in {"127.0.0.1:8765", "localhost:8765"} else "http://127.0.0.1:8765"
            if not deliver(email, f"{base}/auth/finish?t={token}"):
                drop_record(LINKS, token)
                print("login link was not delivered", file=sys.stderr)
        return self._json(200, {"ok": True, "message": LINK_SENT})

    def _login_google(self, raw):
        client_id = google_client_id()
        if not client_id or limited(self.client_address[0]):
            return self._json(403, {"error": "ההתחברות נכשלה"})
        try:
            credential = json.loads(raw.decode("utf-8")).get("credential", "")
            verify_google(credential, client_id)
        except Exception:
            return self._json(403, {"error": "ההתחברות נכשלה"})
        issued = secrets.token_urlsafe(32)
        store_record(SESSIONS, issued, time.time() + 30 * 24 * 3600)
        return self._json(200, {"ok": True}, session_cookie(issued))


if __name__ == "__main__":
    SECRET_DIR.mkdir(mode=0o700, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("http://127.0.0.1:8765/", flush=True)
    server.serve_forever()

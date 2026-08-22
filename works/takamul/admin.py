# -*- coding: utf-8 -*-
"""
خادم لوحة التحكم المحلي — التكامل المتحدة
يشغّل الموقع ولوحة التحكم معاً، ويتيح الحفظ الفعلي ورفع الصور وإعادة بناء الموقع.

    python3 admin.py

ثم افتح:
    الموقع        →  http://localhost:5180/
    لوحة التحكم   →  http://localhost:5180/dashboard/
    عرض السعر     →  http://localhost:5180/offer/عرض-السعر.html
"""
import os, io, json, shutil, subprocess, sys, time, cgi
import http.server, socketserver

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "5180"))
CONTENT = os.path.join(HERE, "content.json")
BACKUPS = os.path.join(HERE, "_backups")

ALLOWED_FOLDERS = {"clients", "blog", "events", "achievements", "hero"}
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".svg"}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    # ---- إسكات السجل المزعج ----
    def log_message(self, fmt, *args):
        if "/api/" in self.path:
            sys.stderr.write("[api] %s %s\n" % (self.command, self.path))

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    # ---- GET ----
    def do_GET(self):
        if self.path.rstrip("/").endswith("/api/ping"):
            return self._json({"ok": True, "mode": "live"})
        # منع تخزين content.json مؤقتاً
        return super().do_GET()

    def end_headers(self):
        if self.path.endswith(".json") or "/dashboard/" in self.path:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ---- POST ----
    def do_POST(self):
        p = self.path.split("?")[0].rstrip("/")

        if p.endswith("/api/save"):
            return self.api_save()
        if p.endswith("/api/upload"):
            return self.api_upload()
        if p.endswith("/api/build"):
            return self.api_build()

        self._json({"ok": False, "error": "unknown endpoint"}, 404)

    def api_save(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception as e:
            return self._json({"ok": False, "error": "bad json: %s" % e}, 400)

        # نسخة احتياطية قبل الكتابة
        os.makedirs(BACKUPS, exist_ok=True)
        if os.path.exists(CONTENT):
            stamp = time.strftime("%Y%m%d-%H%M%S")
            shutil.copy2(CONTENT, os.path.join(BACKUPS, "content-%s.json" % stamp))
            # الاحتفاظ بآخر 20 نسخة فقط
            files = sorted(os.listdir(BACKUPS))
            for old in files[:-20]:
                try:
                    os.remove(os.path.join(BACKUPS, old))
                except OSError:
                    pass

        # تنظيف حقول المعاينة المؤقتة
        for key in ("clients", "posts", "events", "achievements", "services", "jobs"):
            for it in data.get(key, []):
                it.pop("data", None)
                it.pop("dataImage", None)

        with open(CONTENT, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self._json({"ok": True})

    def api_upload(self):
        ctype = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in ctype:
            return self._json({"ok": False, "error": "expected multipart"}, 400)

        form = cgi.FieldStorage(
            fp=self.rfile, headers=self.headers,
            environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": ctype},
        )
        folder = (form.getvalue("folder") or "").strip()
        if folder not in ALLOWED_FOLDERS:
            return self._json({"ok": False, "error": "folder not allowed"}, 400)

        item = form["file"] if "file" in form else None
        if item is None or not getattr(item, "filename", ""):
            return self._json({"ok": False, "error": "no file"}, 400)

        ext = os.path.splitext(item.filename)[1].lower()
        if ext not in ALLOWED_EXT:
            return self._json({"ok": False, "error": "extension not allowed"}, 400)

        dest_dir = os.path.join(HERE, "assets", "img", folder)
        os.makedirs(dest_dir, exist_ok=True)
        safe = "up-%s%s" % (time.strftime("%Y%m%d-%H%M%S"), ext)
        with open(os.path.join(dest_dir, safe), "wb") as out:
            shutil.copyfileobj(item.file, out)

        self._json({"ok": True, "path": "assets/img/%s/%s" % (folder, safe)})

    def api_build(self):
        try:
            r = subprocess.run(
                [sys.executable, "build.py"], cwd=HERE,
                capture_output=True, text=True, timeout=180,
            )
            out = (r.stdout or "") + (r.stderr or "")
            self._json({"ok": r.returncode == 0, "output": out.strip()[-4000:]})
        except Exception as e:
            self._json({"ok": False, "output": str(e)})


def main():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as srv:
        print("=" * 58)
        print("  خادم التكامل المتحدة يعمل الآن")
        print("=" * 58)
        print("  الموقع        →  http://localhost:%d/" % PORT)
        print("  لوحة التحكم   →  http://localhost:%d/dashboard/" % PORT)
        print("  عرض السعر     →  http://localhost:%d/offer/" % PORT)
        print("=" * 58)
        print("  للإيقاف: Ctrl + C")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nتم الإيقاف.")


if __name__ == "__main__":
    main()

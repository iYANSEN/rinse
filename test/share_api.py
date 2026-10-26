import json, urllib.request, urllib.error, base64, re, io, sys
from PIL import Image
def post(base, body):
    r = urllib.request.Request(base + "/api/share", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try: x = urllib.request.urlopen(r); return x.status, json.loads(x.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"{}")
def get(url):
    try: x = urllib.request.urlopen(url); return x.status, x.read(), x.headers
    except urllib.error.HTTPError as e: return e.code, e.read(), e.headers
def jpeg_url(color):
    b = io.BytesIO(); Image.new("RGB", (40, 30), color).save(b, "JPEG"); return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
RES = []
def check(n, ok, d=""): RES.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{d}]" if d else ""))
def flow(base, label):
    evil = {"title": "<script>alert(1)</script>", "address": '"><img src=x onerror=alert(2)>', "message": "</style><script>alert(3)</script>", "business": "Bob's <b>Wash</b>",
            "color": "red;}</style><script>alert(4)</script>", "review": "javascript:alert(5)", "phone": "<script>", "contact": "x", "pairs": [{"cap": '"onmouseover="alert(6)'}]}
    s, c = post(base, {"op": "create", "meta": evil}); check(f"[{label}] create", s == 200 and c.get("token"), str(s))
    for k in ("a0", "b0"): s, _ = post(base, {"op": "img", "id": c["id"], "token": c["token"], "rev": c["rev"], "key": k, "data": jpeg_url("green" if k[0] == "a" else "gray")}); assert s == 200
    s, d = post(base, {"op": "done", "id": c["id"], "token": c["token"], "rev": c["rev"]}); check(f"[{label}] done publishes", s == 200, str(d))
    s, body, h = get(f"{base}/g/{c['id']}"); html = body.decode()
    check(f"[{label}] hostile input is escaped (no injected tag, attribute, script or javascript: URL)", "<script>alert" not in html and "<img src=x" not in html and '"onmouseover=' not in html and "<b>Wash" not in html and "javascript:" not in html and "&lt;script&gt;alert(1)" in html)
    check(f"[{label}] invalid colour falls back to default", "--brand:#0a7a79" in html and "red;}" not in html)
    m = re.search(r'src="(/g/[^"]+a0\.jpg)"', html); s, img, h = get(base + m.group(1)); check(f"[{label}] image served", s == 200 and h["Content-Type"] == "image/jpeg" and Image.open(io.BytesIO(img)).size == (40, 30))
    return c
def security(base):
    c = post(base, {"op": "create", "meta": {"title": "t", "pairs": [{"cap": ""}]}})[1]
    check("wrong token cannot upload images", post(base, {"op": "img", "id": c["id"], "token": "nope", "rev": c["rev"], "key": "a0", "data": jpeg_url("red")})[0] == 403)
    check("wrong token cannot hijack/update a link", post(base, {"op": "create", "id": c["id"], "token": "nope", "meta": {"pairs": [{"cap": ""}]}})[0] == 403)
    check("path-traversal image key rejected", post(base, {"op": "img", "id": c["id"], "token": c["token"], "rev": c["rev"], "key": "../../etc/passwd", "data": jpeg_url("red")})[0] == 400)
    check("non-image payload rejected", post(base, {"op": "img", "id": c["id"], "token": c["token"], "rev": c["rev"], "key": "a0", "data": "data:text/html;base64,PHNjcmlwdD4="})[0] == 400)
    check("gallery with no pairs rejected", post(base, {"op": "create", "meta": {"title": "x", "pairs": []}})[0] == 400)
    s, d = post(base, {"op": "done", "id": c["id"], "token": c["token"], "rev": c["rev"]}); check("cannot publish with missing images (no broken galleries)", s == 409 and "a0" in d.get("missing", []), str(d))
    check("unknown gallery -> friendly 404 page", get(base + "/g/doesnotexist1")[0] == 404)
    check("image path traversal -> 404", get(base + "/g/doesnotexist1/..%2f..%2fserver.js")[0] == 404)
    check("GET on API refused", (lambda: urllib.request.urlopen(base + "/api/share"))and get(base + "/api/share")[0] == 405)
if __name__ == "__main__":
    which = sys.argv[1]; base = sys.argv[2]
    if which == "disk": flow(base, "disk store"); security(base)
    else:
        flow(base, "upstash store"); st = json.loads(urllib.request.urlopen("http://127.0.0.1:4020/__stats").read()); check("[upstash store] data really lives in the Redis mock", st["keys"] >= 4, str(st))
    print("SUMMARY", sum(RES), "/", len(RES))

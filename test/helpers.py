import json, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); PH = f"{ROOT}/photos"; OUT = f"{ROOT}/out"; os.makedirs(OUT, exist_ok=True)
TRUTH = json.load(open(f"{PH}/truth.json"))
RESULTS = []
def check(name, ok, detail=""):
    RESULTS.append(ok); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else "")); sys.stdout.flush()
def launch(p, **ctx):
    b = p.chromium.launch(args=["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True, permissions=["camera"], **ctx)
    return b, c
def new_job(page, name="Test job", client="Mrs. Test"):
    page.click("[data-act=new]"); page.fill("#j-name", name); page.fill("#j-client", client); page.click("#j-form button[value=ok]")
    page.wait_for_selector(".jhead h1")
def import_set(page, setname):
    d = f"{PH}/{setname}"; files = sorted(os.path.join(d, f) for f in os.listdir(d))
    page.set_input_files(".dock .files", files)
    n = len(files); page.wait_for_function(f"document.querySelector('.stats').innerText.includes('{n} photos')", timeout=120000)
    return n
def pairs_by_name(page):
    return page.evaluate("""() => new Promise(res => { const r = indexedDB.open('rinse'); r.onsuccess = () => { const db = r.result;
      const g = db.transaction('photos').objectStore('photos').getAll(); g.onsuccess = () => { const by = {}, loose = [];
        g.result.forEach(p => { if (p.pairId && p.role) (by[p.pairId] = by[p.pairId] || {})[p.role] = p.name; else loose.push(p.name); });
        res({ pairs: Object.values(by).map(x => [x.before, x.after]), loose }); }; }; })""")
def score(found, truth):
    tp = {tuple(p) for p in truth["pairs"]}; fp = {tuple(p) for p in found["pairs"] if p[0] and p[1]}
    return len(tp & fp), len(fp - tp), len(tp)

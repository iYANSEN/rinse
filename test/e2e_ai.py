from helpers import *
import urllib.request, json as J
def mock(path, data=None):
    req = urllib.request.Request("http://127.0.0.1:4010" + path, data=J.dumps(data).encode() if data is not None else None, headers={"Content-Type": "application/json"})
    return J.loads(urllib.request.urlopen(req).read())
def ids_by_name(page):
    return page.evaluate("""() => new Promise(res => { const r = indexedDB.open('rinse'); r.onsuccess = () => { const g = r.result.transaction('photos').objectStore('photos').getAll(); g.onsuccess = () => res(Object.fromEntries(g.result.map(p => [p.name, p.id]))); }; })""")
CAPS = ["Driveway", "Front yard", "Patio", "Launch pad", "Fence", "Garden"]
PW = sync_playwright().start()
def run(port, label, expect_ai, expect_msg=None):
    if True:
        p = PW
        b, c = launch(p); page = c.new_page(); page.goto(f"http://localhost:{port}"); page.wait_for_selector("[data-act=new]")
        page.wait_for_function("window.__rinse && window.__rinse.health().ai === true", timeout=10000)
        new_job(page, f"{label} job", "AI Client"); import_set(page, "classic"); ids = ids_by_name(page)
        roles = {}; pairs = []
        for (fb, fa), cap in zip(TRUTH["classic"]["pairs"], CAPS): roles[ids[fb]] = "before"; roles[ids[fa]] = "after"; pairs.append([ids[fb], ids[fa], cap])
        mock("/__truth", {"roles": roles, "pairs": pairs, "message": "Hi AI Client, your job is finished and looks great."})
        page.click("[data-act=pair]"); page.wait_for_selector(".pair", timeout=60000); page.wait_for_timeout(1200)
        toast = page.inner_text("#toasts"); found = pairs_by_name(page); ok, wrong, total = score(found, TRUTH["classic"]); last = mock("/__last")
        return page, b, toast, found, (ok, wrong, total), last
# 1. working key
page, b, toast, found, (ok, wrong, total), last = run(3101, "AI-ok", True)
check("AI: all 6 pairs found (incl. the star-field pair visual matching missed)", ok == 6 and wrong == 0, f"{ok}/{total}, wrong {wrong}")
check("AI: toast says paired by AI", "AI" in toast, toast)
check("AI: request had key, model, temp 0, JSON mode, only JPEG thumbnails", last["auth"] == "Bearer testkey-123" and last["hasFormat"] and last["temp"] == 0 and last["imgIsJpeg"] and last["images"] == 14, str(last))
caps = page.eval_on_selector_all(".cap", "els => els.map(e => e.value)"); check("AI: captions applied to pairs", set(caps) == set(CAPS), str(caps))
check("AI: distractors left for the user, not force-paired", set(TRUTH["classic"]["loose"]) <= set(found["loose"]))
msg = page.input_value("#msg"); check("AI: client message filled in", msg.startswith("Hi AI Client"), msg[:50])
mock("/__truth", {"message": "Hi AI Client, a fresh message just for you."}); page.click("[data-act=aimsg]"); page.wait_for_function("document.querySelector('#msg').value.includes('fresh message')", timeout=10000)
check("AI: 'Write it for me' works (text-only call)", True); b.close()
# 2. rejected key -> graceful fallback
page, b, toast, found, (ok, wrong, total), last = run(3102, "AI-bad", False)
check("bad key: tells the user plainly", "key was rejected" in toast, toast)
check("bad key: still pairs on-device (5/6, 0 wrong)", ok == 5 and wrong == 0, f"{ok}/{total}"); b.close()
# 3. proxy that rejects response_format + model wraps JSON in prose/fences
page, b, toast, found, (ok, wrong, total), last = run(3103, "AI-noformat", True)
check("proxy without JSON mode: retried and parsed fenced reply (6/6)", ok == 6 and wrong == 0, f"{ok}/{total}; last={last['hasFormat']}"); b.close()
PW.stop()
print("SUMMARY", sum(RESULTS), "/", len(RESULTS))

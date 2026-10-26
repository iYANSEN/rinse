from helpers import *
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"]); c = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True); page = c.new_page(); errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto("http://localhost:3000"); page.wait_for_selector("[data-act=new]")
    page.evaluate("navigator.serviceWorker.ready.then(() => 1)"); page.wait_for_timeout(1500)
    new_job(page, "Offline job", "Off Client"); import_set(page, "interleaved"); page.click("[data-act=pair]"); page.wait_for_selector(".pair", timeout=60000)
    page.evaluate("document.querySelector('[data-act=home]').click()")
    c.set_offline(True); page.reload(); page.wait_for_selector(".hero h1", timeout=15000)
    check("offline reload: app shell loads from the service worker", "Before and after photos" in page.inner_text(".hero"))
    check("offline reload: styles + font applied", page.evaluate("getComputedStyle(document.body).fontFamily.includes('Figtree')") and page.evaluate("getComputedStyle(document.querySelector('.btn.primary')).backgroundColor") == "rgb(10, 122, 121)")
    page.wait_for_selector(".job"); check("offline reload: saved job and photos still there", "Offline job" in page.inner_text(".jobs") and "5 pairs" in page.inner_text(".jobs"))
    page.click(".job"); page.wait_for_selector(".pair"); check("offline: open job, sliders render", page.locator(".pair").count() == 5)
    page.click("[data-act=sh-make]"); page.wait_for_selector("text=Waiting for signal"); check("offline: 'Create client link' queues instead of failing", True)
    check("offline: install metadata (manifest + PNG icons)", page.evaluate("fetch('manifest.webmanifest').then(r=>r.json()).then(m=>m.icons.filter(i=>i.type==='image/png').length>=3)"))
    check("no page errors", not errs, "; ".join(errs)[:200]); b.close()
print("SUMMARY", sum(RESULTS), "/", len(RESULTS))

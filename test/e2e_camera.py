from helpers import *
with sync_playwright() as p:
    b, c = launch(p); page = c.new_page(); errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto("http://localhost:3000"); page.wait_for_selector("[data-act=new]"); new_job(page, "Camera job", "Cam Client")
    page.click(".dock [data-act=cam-before]"); page.wait_for_selector("#cam video"); page.wait_for_function("document.querySelector('#cam video').videoWidth > 0", timeout=15000)
    vw = page.evaluate("document.querySelector('#cam video').videoWidth")
    check("before camera opens and streams", vw > 0, f"{vw}px wide")
    check("before mode has no overlay slider", page.locator("#c-op").count() == 0)
    for _ in range(3): page.click("#c-shot"); page.wait_for_timeout(500)
    page.click("#c-x"); page.wait_for_selector(".jhead h1")
    page.wait_for_function("document.querySelector('.stats').innerText.includes('3 photos')", timeout=10000)
    st = page.inner_text(".stats"); check("3 'before' shots saved, tagged and waiting for an after", "3 photos" in st and "3 to sort" in st, st.replace("\n", " | "))
    page.click(".dock [data-act=cam-after]"); page.wait_for_selector("#cam .ghost"); page.wait_for_function("document.querySelector('#cam video').videoWidth > 0", timeout=15000)
    gh = page.evaluate("(() => { const g = document.querySelector('#cam .ghost'); return !g.hidden && g.src.startsWith('data:image') && getComputedStyle(g).opacity })()")
    check("after camera shows the 'before' as a ghost overlay", bool(gh), str(gh))
    check("after camera shows progress (1 of 3)", "1 of 3" in page.inner_text("#c-t"), page.inner_text("#c-t").replace("\n", " "))
    page.screenshot(path=f"{OUT}/camera_after.png")
    page.fill("#c-op", "80"); op = page.evaluate("getComputedStyle(document.querySelector('#cam .ghost')).opacity"); check("overlay strength slider works", abs(float(op) - .8) < .01, op)
    page.click("#c-shot"); page.wait_for_timeout(700); check("advances to the next before (2 of 3)", "2 of 3" in page.inner_text("#c-t"))
    page.click("#c-skip"); check("Skip moves on (3 of 3)", "3 of 3" in page.inner_text("#c-t"))
    page.click("#c-shot"); page.wait_for_selector(".pair", timeout=10000)   # last target done -> camera closes itself
    page.wait_for_function("document.querySelector('#cam').hidden", timeout=5000)
    st = page.inner_text(".stats"); check("shot-by-ghost afters are paired automatically, no matching step", "2 pairs" in st and "1 to sort" in st, st.replace("\n", " | "))
    # retake an after from its pair card
    page.click("[data-act=retake]"); page.wait_for_selector("#cam .ghost"); page.wait_for_function("document.querySelector('#cam video').videoWidth > 0"); page.click("#c-shot"); page.wait_for_selector(".pair"); page.wait_for_timeout(500)
    st = page.inner_text(".stats"); check("retake replaces the after (still 2 pairs, 5 photos)", "2 pairs" in st and "5 photos" in st, st.replace("\n", " | "))
    check("no page errors", not errs, "; ".join(errs)[:200]); b.close()
print("SUMMARY", sum(RESULTS), "/", len(RESULTS))

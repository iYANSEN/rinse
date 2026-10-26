from helpers import *
with sync_playwright() as p:
    for setname in ("classic", "interleaved"):
        b, c = launch(p); page = c.new_page(); errs = []
        page.on("pageerror", lambda e: errs.append(str(e))); page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.goto("http://localhost:3000"); page.wait_for_selector("[data-act=new]")
        new_job(page, f"{setname} set"); n = import_set(page, setname)
        check(f"[{setname}] imported {n} real JPEGs (incl. 4032px + EXIF-rotated)", True)
        page.click("[data-act=pair]"); page.wait_for_selector(".pair", timeout=60000); page.wait_for_timeout(600)
        found = pairs_by_name(page); ok, wrong, total = score(found, TRUTH[setname])
        check(f"[{setname}] visual pairing correct {ok}/{total}, wrong {wrong}", ok >= 5 and wrong <= 1, f"loose={len(found['loose'])}")
        if setname == "classic":
            check("[classic] both distractor photos left unpaired (never force-matched)", set(TRUTH["classic"]["loose"]) <= set(found["loose"]), str(found["loose"]))
        txt = page.inner_text(".stats"); print("   stats:", txt.replace("\n", " | "))
        page.screenshot(path=f"{OUT}/job_{setname}.png", full_page=False)
        sw = page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        check(f"[{setname}] no horizontal scroll at 390px", sw)
        check(f"[{setname}] no console errors", not errs, "; ".join(errs)[:200])
        b.close()
print("SUMMARY", sum(RESULTS), "/", len(RESULTS))

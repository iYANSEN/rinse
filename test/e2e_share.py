from helpers import *
import re, urllib.request
BASE = "http://localhost:3000"
with sync_playwright() as p:
    b, c = launch(p); page = c.new_page(); errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    hook_calls = []
    def hook(route):
        hook_calls.append(route.request.post_data or ""); route.fulfill(status=200, body="ok")
    page.route("https://hooks.test/**", hook)
    page.goto(BASE); page.wait_for_selector("[data-act=new]")
    # settings: business, phone, review, colour, webhook + auto-send
    page.click("#settings"); page.fill("#s-biz", "Sparkle Pressure Washing"); page.fill("#s-phone", "(555) 123-4567"); page.fill("#s-review", "https://g.page/r/sparkle/review")
    
    cols = ["#0a7a79", "#1d4ed8", "#15803d", "#6d28d9", "#b91c1c", "#334155"]; allok = True
    for i in (4, 2, 1):   # real taps at each swatch's coordinates; the matching colour must be the one selected
        bx = page.locator("#s-colors label").nth(i).bounding_box(); page.mouse.click(bx["x"] + bx["width"]/2, bx["y"] + bx["height"]/2)
        allok &= page.evaluate("document.querySelector('#s-colors input:checked').value") == cols[i]
    check("colour swatches: tapping each swatch selects that colour", allok)
    page.fill("#s-hook", "https://hooks.test/catch/1"); page.check("#s-auto"); page.click("#set-form button[value=ok]")
    new_job(page, "Patel driveway & deck", "Mr. Patel"); import_set(page, "interleaved")
    page.click("[data-act=pair]"); page.wait_for_selector(".pair", timeout=60000)
    # captions
    caps = ["Driveway", "Back deck", "Front steps", "Fence", "Patio"]
    for i, ctext in enumerate(caps):
        page.locator(".cap").nth(i).fill(ctext); page.locator(".cap").nth(i).blur()
    page.wait_for_timeout(300)
    # ---- publish online
    page.click("[data-act=sh-make]"); page.wait_for_selector(".share .url", timeout=90000)
    url = page.inner_text(".share .url span").strip(); check("hosted link created", bool(re.match(r"http://localhost:3000/g/[\w-]{6,}$", url)), url)
    html = urllib.request.urlopen(url).read().decode()
    check("gallery HTML: 5 sliders, captions, business, review CTA, tel link", html.count("<figure>") == 5 and "Back deck" in html and "Sparkle Pressure Washing" in html and "Leave a review" in html and 'href="tel:5551234567"' in html)
    check("gallery HTML: brand colour applied + og:image for text-message previews", "--brand:#1d4ed8" in html and 'property="og:image"' in html)
    imgs = re.findall(r'src="(/g/[^"]+)"', html); r0 = urllib.request.urlopen(BASE + imgs[0]); body = r0.read()
    check("gallery images served as JPEG with long cache", r0.headers["Content-Type"] == "image/jpeg" and "immutable" in r0.headers["Cache-Control"] and body[:2] == b"\xff\xd8", f"{len(imgs)} imgs, first {len(body)//1024}KB")
    ok_all = all(urllib.request.urlopen(BASE + u).status == 200 for u in imgs); check("every gallery image resolves (no broken images)", ok_all)
    # CRM auto-send exactly once with gallery url
    page.wait_for_function("document.querySelector('#net').innerText === 'Online'", timeout=15000); page.wait_for_timeout(1500)
    check("CRM webhook auto-sent exactly once", len(hook_calls) == 1, f"{len(hook_calls)} calls")
    if hook_calls: check("CRM payload has gallery_url, job_name, areas (form-encoded)", url in hook_calls[0].replace("%3A", ":").replace("%2F", "/") and "job_name=Patel" in hook_calls[0] and "Back+deck" in hook_calls[0], hook_calls[0][:90])
    # screenshots of client page
    pg2 = c.new_page(); pg2.goto(url); pg2.wait_for_selector("figure"); pg2.wait_for_timeout(2500); pg2.screenshot(path=f"{OUT}/gallery_mobile.png")
    d = b.new_context(viewport={"width": 1280, "height": 900}); pd = d.new_page(); pd.goto(url); pd.wait_for_selector("figure"); pd.wait_for_timeout(2500); pd.screenshot(path=f"{OUT}/gallery_desktop.png")
    check("gallery: no horizontal scroll on phone", pg2.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    # slider drag on the hosted page (mouse on desktop)
    box = pd.locator(".cmp").first.bounding_box(); pd.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2); pd.mouse.down(); pd.mouse.move(box["x"] + box["width"]*0.8, box["y"] + box["height"]/2, steps=5); pd.mouse.up()
    pv = pd.evaluate("getComputedStyle(document.querySelector('.cmp')).getPropertyValue('--p')"); check("slider drags (desktop)", abs(float(pv.strip('%')) - 80) < 3, pv)
    # ---- edit -> stale -> update keeps SAME link
    page.locator(".cap").first.fill("Front driveway"); page.locator(".cap").first.blur(); page.wait_for_selector(".share .note.warn")
    check("changing a caption flags 'Update link'", True)
    page.click(".share [data-act=sh-make]"); page.wait_for_function("!document.querySelector('.share .note.warn') && document.querySelector('.share .url')", timeout=90000)
    url2 = page.inner_text(".share .url span").strip(); check("update keeps the same link", url2 == url, url2)
    check("updated link shows new caption", "Front driveway" in urllib.request.urlopen(url).read().decode())
    # ---- offline: queue publish + CRM, then sync on reconnect
    page.locator(".cap").nth(1).fill("Rear deck"); page.locator(".cap").nth(1).blur(); page.wait_for_selector(".share .note.warn")
    c.set_offline(True); page.wait_for_function("document.querySelector('#net').innerText.startsWith('Offline')", timeout=10000)
    page.click(".share [data-act=sh-make]"); page.wait_for_selector("text=Waiting for signal"); chip = page.inner_text("#net")
    check("offline: chip shows Offline + queued", "Offline" in chip and "waiting" in chip, chip)
    n_before = len(hook_calls); c.set_offline(False)
    page.wait_for_function("!document.body.innerText.includes('Waiting for signal') && document.querySelector('.share .url') && !document.querySelector('.share .note.warn')", timeout=90000)
    page.wait_for_timeout(1500)
    check("reconnect: queued publish uploaded automatically", "Rear deck" in urllib.request.urlopen(url).read().decode())
    import urllib.parse
    stamps = [urllib.parse.parse_qs(x).get("sent_at", [""])[0] for x in hook_calls]
    check("CRM: 3 publishes -> exactly 3 events, no duplicates after reconnect", len(hook_calls) == 3 and len(set(stamps)) == 3, f"{len(hook_calls)} calls, {len(set(stamps))} unique")
    check("no page errors", not errs, "; ".join(errs)[:200])
    b.close()
print("SUMMARY", sum(RESULTS), "/", len(RESULTS))

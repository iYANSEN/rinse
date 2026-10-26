"""Builds test photo sets from REAL photographs (scikit-image's bundled sample photos).
They are not pressure-washing photos, so each "before" gets realistic grime (mildew blotches, grey cast, lost contrast,
speckle) and each "after" gets hand-held misalignment (small shift, crop, rotation). Pairing is judged against truth.json.
Run: python3 test/make_photos.py   ->  test/photos/{classic,interleaved}/ + truth.json
"""
import json, os, random, shutil
import numpy as np
from PIL import Image, ImageFilter
import skimage.data as d

random.seed(7); np.random.seed(7)
OUT = os.path.join(os.path.dirname(__file__), "photos")
shutil.rmtree(OUT, ignore_errors=True)

def rgb(a):
    im = Image.fromarray(a)
    return im.convert("RGB")

SRC = {  # name -> real photo
    "astronaut": rgb(d.astronaut()), "cat": rgb(d.chelsea()), "coffee": rgb(d.coffee()), "rocket": rgb(d.rocket()),
    "retina": rgb(d.retina()), "hubble": rgb(d.hubble_deep_field()), "gravel": rgb(d.gravel()).convert("RGB"), "brick": rgb(d.brick()).convert("RGB"),
}

def blotches(w, h):
    """Low-frequency mildew/algae mask in [0,1]."""
    m = np.zeros((h, w), np.float32)
    for scale, amp in ((8, .6), (24, .3), (64, .15)):
        n = np.random.rand(max(2, h // scale), max(2, w // scale)).astype(np.float32)
        n = np.array(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32) / 255
        m += amp * n
    m = (m - m.min()) / (m.max() - m.min() + 1e-6)
    return np.clip((m - .45) * 2.2, 0, 1)

def make_before(im):
    a = np.asarray(im, np.float32) / 255; h, w = a.shape[:2]
    mean = a.mean(axis=(0, 1), keepdims=True); a = mean + (a - mean) * .72           # lost contrast
    a = a * np.array([.86, .9, .8], np.float32)                                        # grey-green cast, darker
    mask = blotches(w, h)[..., None]
    grime = np.array([.18, .26, .12], np.float32)                                      # dark green/black mildew
    a = a * (1 - .62 * mask) + grime * .62 * mask
    sp = (np.random.rand(h, w, 1) > .985).astype(np.float32) * np.random.rand(h, w, 1)  # dirt speckle
    a = a * (1 - .5 * sp)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

def make_after(im):
    w, h = im.size
    a = im.rotate(random.uniform(-1.2, 1.2), resample=Image.BICUBIC, expand=False)
    dx, dy = int(w * random.uniform(-.03, .03)), int(h * random.uniform(-.03, .03))
    c = int(min(w, h) * .03); a = a.crop((c + dx if dx > 0 else c, c + dy if dy > 0 else c, w - c + (dx if dx < 0 else 0), h - c + (dy if dy < 0 else 0))).resize((w, h), Image.BICUBIC)
    a = Image.eval(a, lambda v: min(255, int(v * 1.06 + 6)))                           # cleaner, brighter
    return a

def to_phone(im, long_edge):
    w, h = im.size; s = long_edge / max(w, h); return im.resize((int(w * s), int(h * s)), Image.LANCZOS)

def save(im, path, mtime, exif_orientation=None, q=88):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if exif_orientation:
        ex = Image.Exif(); ex[274] = exif_orientation; im.save(path, "JPEG", quality=q, exif=ex)
    else: im.save(path, "JPEG", quality=q)
    os.utime(path, (mtime, mtime))

AREAS = ["astronaut", "cat", "coffee", "rocket", "retina", "hubble"]
T0 = 1_760_000_000  # fixed capture start
truth = {}

def build(setname, interleaved):
    pairs, loose = [], []
    names = list(range(1000, 1000 + 40)); random.shuffle(names)
    k = 0
    for i, a in enumerate(AREAS):
        base = to_phone(SRC[a], 2400 if a != "retina" else 4032)   # one genuinely big (4032px, ~phone sensor) file
        b, af = make_before(base), make_after(base)
        bt = T0 + (i * 150 if interleaved else i * 40)
        at = (bt + 600) if interleaved else (T0 + 3600 + i * 40)
        fb, fa = f"IMG_{names[k]}.jpg", f"IMG_{names[k+1]}.jpg"; k += 2
        orient = None
        if a == "rocket":                       # an iPhone-style portrait shot: pixels stored sideways + EXIF Orientation=6
            af = af.rotate(90, expand=True); orient = 6
        save(b, f"{OUT}/{setname}/{fb}", bt); save(af, f"{OUT}/{setname}/{fa}", at, exif_orientation=orient)
        pairs.append([fb, fa])
    if setname == "classic":                    # a lone "before" with no after, plus a lone unrelated "after"
        f = f"IMG_{names[k]}.jpg"; save(make_before(to_phone(SRC["gravel"], 2000)), f"{OUT}/{setname}/{f}", T0 + 300); loose.append(f); k += 1
        f = f"IMG_{names[k]}.jpg"; save(make_after(to_phone(SRC["brick"], 2000)), f"{OUT}/{setname}/{f}", T0 + 4000); loose.append(f)
    truth[setname] = {"pairs": pairs, "loose": loose}

build("classic", False); build("interleaved", True)
json.dump(truth, open(f"{OUT}/truth.json", "w"), indent=1)
# a contact sheet so a human can eyeball the test material
sheet = Image.new("RGB", (6 * 220, 2 * 165 + 6), "white")
for i, (fb, fa) in enumerate(truth["classic"]["pairs"]):
    for r, f in enumerate((fb, fa)):
        im = Image.open(f"{OUT}/classic/{f}"); im = im.convert("RGB"); im.thumbnail((214, 160)); sheet.paste(im, (i * 220 + 3, r * 168 + 3))
sheet.save(f"{OUT}/contact_sheet.jpg", quality=85)
n = sum(len(os.listdir(f"{OUT}/{s}")) for s in truth)
print("photos:", n, "| sizes MB:", sorted({round(os.path.getsize(f"{OUT}/classic/{f}")/1e6, 1) for f in os.listdir(f"{OUT}/classic")}))

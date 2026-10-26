# Devpost submission copy — Rinse

Paste each block into the matching field on the Devpost project form. Edit the voice if you want it to sound more like you; the facts match the shipped build.

---

## Project name

Rinse

## Tagline (short)

Before/after photos for small cleaning crews — paired automatically, sent as one link with a slider, even with no signal.

## Links

- **Live app:** https://rinse-weld-kappa.vercel.app
- **Demo (no account needed):** https://rinse-weld-kappa.vercel.app/?demo=1
- **Example client link:** https://rinse-weld-kappa.vercel.app/g/iO3CCoUAEW0
- **Repo:** https://github.com/iYANSEN/rinse
- **Video:** <add 1–3 min demo video URL here>

## Inspiration

A pressure-washing owner posted his problem on [r/AppIdeas](https://www.reddit.com/r/AppIdeas/s/804F3d7JBV): 20–40 photos per job on his phone, before/after is the whole product for him, and the tools that do it cost more per month than some of his jobs. He listed five asks: group by job, make before/after obvious, give the client something beautiful, survive bad signal, and push the result into his CRM.

I had only ever built things for myself, so this was the first time the requirements were written by someone I have never met — with money on the line and no reason to be polite about whether the result works. That changed how I designed it: every screen had to answer one of those five asks, and anything that didn't got cut. Rinse is those five asks, built small enough for a one-man crew.

## What it does

Open a job, shoot **Before**, wash, shoot **After**. A faded copy of each before sits over the viewfinder, so the after lines up and pairs itself. Photos can also be imported in bulk — resized on the device, EXIF-aware, no upload needed.

Each job becomes **one hosted link** the client can slide through: your logo, colour and phone, a review button, a call button, and a text-message preview. Updating the gallery keeps the same link.

Everything works offline: jobs, photos, pairing and link creation queue on the phone and go out when signal returns.

## How we built it

Vanilla JavaScript, no framework, no build step — one page, a service worker and IndexedDB. Photos never leave the device during capture: they are downscaled to 1600 px plus a 384 px thumbnail with canvas, and a 32×24 fingerprint is computed for pairing.

Pairing runs in two layers: a deterministic visual matcher (fingerprint distance plus capture order) that works with no network, and an optional AI pass that can also write area captions and the client message. When the model is unavailable the app falls back to the local matcher and a template message, so the demo never becomes a dead end.

The client link is a serverless function on Vercel that stores the gallery snapshot and photos in a private Blob store; published pages are self-contained HTML with inline CSS and drag-to-compare sliders, escaped user text, and no framework on the client side either.

The whole thing is a PWA: it installs to the home screen, caches the shell and the demo photos, and reloads offline.

## Challenges we ran into

- **Offline-first without a backend queue.** Publish and CRM tasks live in IndexedDB as an outbox; a job can be fully finished on a plane.
- **One link that survives updates.** The gallery is versioned — updating replaces the content but keeps the same URL, so links already texted to clients stay valid.
- **A demo that never looks empty.** The app boots with your own workspace empty and a separate sample workspace behind `?demo=1` (11 jobs, 9 finished pairs, one still waiting for its after photo, one unpaired). The two never mix.
- **Shipping on a phone-sized screen.** Rebuilt the header, job page and calendar for 360–390 px: status dot instead of clutter, the client link and sliders above the fold, coloured calendar dots instead of cut-off labels.
- **No build step sounds easy until caching.** Precache lists, cache versions and the demo photo cache all have to agree or the first offline reload breaks.

## Accomplishments we're proud of

- The demo works with the network completely off — verified by disabling the network and reloading: 11 jobs and their photos still render.
- A whole job, from first photo to a link the client can open, needs no account, no server round trip during capture, and no API key.
- The client page is real HTML, not a screenshot: sliders, keyboard and screen-reader friendly, escaped against hostile input.

## What we learned

- The hard part of "offline-first" is not storage, it is every decision that assumes a network: link creation, image encoding, retries.
- An AI feature is only shippable when there is a deterministic path beside it. The visual matcher is what lets the AI part be optional instead of load-bearing.
- Constraint is a design tool. Cutting accounts, sync and PDF reports is what made the client link good.

## What's next for Rinse

Accounts and a small team (two phones, one job), cross-device sync, timestamp/GPS stamps on photos, PDF reports for property managers, link expiry and revocation, and a proper two-way CRM integration instead of a webhook.

## Built with

`javascript`, `html`, `css`, `pwa`, `service-worker`, `indexeddb`, `canvas`, `vercel`, `vercel-blob`, `node.js`, `ai`, `claude-sonnet`

---

## Notes for the submission form

- The hackathon asks for a public repo. Keep `README.md`, `devpost/scope.md`, `devpost/prd.md` and `devpost/spec.md` at the top of the repo — they describe exactly what was built.
- Do not paste any API key or `.env` contents into Devpost, the video, or the repo.
- The sample photos in `paired-photos/` are bundled placeholders for the demo, not a customer's job.

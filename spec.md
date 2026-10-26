# Rinse: Technical spec (matches this repo)

**Stack.** Static app (`index.html`, `app.js`, `styles.css`, `pairing.js`, `gallery-template.js`), service worker, manifest (PWA), self-hosted Figtree font. Serverless functions in `api/`: `pair`, `share`, `g`, `health`. Storage adapter in `lib/store.js`. No framework, no build step.

**On device.** Two IndexedDB databases with the same stores: `rinse` (your own jobs) and `rinse-demo` (the sample workspace). Stores: `jobs`, `photos` (1600px JPEG blob + 384px thumbnail + 32x24 fingerprint), `outbox` (publish and CRM tasks). `?demo=1` selects the demo database, `&reset=1` deletes and reseeds it; the live database purges any sample jobs an older build left behind. Settings in localStorage; contacts are namespaced (`rinse.contacts` / `rinse.contacts.demo`).

**Pairing.** (1) `pairing.js`: brightness-invariant 32x24 fingerprints, best correlation over small shifts, greedy best-first matching, threshold 0.6, earlier shot = before. Offline. (2) `api/pair.js`: up to 40 thumbnails to an OpenAI-compatible vision model (`LLM_API_KEY/BASE_URL/MODEL`), plain JSON back (roles, pairs, captions, message), retries without `response_format` if a proxy rejects it, strips code fences, maps 401/429/timeouts/unreachable to clear errors. Rate limited per visitor and per day. Unpaired leftovers go through (1).

**Hosted links.** `POST /api/share` in three ops (`create`, `img` per photo, `done`) so each request is small and resumable. A revision only goes live on `done`, after every image is confirmed present, so a dropped connection never leaves a broken gallery. Edit token (hashed server-side) allows updating the same `/g/:id`. `GET /g/:id` renders `gallery-template.js` on the server; images are immutable-cached by revision. Storage: Upstash Redis REST where configured, otherwise a private Vercel Blob store (when `BLOB_READ_WRITE_TOKEN` is set), otherwise local disk in dev and `/tmp` on Vercel (flagged as temporary).

**Gallery template.** One file renders both the hosted page and the offline export. All user text is escaped; colour, phone, URLs and image sources are validated.

**CRM.** Form-encoded POST (`mode: no-cors`, no preflight) of flat fields plus a `json` field, from the outbox; guarded against double sends. Compatible with Zapier/Make catch hooks (response is opaque to the browser).

**Known limits.** Visual matching needs scene structure; AI quality depends on the model; no accounts or cross-device sync; webhook delivery is fire-and-forget.

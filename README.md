# Rinse 💧

Before/after photo management for pressure-washing and other exterior-service crews. Shoot on site, Rinse pairs the photos, and your client gets **one link with a slider**. Works with no signal. Built for the Devpost *Build With AI: Basics* hackathon.

**Try it:** **[rinse-weld-kappa.vercel.app/?demo=1](https://rinse-weld-kappa.vercel.app/?demo=1)** — 11 sample jobs, no sign-in and no API key needed (or press **Explore the demo · 11 jobs** on the home screen). Your own workspace starts empty.

**Source:** [github.com/iYANSEN/rinse](https://github.com/iYANSEN/rinse)

**See a client link:** [rinse-weld-kappa.vercel.app/g/iO3CCoUAEW0](https://rinse-weld-kappa.vercel.app/g/iO3CCoUAEW0)

**Planning docs:** [scope.md](scope.md) · [prd.md](prd.md) · [spec.md](spec.md) · [build log](BUILD_LOG.md) — with the [competitor research](COMPETITORS.md) and the [design system](DESIGN.md) behind them.

**Built with the Devpost Learn Skill Pack:** `1-start` (learner profile) → `2-scope` (scope.md) → `3-prd` (prd.md) → `4-spec` (stack, data, file structure) → `5-build` (ordered, verified, committed steps) → `6-ship` (submission text and demo plan). The skill pack is the method, not a feature — see [devpost/story.md](devpost/story.md) for how each step changed the build.

## What it does
| The business owner asked for | In Rinse |
|---|---|
| Group and organise by job | Jobs, each with its photos, pairs, message and share link |
| Organise before/after easily | **Ghost-overlay camera** (the "after" lines up with the faded "before" and pairs itself), bulk import, **visual auto-pairing that works offline**, optional AI pairing + captions |
| A beautiful link for clients | Hosted `/g/:id` page: photo-first sliders, your logo/colour/phone, review button, rich text-message preview. Update it and the link stays the same |
| Offline upload, sync when back | Everything is stored on the phone; "Create client link" and CRM sends wait in an outbox and go out when signal returns |
| API / Zapier / Make | Webhook with the gallery URL, areas and message; auto-send when a link is ready |

See `COMPETITORS.md` for the research behind these choices.

## Run locally
```
node server.js        # http://localhost:3000   (Node 18+, no install step)
```

## 🔑 Where the API key goes
1. Open **`.env`** (already in the project, git-ignored).
2. Paste the key after `LLM_API_KEY=` and save.
3. Check it with real photos: **`npm run test:ai`**. It sends 14 sample photos to your endpoint and prints accuracy, or says exactly what's wrong (bad key / wrong URL / timeout).
4. Restart `node server.js`. The terminal says `AI pairing : ON`, and Settings in the app shows the model.

The key stays on the server and is never sent to the browser. Without a key everything still works; pairing just uses on-device matching. Defaults: `LLM_BASE_URL=https://api.freeaiapikey.com/v1`, `LLM_MODEL=anthropic/claude-sonnet-5`. Change them in `.env` if your key needs different ones.

## Deploy (Vercel, free)
1. Push this folder to GitHub (`.env` is ignored, so the key is not published).
2. Vercel → *Add New Project* → import, framework "Other".
3. Environment Variables: add `LLM_API_KEY` (plus `LLM_BASE_URL` / `LLM_MODEL` if needed).
4. **For permanent client links**, add storage: Vercel → Storage → *Upstash Redis* (fills `UPSTASH_REDIS_REST_URL/TOKEN` for you). Without it, links are temporary and the app says so.
5. Redeploy, open the link on a phone, "Add to Home Screen".

## Tests
`node server.js` in one terminal, then `npm run test:e2e` (needs python3 + playwright, Pillow, scikit-image, numpy). Test photos are generated from real photographs by `test/make_photos.py`. The suite covers pairing accuracy, camera overlay, offline reload, hosted links, CRM exactly-once, AI success / bad key / odd proxies, XSS and token abuse, both storage backends.

## Honest limits
- Tested with real photographs plus synthetic grime, **not real pressure-washing jobs**. Visual matching scores 0.85-0.94 on true pairs and left unrelated photos alone, but dirt that hides all structure will need a manual tag.
- AI pairing is verified against a mock model and a mock-key script; real-model quality is checked by `npm run test:ai` once the key is in.
- The CRM webhook is a no-CORS form post, so Rinse can't see Zapier/Make's reply ("sent" means the request left the phone). Use **Send test to CRM** in Settings and check your Zap's history.
- Vercel routing (`vercel.json`) and Upstash were tested with a local mock, not on Vercel itself.
- No accounts, teams or cross-device sync yet. Photos live on the phone that took them.

## Workflow dashboard update
The home screen now replaces the gamified rank with an actionable **Ready to send** count. Tap the count to filter to complete galleries that have not been shared yet. Job cards are ordered by work state (sync queue, photos needed, photos to review, ready to send, then shared) and show the next useful action. The dashboard sync panel reports offline state and queued actions, including CRM actions.

This build puts the effort into the workflow and the client link rather than new platform features: no server-side accounts, no multi-device photo sync, and no new AI grouping; photos live in the browser's IndexedDB on the device that captured them.

## Demo workspace (this build)

- Your own jobs live in a separate database from the demo, so the app you open is empty until you add work. `/?demo=1` opens the samples; `/?demo=1&reset=1` reseeds them.
- 11 sample jobs with 21 sample before/after photographs from `paired-photos/`, dated over the past nine days, plus two upcoming jobs on the calendar. Nine have complete pairs, one still needs its after photo, and one is unpaired so you can try **Pair**.
- A banner marks the sample workspace: **Reset** reseeds it, **Exit demo** returns to your own jobs.
- The home dashboard's **Jobs**, **Ready to send**, and **Sync** status cells are interactive.
- **Calendar** provides a month grid and agenda based on each job's date and due date.
- Jobs support a date, due date, and notes; job pages include a chronological timeline.
- **Contacts** builds a local customer list from job names, supports the browser Contact Picker where available, and can import/export CSV.
- Settings inputs stay readable in both themes; the job page puts the client link and sliders first and keeps the timeline collapsed.
- Sample photos come from a working pressure-washing business's public before/after portfolio: real surfaces, but not my jobs. Replace them with your own authorized job photos before presenting them as client evidence. Contact Picker support depends on the browser and device; CSV import/export is the fallback. Contacts remain local to this browser and are not automatically synchronized to the phone's address book.

## License

[MIT](LICENSE) © 2026 iYANSEN. Demo music ("Inspired", Kevin MacLeod) is CC BY 4.0 — see [video-script.md](devpost/video-script.md) for the attribution to paste on the video page.

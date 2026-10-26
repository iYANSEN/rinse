# Build log — Rinse

Devpost *Build With AI: Basics*, October 2026. A short, honest record of what was used, what changed, and what was actually verified.

## Tools

- **Claude (chat):** planning, competitor research, design direction, submission copy.
- **OpenCode with a coding agent:** implementation, verification, deployment.
- **Devpost Learn Skill Pack:** `1-start` (learner profile), `2-scope` (scope.md), `3-prd` (prd.md), `4-spec` (stack, data, file structure), `5-build` (ordered steps, verify and commit each one), `6-ship` (submission text and demo plan).
- **Runtime:** Vercel (static + one serverless function), a private Blob store for hosted client links, and an OpenAI-compatible endpoint for the optional model pass.

## Pivots

1. **Red Ink** — an AI tutor that marks the first wrong step of a Bac maths solution in red. The idea survived the scope review; the build did not. Cut before any code.
2. **A pairing demo built around the skill pack** — polished, but designed for nobody in particular.
3. **Rinse** — after finding a pressure-washing owner's request on [r/AppIdeas](https://www.reddit.com/r/AppIdeas/s/804F3d7JBV): five concrete asks, and one incumbent (CompanyCam) that small crews describe as too expensive. A real user's list replaced my guesses, and that is what made the scope finishable.

## Decisions

- **Deterministic first, AI optional.** Pairing runs on image fingerprints plus capture order; the model adds hard-case pairing, captions and the client message. With no key and no network the app still works.
- **Offline is the default, not a feature.** Photos go straight into IndexedDB; publishing a link and sending to a CRM wait in an outbox and drain when signal returns.
- **One link, versioned.** Re-publishing updates the gallery and keeps the URL a client already has.
- **Two workspaces.** Real jobs and the 11-job sample workspace never mix (`?demo=1`).
- **No AI-generated "after" photos.** The photograph is the evidence; AI is not allowed near it.
- **Vanilla JS, no build step.** Fewer moving parts to break on a phone during a demo.

## Evidence

- `test/` holds browser suites for pairing, the camera overlay, offline reload and hosted links, plus a share-API security suite (token abuse, path traversal, non-image uploads, escaping). Run with `npm run test:e2e` against `node server.js`.
- Pairing matcher: every correct pair on the sample set was matched correctly, with zero wrong pairs; the one miss was an image with no scene structure to match.
- The AI path was exercised against a mock provider (including a rejected key and a proxy that ignores JSON mode); `npm run test:ai` checks the real endpoint once a key is set.
- Manual verification of the deployed build: demo seeds 11 jobs / 9 pairs, a client link is created and opens as a gallery, and the app reloads with the network disabled.
- Competitor pricing and feature gaps are recorded in `COMPETITORS.md`.

## What I would change

The planning documents drift the moment the build changes. Three mid-build decisions — two databases instead of one, Blob storage instead of local disk, AI demoted from required to optional — each left `scope.md`, `prd.md` and `spec.md` describing an app that no longer existed. They were reconciled against the shipped code at the end; that reconciliation should be a step in the process, not an afterthought.

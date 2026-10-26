# Rinse: Scope

**One line:** before/after photo management for small cleaning and exterior-service crews, with a beautiful link the client can slide through.

**Origin:** a pressure-washing business owner (20-40 photos per job, CompanyCam too expensive for a small team) asked for five things: group by job, easy before/after, a lovely client page, offline capture that syncs later, and a Zapier/Make hook into their CRM. Competitor research is in `COMPETITORS.md`.

**Built:** jobs; ghost-overlay camera (after lines up with before and auto-pairs); bulk import (resized on device, EXIF-aware); offline visual auto-pairing + optional AI pairing, captions and message; drag-to-compare sliders; **hosted client link** (branding, review button, call button, text-message preview, stable on update); outbox that queues link creation and CRM sends offline; share-ready image per pair; installable PWA; **two isolated workspaces** — your own jobs, plus an 11-job sample demo (`/?demo=1`) with real before/after photos that works offline.

**Not built (next):** accounts and team members, cross-device photo sync, GPS/timestamp stamps on photos, PDF reports, direct CRM integrations beyond a webhook, link expiry controls and deleting a published link.

**Deliberately not built:** AI-generated "after" photos.

# Rinse: PRD (one page)

**Journey.** Open Rinse → **New job**, or **Explore the demo** for a preloaded 11-job sample workspace (your own workspace starts empty; **Exit demo** returns to it). Shoot with **Before**, wash, then **After**: a faded copy of each before sits over the viewfinder, and the shot pairs itself. Or **Import** photos and press **Pair** (on-device visual matching; AI if a key is set). Name areas, fix any pair (Swap / Unpair / Retake). **Create client link**: photos upload once, the link opens a branded slider gallery; **Copy / Share**, or **Image** for a social post. Changing the job shows "Update link" and the link stays the same. If a CRM webhook is set, the gallery URL is sent automatically.

**Screens.** Home (jobs with photo covers), Job (stats, client link card, pairs with sliders, photos to sort, message, capture dock), Camera, Settings (business, phone, review link, colour, logo, webhook), hosted Client gallery.

**Rules.** Photos stay on the phone until the user creates a link. Only 384px thumbnails go to the AI, only when the user presses Pair. Everything works with no network except uploading the link and the webhook, which wait in an outbox. A failed or rejected AI call falls back to on-device matching and says so.

**States.** Empty job: how to start. Demo: a banner marks the sample workspace, **Reset** reseeds it, **Exit demo** returns to your own jobs. Offline: chip shows Offline and the queue size; "Create client link" says it will wait. No webhook: Settings opens. Link out of date: warning + Update link. Server without a database: warns that links are temporary.

**Acceptance.** The demo opens in its own workspace with 11 jobs, 9 working sliders, one job that still needs an after photo, and one unpaired job. Your own workspace starts empty and never shows sample jobs. Real-photo sets pair correctly with zero wrong matches. Ghost camera produces auto-paired afters. Offline reload keeps jobs and the demo. Link survives update unchanged. CRM sends exactly once per publish, including after reconnect. No horizontal scroll at 390 px or 360 px. Hostile text in a gallery is escaped.

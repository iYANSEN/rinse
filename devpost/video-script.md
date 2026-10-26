# Rinse — demo video (cut v1: 1:00)

`devpost/media/rinse-demo-60s.mp4` — 1920×1080, 30 fps, silent. Every frame in the app panel is
real footage of the deployed demo captured at 390×844; no UI was drawn or invented.

Record your voice against this cut, then send two clips and I splice them in.

---

## Voiceover (read at ~155 wpm)

| In | Out | On screen | Say |
|---|---|---|---|
| 0:00 | 0:04 | Title card | *Pressure washing ends with two photos. Sending them is the hard part.* |
| 0:04 | 0:09.6 | Demo workspace, 11 jobs | *This is Rinse. It runs on the phone in the truck, and it works with no signal.* |
| 0:09.6 | 0:13.3 | Job list scrolling | *Eleven jobs. Nine already have before and after pairs.* |
| 0:13.3 | 0:15.1 | One job opens | *Open one.* |
| 0:15.1 | 0:22.1 | Slider dragged both ways | *Drag it. These are the crew's own photos — nothing here is generated. The AI only helps with the boring parts.* |
| 0:22.1 | 0:28.3 | "Sharing with your client", progress bar | *Publish once, and the client gets one link. No app, no account for them.* |
| 0:28.3 | 0:41.3 | Client gallery, slider | *On their phone it's a slider, not a folder of forty photos. He sees the difference before he pays. And the link stays the same when you update the job.* |
| 0:41.3 | 0:49.0 | "Ready to send" filter | *Back on the list, ready jobs sort to the top, so you know what to send next.* |
| 0:49.0 | 0:55.4 | Offline: orange dot, SYNC OFFLINE, list scrolls | *No signal? The jobs still open, because every photo lives on the device, not in the cloud.* |
| 0:55.4 | 1:00.4 | End card | *Rinse. Built for the Build With AI basics hackathon. The demo is open — link below.* |

## Two clips to record (phone camera, landscape or portrait — either is fine)

**A · Field clip, 6–8 s.** Before/after at a real surface: one shot of the dirty surface, then the
same angle after the wash. Natural sound is fine. I cut it in at 0:15 as a short insert, so the
voiceover keeps running under it.

**B · Face cam, 10–15 s.** Straight to camera, say roughly:

> *I built this with the Build With AI skill pack: scope, then the product doc, then the technical
> spec, then the build log — and the AI parts are optional. Vanilla JavaScript, no build step.*

I put it in at 0:55, before the end card, and the video lands around 1:15.

## Recording rules

- Your own voice, quiet room, phone mic is fine. No text-to-speech.
- Landscape 1920×1080 for the face cam; model or hands in frame.
- Never show a key, `.env`, terminal with secrets, or the Vercel dashboard.
- Don't claim anything the app doesn't do: no automatic captions for the client, no follow-up
  texts, no rebook reminders, no calendar feed.

## What is already in the cut

Real capture of `rinse-weld-kappa.vercel.app/?demo=1`: the demo workspace, a job page, the
before/after slider dragged both ways, a real gallery publish (upload progress, then the live
client URL), the client gallery with its slider, the "Ready to send" filter, and the app reloaded
with the network off — orange dot, `SYNC OFFLINE`, `Saved on this device`, jobs still opening.

The publish in the video is a real upload to the deployed serverless function, not a mock.

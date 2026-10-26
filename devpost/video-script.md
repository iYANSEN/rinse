# Rinse — demo video (cut v2: 1:18, narrated)

`devpost/media/rinse-demo.mp4` — 1920×1080, 30 fps, 1:17.9, AAC stereo, −16 LUFS.
Every frame in the app panel is real footage of the deployed demo captured at 390×844; no UI was
drawn, mocked or generated. The publish in the video is a real upload to the deployed function.

## Timeline

| In | Out | On screen |
|---|---|---|
| 0:00.0 | 0:04.0 | Title card |
| 0:04.0 | 0:55.4 | Live app: demo workspace → job list → job → before/after slider → real publish → client gallery → "Ready to send" → offline reload |
| 0:55.4 | 1:11.7 | "Four docs. Then the app." — scope.md, prd.md, spec.md, BUILD_LOG.md, then the three chips |
| 1:11.7 | 1:17.9 | End card: demo URL, "No account. No API key. Works offline.", repo URL |

## Narration

| In | Out | On screen | Line |
|---|---|---|---|
| 0:00.3 | 0:04.4 | Title card | Pressure washing ends with two photos. Sending them is the hard part. |
| 0:04.5 | 0:08.9 | Demo workspace, 11 jobs | This is Rinse. It runs on the phone in the truck, and it works with no signal. |
| 0:09.9 | 0:13.6 | Job list | Eleven jobs. Nine already have before and after pairs. |
| 0:13.8 | 0:15.7 | One job opens | Open one. |
| 0:15.8 | 0:22.2 | Slider dragged both ways | Drag it. These are the crew's own photos, nothing here is generated. The AI only helps with the boring parts. |
| 0:22.4 | 0:26.9 | "Sharing with your client", progress | Publish once, and the client gets one link. No app, no account for them. |
| 0:28.6 | 0:36.9 | Client gallery, slider | On their phone it's a slider, not a folder of forty photos. He sees the difference before he pays. And the link stays the same when you update the job. |
| 0:41.6 | 0:46.0 | "Ready to send" filter | Back on the list, ready jobs sort to the top, so you know what to send next. |
| 0:49.3 | 0:55.0 | Offline: orange dot, SYNC OFFLINE | No signal? The jobs still open, because every photo lives on the device, not in the cloud. |
| 0:55.8 | 1:10.9 | Docs scene | *(the builder's own recording)* I built this with the Build With AI skill pack: scope, then the product doc, then the technical spec, then the build log. And the AI parts are optional: vanilla JavaScript, no build step. |
| 1:11.9 | 1:17.5 | End card | Rinse. Built for the Build With AI basics hackathon. The demo is open, link below. |

## Narration sources

- **0:00–0:55 and 1:11–1:18** — synthesized with `edge-tts`, voice `en-US-AndrewNeural`, rate +6 %,
  one file per line, placed at the timestamps above, +4.2 dB to sit level with the recorded clip,
  whole mix normalised to −16 LUFS / −1.5 dBTP. Not the builder's voice.
- **0:55.8–1:10.9** — the builder's own phone recording (`Voice 006.m4a`), cleaned with a 90 Hz
  high-pass, FFT denoise, light compression, 120 ms fade in and 400 ms fade out. This is the only
  human-voiced line in the cut.
- No music bed: nothing licensed was available, and a silent bed is better than a stolen track.

## Honesty rules the cut obeys

- No frame of UI is drawn or invented; the phone panel is the deployed app.
- No key, `.env`, terminal with secrets, or Vercel dashboard appears.
- Nothing claimed that the app does not do: no automatic captions for the client, no follow-up texts,
  no rebook reminders, no calendar feed.
- The sample photos are a real pressure-washing business's public portfolio, not the builder's jobs;
  the demo banner on screen says so.

## Rebuild

Sources in `%TEMP%\opencode\videoflow`: `compose2.js` (1920×1080 cut), `build-scene.js` (docs scene),
`mix-audio.js` (narration, loudness, mux), `gen-voice.js` + `tts_run.py` (edge-tts lines).
Earlier silent draft: `devpost/media/rinse-demo-60s.mp4`.

# Rinse — demo video (cut v3: 1:50, narrated)

`devpost/media/rinse-demo.mp4` — 1920×1080, 30 fps, 1:50.4, AAC stereo, −16 LUFS.
Every frame in the app panel is real footage of the deployed demo captured at 390×844; no UI was
drawn, mocked or generated. The publish in the video is a real upload to the deployed function.

## Timeline

| In | Out | On screen |
|---|---|---|
| 0:00.0 | 0:04.0 | Title card |
| 0:04.0 | 0:55.4 | Live app: demo workspace → job list → job → before/after slider → real publish → client gallery → "Ready to send" → offline reload |
| 0:55.4 | 1:11.7 | "Four docs. Then the app." — scope.md, prd.md, spec.md, BUILD_LOG.md, then the three chips |
| 1:11.7 | 1:50.4 | End card: demo URL, "No account. No API key. Works offline.", repo URL — under the sign-off |

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
| 0:55.8 | 1:07.2 | Docs scene | *(synthesized)* I built this with the Build With AI skill pack: scope, then the product doc, then the technical spec, then the build log. And the AI parts are optional: vanilla JavaScript, no build step. |
| 1:12.1 | 1:50.1 | End card | *(the builder's own recording, Voice 007)* So yeah, this is me speaking. This is a simple project to be honest. It wasn't that hard in terms of technical issues… I wanted to build a more complicated app, but it's going to take a lot more… so I just used this for now. I hope you like it. It was a good experience. This is my first hackathon, and have a good day. |

## Narration sources

- **0:00–1:07** — synthesized with `edge-tts`, voice `en-US-AndrewNeural`, rate +6 %, one file per
  line, +4.2 dB to sit level, mix normalised to −16 LUFS.
- **1:12.1–1:50.1** — the builder's phone recording (Voice 007), the only human voice in the cut:
  3.1 s of dead air cut between phrases (silence under −30 dB held at 0.28 s, 0.50 s after a
  sentence pause), then 85 Hz high-pass, adaptive FFT denoise (`afftdn`), de-esser, gentle
  compression, −16 LUFS. The take is dense — 38 s of speech in 41 s of recording, so the tightened
  file is 37.95 s.
- An earlier phone recording (Voice 006, the "how I built it" line) was used at 0:55.8 and has been
  removed at the builder's request.
## Music

**"Inspired" — Kevin MacLeod (incompetech.com)**, licensed under Creative Commons Attribution 4.0
(https://creativecommons.org/licenses/by/4.0/). First 1:50 of the track, faded 1.8 s in and 4 s out,
normalised to −26 LUFS and side-chain ducked under the voice, so the bed sits ~10 LU below the
narration and comes back up in the gaps.

**Attribution must appear where the video is published** — paste this into the YouTube description:

> Music: "Inspired" by Kevin MacLeod (incompetech.com), licensed under Creative Commons
> Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/
## Honesty rules the cut obeys

- No frame of UI is drawn or invented; the phone panel is the deployed app.
- No key, `.env`, terminal with secrets, or Vercel dashboard appears.
- Nothing claimed that the app does not do: no automatic captions for the client, no follow-up texts,
  no rebook reminders, no calendar feed.
- The demo photos are a real pressure-washing business's public portfolio, not the builder's jobs;
  the demo banner on screen says so.

## Rebuild

Sources in `%TEMP%\opencode\videoflow`: `compose2.js` (1920×1080 cut), `build-scene.js` (docs scene),
`process-voice7.js` (cut, denoise, level the sign-off), `mix-audio.js` (narration, loudness, mux),
`gen-voice.js` + `tts_run.py` (edge-tts lines).

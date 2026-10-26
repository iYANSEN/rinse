---
version: alpha
name: Rinse-atlas-glacier
description: Photo-first before/after app for exterior-cleaning crews. A light, sunlight-readable crew app with a night-sky hero, Moroccan zellige tile geometry, an aurora accent and a game-style "system window". Structure from VoltAgent/awesome-design-md; photo-first base from its "airbnb" system; review rules from marvkr/better-design.
---

## 1. Visual Theme and Atmosphere
Two worlds meet. The **tile wall**: zellige 8-point-star geometry from the maker's home town (Settat, Morocco), a pattern about clean, repeating surfaces. The **night sky**: the northern lights of the Iceland he is building toward. A web-novel "system window" ties them together: the app talks like a game console, because the person who made it grew up on those stories. The crew UI stays **light** (outdoor sun); the dark aurora lives only in the hero and the toasts.

## 2. Color Palette and Roles
- `--primary #0a7a79` the one action colour (white text 5.2:1). Hover `#086564`.
- `--night #08121c`, `--night-2 #0d1f2d` hero and system surfaces. `--ice #bfe9ee` text on night (11:1), `--ice-dim #8fd9cf` labels (9:1).
- Aurora (decoration only, never carries meaning): `#19d3a2`, `#2bb7d9`, `#7a6bff`.
- Photo semantics unchanged: `--before #c2410c`, `--after #0a7d46` (5.2:1 with white).
- Neutrals: ink `#222`, body `#3f3f3f`, muted `#6a6a6a`, hairline `#ddd`.

## 3. Typography
Figtree (self-hosted, offline). Hero 36/800 tight. Status window and toasts use the system monospace stack at .64 to .9rem with wide tracking, so "SYSTEM" messages read as a different voice. Never uppercase via CSS on text people copy or tests read (use real capitals).

## 4. Component Stylings
- **Hero**: night gradient + tile pattern (white at 11%) + slow conic aurora; rank window below.
- **Status window** (`.status-win`): JOBS, RANK (E to S by job count), SYNC (waiting or safe). Teal hairline, soft glow.
- **Toast**: night card, aurora border, `[ SYSTEM ]` label.
- **Slider**: ringed knob with a slow ping, glow on the divider, first view sweeps once.
- **Primary button**: solid teal + a faint gradient sheen; a splash of water drops on tap.
- **Empty states**: tile wall with a squeegee highlight sweeping across.
- **Section headings**: an 8-point star bullet.
- **Client gallery**: brand-coloured zellige band under the header, a star watermark, mono counter, "Crafted in Settat, Morocco" in the footer.

## 5. Layout Principles
Unchanged from the photo-first base: 1080px max, 16px gutters, 24px section rhythm, bottom dock in thumb reach, no horizontal scroll at 390px.

## 6. Depth and Elevation
One neutral shadow tier for cards. Teal-tinted shadow only under sliders (they are the product). Glow is reserved for the system window and toasts.

## 7. Do and Do Not
- Do keep one primary action per row; keep tests' text real (no CSS text-transform on measured text).
- Do respect `prefers-reduced-motion` (aurora, ping, squeegee, sweep and water drops all stop) and skip the sweep in automated browsers.
- Do not make aurora colours carry information; do not put the dark theme on the crew's working screens.
- Do not add a second accent. Do not ship the system window as a gimmick that blocks the capture flow.

## 8. Responsive Behavior
Status window collapses to 2 columns under 420px. Hero h1 scales with `clamp`. Gallery works at 360px. Tested: no horizontal scroll at 390px (app) and 430px (gallery).

## 9. Agent Prompt Guide
"Restyle Rinse using this DESIGN.md. Keep every class name, id and text string the tests rely on. Add decoration only through CSS pseudo-elements or `flair.js`. Contrast must stay at AA or better. Never use CSS text-transform on text that tests read."

## Provenance and review rules
- **VoltAgent/awesome-design-md**: the nine-section DESIGN.md format, and its "airbnb" system as the photo-first base that this file builds on.
- **marvkr/better-design**: used as a review checklist (tokens not magic numbers, WCAG contrast, every state covered, reduced motion) and for the dark "cinematic" idea in the hero. Its shadcn/ui components were not installed, because Rinse is dependency-free vanilla JS.

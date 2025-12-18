Group Website — quick map

Run locally
- Open `group_website/index.html` directly, or run a local server:
```powershell
cd "d:\documents\Spec 1\ASM2\group_website"
python -m http.server 8000; Start-Process "http://localhost:8000"
```

Pages at a glance
- index.html — landing map (p5.js dots/lines, info popup)
- tin.html — Turbulence sketch
- trang.html — Planetary Soroban sketch
- bach.html — Planetary sketch
- khoa.html — Solar Rays sketch

Shared assets
- script.js — landing sketch (starfield, hover squares, animated lines, fade navigation, ambience-on-enter)
- style.css — grid layout, fixed header, overlays, canvas scaling, typography
- icon.png — logo used in header/links

Turbulence (tin.html / tinsketch.js)
- Canvas: 1920x1080, starfield pre-rendered to buffer (2000 stars), circular boundary at center
- Motion: orbiters with Perlin noise-driven center, circular-buffer trails for performance
- Audio: ambient storm loop, tone on circle click, slide on enter/exit, blip on outside click, random breathe every 5–10s
- Controls: toggle sound via `toggleSound()`; audio gated until first click
- Performance: pre-rendered stars, cached radius, constant noise step, trail circular buffer

Customize
- Landing: edit `dots` and `pageMap` in script.js; colors via CSS vars `--bg`, `--cl`, `--ac`
- Turbulence: tweak volumes at top of tinsketch.js (VOLUME_* constants), star count `NUM_STARS`, noise step `NOISE_STEP`, circle size `cr`

Troubleshooting
- Empty space/scroll: html/body have `overflow: hidden`; canvas is fixed in #p5-container
- Audio not playing: ensure first user interaction occurred; check file names/paths match assets
- Navigation flicker: keep nav/back links pointing to index.html and only call popup functions where markup exists
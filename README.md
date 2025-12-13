Group Website — p5.js Dot Map

What’s here
- `index.html` — main page with p5.js canvas, animated dots/lines, and info popup.
- `script.js` — p5 sketch (starfield, 4 labeled dots, hover squares, animated connecting lines, cursor coords, fade-out navigation).
- `style.css` — layout, Typekit fonts, popup/back-button styles, dark/yellow theme.
- `tin.html` (+ placeholders for `trang.html`, `bach.html`, `khoa.html`) — detail pages; each links back to `index.html` and uses shared styles.

Run locally
- Open `group_website/index.html` directly, or start a local server:
```powershell
cd "d:\documents\Spec 1\ASM2\group_website"
python -m http.server 8000; Start-Process "http://localhost:8000"
```

How it works
- Dots animate with hover-growing square borders; lines draw once then stay; cursor shows `x/y` next to pointer.
- Clicking a dot fades to black, then routes to its page (see `pageMap` in `script.js`).
- “Information” nav opens a sliding popup; backdrop overlay closes on click.
- Back buttons and logos link to `index.html` to avoid history quirks.

Customize
- Change dot labels/positions in `script.js` (`dots = [...]` and `pageMap`).
- Adjust colors via CSS vars (`--bg`, `--cl`, `--ac`) in `style.css`.
- Swap fonts by updating the Typekit import in `index.html` and font-family rules in `style.css`.

Troubleshooting
- If a detail page flickers/reloads, ensure its nav links and back button point to `index.html` and that it doesn’t call popup functions unless the markup exists.
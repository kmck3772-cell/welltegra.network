# The Clan Hearth — Visual Bundle

This zip contains:
- `index.html` — site shell with Hero, Clan Finder (cards + modal), Map, About.
- `js/app.js` — loads `clans.json` and `map-data.json`, renders search cards, modal, and Leaflet map.
- `css/style.css` — small extras (Tailwind via CDN in `index.html`).
- `clans.json`, `map-data.json` — datasets (uses your expanded ones if present).
- `assets/images/...` — folder structure with a fallback crest and .gitkeep placeholders.

Image naming convention:
- Emblems: `assets/images/emblems/<slug>-emblem.jpg`
- Tartans: `assets/images/tartans/jpg/<slug>-tartan.jpg`
`<slug>` is the clan name lowercased with non-letters removed. Common variants are normalized in `app.js` (e.g., `stuart` → `stewart`).

Open `index.html` directly or serve with any static server.

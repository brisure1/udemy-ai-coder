FP Shooter — Day 1

A minimal browser-based first-person shooter using Three.js.

Controls

- Click to lock pointer and play
- Move: Arrow keys (↑ ↓ ← →)
- Look: mouse
- Shoot: Space

How to run

**IMPORTANT:** This uses ES6 modules, which require an HTTP server. Opening `index.html` directly via `file://` will fail with a CORS error.

### Option 1: Use Python (Recommended)

From the `Day-1-FP-Shooter` folder:

```bash
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

### Option 2: Use Node.js + http-server

```bash
npx http-server -p 8000
# Then open http://localhost:8000
```

### Option 3: Use any HTTP server

- VS Code Live Server extension
- PHP built-in server
- Node Express, etc.

Notes

- Enemy is a simple AI that moves toward the player and shoots periodically.
- This is intentionally minimal; feel free to request features (score, multiple enemies, bullets pool, sounds).

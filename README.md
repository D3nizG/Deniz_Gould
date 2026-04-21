# Deniz Gould Portfolio

Next.js portfolio site for `d3nizg.dev`, including an interactive Ms. Pac-Man experience with browser-side AI inference.

## Stack

- Next.js 14 App Router
- React 18
- Tailwind CSS
- Framer Motion
- D3
- ONNX Runtime Web

## Local Development

Use npm for local work and Vercel deploys.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Production Deploy

The intended production host is Vercel with `d3nizg.dev` as the canonical domain.

### Vercel

1. Import the GitHub repo into Vercel.
2. Keep the framework preset as `Next.js`.
3. Vercel is pinned to npm through [`vercel.json`](./vercel.json).
4. Add the custom domains:
   - `d3nizg.dev`
   - `www.d3nizg.dev`
5. In Vercel, make `d3nizg.dev` the primary domain and redirect `www` to it.

### Porkbun DNS

After connecting the domain in Vercel, copy the DNS records Vercel gives you into Porkbun for:

- the apex/root domain `d3nizg.dev`
- the `www` subdomain

DNS values can change by provider setup, so use the exact values shown in the Vercel dashboard instead of hardcoding them here.

## Content And Launch Checklist

- Confirm the public contact details in [`public/resume.json`](./public/resume.json)
- Replace or keep the current profile photo in [`public/images/profile.jpg`](./public/images/profile.jpg)
- Verify project copy, metrics, and social links
- Decide whether to keep your phone number public
- Decide whether analytics should be added before launch
- Add the future Sennet game URL later as a separate external destination, ideally on its own subdomain

## Ms. Pac-Man AI

The current repo includes a committed ONNX model in [`public/models`](./public/models), so the interactive AI/game experience is deployable as-is.

### Game UI behavior

- The playable board now scales from the actual Ms. Pac-Man map aspect ratio instead of a forced square slot.
- Canvas sizing is driven by a resize-observed DOM surface, so the board stays centered as the container changes size.
- The top HUD now uses a retro arcade-style layout: a blinking `1UP` with the session score on the left, and `High Score` centered above the board.
- The bottom HUD keeps lives in the lower-left lane aligned to the maze edge, while the lower-right lane is reserved for round fruit history once that gameplay state exists.
- The AI/manual toggle and restart controls live in the bezel chrome below the game surface and wrap cleanly on smaller screens.

### Game engine

- **Wall rendering**: walls are rendered as one cohesive solid shape — each tile is filled in a single blue, outer convex corners are rounded using background-colour quarter-circle arcs, and the perimeter outline is drawn with two-pass strokes (wide faint halo + narrow opaque line) that follow the rounded contour rather than the raw tile grid.
- **Ghost house door**: rendered as a distinct pink horizontal bar at the ghost pen entrance.
- **Pac-Man movement**: Ms. Pac-Man is always corridor-centered. The perpendicular axis is snapped every movement frame, and wall collision uses a forward-tile look-ahead so she glides cleanly to the tile center when hitting a dead end rather than parking off-center. Input is buffered so a direction queued before an intersection fires as soon as it becomes valid.
- **Tunnel warp**: horizontal tunnel warp works in both directions (left → right and right → left) via modulo wrapping in the forward-tile check.

### Manual play

1. Switch the bezel to `Manual`.
2. Click the game surface, or tab to it, to focus keyboard controls.
3. Use `Arrow Keys` or `WASD` to move.

Manual input is intentionally scoped to the focused game surface instead of the whole window so the page remains usable around the game.

### Run the diagnostics locally

```bash
npm run dev
```

Then visit:

- `http://localhost:3000/`
- `http://localhost:3000/ai/diagnostics`

### Rebuild the model artifact

If you want to refresh the browser model from a new training checkpoint:

```bash
python -m pip install -r mspacman-ai/web-integration/requirements.txt
npm run ai:setup
```

To convert a different checkpoint:

```bash
npm run ai:convert -- --ckpt path/to/your_model.zip
```

### Production diagnostics toggle

Diagnostics stay hidden in production unless you explicitly enable them:

```bash
NEXT_PUBLIC_ENABLE_AI_DIAGNOSTICS=true
```

Use [`.env.example`](./.env.example) as the starter template for local env configuration.

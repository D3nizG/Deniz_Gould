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

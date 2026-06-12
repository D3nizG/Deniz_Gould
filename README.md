# Deniz Gould Portfolio

Next.js portfolio site for `d3nizg.dev`.

## Stack

- Next.js 14 App Router
- React 18
- Tailwind CSS
- Framer Motion
- D3

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
- Add future game or AI demos only when they are ready for production.

## Experimental Work

Unreleased Ms. Pac-Man AI work is preserved on the `feature/mspacman-ai-canvas` branch and is intentionally not exposed from production `main`.

Use [`.env.example`](./.env.example) as the starter template for local environment configuration.

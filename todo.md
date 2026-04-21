# Host d3nizg.dev on Vercel and Prepare for Future Sennet Link

  ## Summary

  Launch the portfolio as a Vercel-hosted Next.js site with d3nizg.dev as the canonical URL and www.d3nizg.dev redirecting to it.
  Treat the Sennet game server as a separate future property for now; the portfolio should only expose it as an external link or p
  roject card when you are ready.

  Outside coding, the main work from you is account/domain setup, content finalization, and a few launch decisions. In code, the
  main work is production hardening: remove deployment ambiguity, add real site metadata and assets, clean up content/config
  inconsistencies, and verify the build path is stable on Vercel.

  ## What You Need To Provide

  - Vercel access:
    Connect your GitHub repo to Vercel and choose the project owner/team.
  - Porkbun DNS access:
    You will need to add or confirm the Vercel-provided DNS records for d3nizg.dev and www.
  - Canonical launch content:
    Final email, social links, resume/project copy, and whether your phone number should stay public.
  - Brand assets:
    Favicon/app icon, OG/social share image, and optional logo/wordmark if you want anything beyond text branding.
  - Analytics choice:
    Decide whether to add Vercel Analytics only, Plausible, Google Analytics, or no analytics at first launch.
  - Sennet destination later:
    When the game server exists, provide the final URL to link to, ideally on a subdomain like play.d3nizg.dev or
    sennet.d3nizg.dev.

  ## Implementation Changes

  - Deployment/config cleanup:
    Keep one Next config file only, remove ambiguity between next.config.ts and next.config.mjs, and document the expected package
    manager since both package-lock.json and pnpm-lock.yaml exist.
  - Metadata and SEO:
    Replace the minimal metadata in app/layout.tsx with full production metadata using https://d3nizg.dev as metadataBase, plus Op
    en Graph, Twitter/X card data, canonical URL handling, and useful page titles/descriptions.
  - Web assets:
    Add favicon/app icon, OG image, robots.txt, and sitemap support. Add a web manifest only if you want installable/PWA behavior;
    otherwise skip it for MVP.
  - Content cleanup:
    Replace placeholder values in public/resume.json such as website, review project metrics/copy for polish, and decide whether
    sensitive fields like phone should remain public.
  - Navigation/project additions:
    Keep the portfolio launch focused, but prepare one obvious place for a future external Sennet link in the projects section or
    nav once the destination exists.
  - Build reliability:
    Decide whether to keep Google-hosted next/font usage in app/layout.tsx or switch to local fonts for a more self-contained
    build. For this launch, local fonts are the safer default if you want reproducible builds outside Vercel too.
  - Repo hygiene:
    Clean committed/generated noise, align README with the actual portfolio/deploy process, and reconcile the README claim that
    public/models/* is machine-local with the fact that public/models/latest.onnx is currently present.
  - Optional production guards:
    Keep /ai/diagnostics disabled in production by default, and confirm the Ms. Pac-Man AI assets are intentional to ship publicly
    on the portfolio domain.
  - Game UI follow-ups:
    The playable shell now uses a centered `1UP` / `High Score` HUD above the maze and a lives rail below it. Remaining follow-up
    work is to replace the temporary heart lives with little Pac-Man icons, wire in real collected-fruit history for the lower-right
    lane once that gameplay state exists, and finish visual verification with browser automation when `agent-browser` is available.

  ## Non-Coding Launch Steps

  1. Push the repo to the GitHub branch/repo you want Vercel to deploy from.
  2. Import the repo into Vercel.
  3. Set the production domain to d3nizg.dev.
  4. In Porkbun, point the apex/root and www records to Vercel using the exact records Vercel gives you.
  5. In Vercel, mark d3nizg.dev as primary and set www.d3nizg.dev to redirect to it.
  6. If analytics is desired, enable it in Vercel or add the chosen provider credentials/config.
  7. When the Sennet server is ready, create a separate subdomain for it and add only a link from the portfolio first.

  ## Test Plan

  - Run production build successfully with the final config and assets.
  - Verify the homepage, section pages, and project modal render correctly in production.
  - Verify metadata, canonical tags, Open Graph image, favicon, sitemap, and robots behavior.
  - Verify d3nizg.dev loads over HTTPS and www.d3nizg.dev redirects to the root domain.
  - Verify the AI/game assets do not break the production bundle and that /ai/diagnostics stays inaccessible unless explicitly
    enabled.
  - Verify all external links from resume/social/project content resolve correctly.

  ## Assumptions And Defaults

  - Canonical domain is https://d3nizg.dev.
  - www.d3nizg.dev should redirect to the root domain.
  - The Sennet game is not part of the first deploy and should be treated as a separate future URL.
  - First launch target is a clean MVP, not a full marketing-grade polished launch.
  - Vercel is the hosting platform and Porkbun remains the DNS registrar.

# Ms. Pac-Man AI — Web Integration

Full roadmap and diagnostic findings: [`docs/mspacmanAI-web.md`](docs/mspacmanAI-web.md).

## Done

- **Action interpreter aligned to 9-action ALE-minimal set.** `src/ai/constants.ts`
  now uses the compact enum; diagonals decode to priority-ordered intent lists
  via `ACTION_TO_INTENTS`; `MODEL_CONFIG.OUTPUT_ACTIONS = 9`.
- **Environment integrity.** Tile semantics via `TILE` constants; pellets only
  seed on `.`/`*`; Pac-Man gets strict `isWalkable`, ghosts keep permissive
  `isGhostWalkable`; pending-intent buffering with `pendingIntents: Direction[]`
  replaces the single-slot `nextDirection`.
- **Diagnostic trace pipeline.** Ring buffer in `src/ai/trace.ts` captures
  `decision`/`apply`/`event` entries; ORT session returns full Q-value vectors;
  worker forwards metadata; window globals (`__msPacmanEnableTrace`,
  `__msPacmanDumpTrace`, `__msPacmanDebugStatus`, etc.) expose capture + dump
  from the browser console. Auto-enable via `?debug=mspacman`.

## Root cause (not yet fixed)

Trace analysis (`mspacman-ai/traces/mspacman-trace-1776753727910.json`) shows
the model emits 100% `DOWNRIGHT` with flat Q-values (argmax margin ~0.02 over
0.76–1.81) while Pac-Man is wedged at tile (26, 29) with only `UP`/`LEFT` legal.
The checkpoint was trained on Atari ROM via OpenAI Gym / ALE; the browser
canvas is a stylized reimplementation. Pixel input is out-of-distribution.

## Next (priority order)

1. **Fixture-replay hook.** Feed an ALE-captured 4×84×84 observation stack
   directly through the worker (bypassing `preprocessFrame`) to confirm the
   checkpoint is healthy before spending time on parity work.
2. **Observation parity.** Prefer synthesizing an ALE-like 160×210 frame from
   game state (tile grid + sprite positions) over rendering a parallel canvas.
   Match preprocessing too: max-of-last-two-frames, BT.601 luminance,
   bilinear/area downsample, confirm normalization range.
3. **Controller robustness fallback (optional).** If N consecutive applies are
   `buffered`, pick a random legal cardinal from `legalCardinalsNow()` to
   unwedge — safety net for OOD decisions.

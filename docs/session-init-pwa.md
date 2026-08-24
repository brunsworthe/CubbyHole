# CubbyHole — Next Session Init Prompt (PWA Installability)

Saved copy of the initialization prompt generated on 2026-08-24. Paste the contents
of the fenced block below into a fresh Claude/Cursor session to resume work.

---

```
PROJECT: CubbyHole — a Next.js 16 / React 19 / TypeScript app for capturing and
archiving children's creations (3D object scans, textured relief captures, 2D
artwork, and scanned documents) into shareable "capsules" of memories. Backend
is Supabase (Postgres + Auth + Storage). Styling is Tailwind CSS 4. 3D rendering
uses @react-three/fiber + @react-three/drei + three.

CURRENT STATE — capture and viewer pipelines are LOCKED IN and considered stable
as of this session. Do not touch them (see guardrails below); they were the
focus of extensive prior work:
- CaptureScreen.tsx: full capture UI for all 4 modes (scan3d, relief180,
  artwork2d, document) — hardware pinch-to-zoom, tap-to-focus reticle, a 2D
  BoxTrackpad replacing the old dual sliders for guide-box sizing, a 3-second
  countdown timer, shutter flash + haptics, and a per-multi-shot progress ring.
  It no longer uploads to the `raw_captures` Supabase bucket for previews —
  NamingScreen/ScanResultViewer now use local `URL.createObjectURL()` blobs
  instead, eliminating a redundant network upload on every capture.
- CaptureFlow.tsx: the capture → naming → upload → processing → result step
  machine. Revokes the local preview object URL on unmount (and already did on
  "discard & re-scan"). The REAL upload still goes through uploadManager.ts →
  POST /api/upload → the `capsule-assets` Supabase Storage bucket, unchanged.
- SpinSequenceViewer.tsx (scan3d) and LenticularViewer.tsx (relief180): both
  now have physics-based momentum/inertia on release, per-frame load-failure
  tracking with a clean error placeholder + banner (not silent), a fixed
  GPU-flicker bug (no more `decoding="async"`, added `willChange`/
  `translateZ(0)`/`transition: none` on the stacked frames), and a corrected
  drag direction (a `DIRECTION_SIGN` constant) that now matches ThreeViewer's
  orbit-control gesture direction.
- ThreeViewer.tsx (the experimental WebGL alt-viewer, toggled on manually):
  now relief-aware — excludes the albedo/base frame and clamps the camera to a
  fixed ±45° azimuth arc (no full 360° orbit) when viewing a relief180 capture,
  via a new `isRelief` prop threaded from CaptureViewerModal.tsx.

There is a full architecture audit at docs/ARCHITECTURE_REPORT.md (plus a
generated PDF) from earlier this session — read it if you need deeper context
on the upload pipeline, database schema, or component inventory. The most
important finding in it: this repo has TWO parallel, incompatible data models
("Model A" — a fully-built but UNUSED household/visibility-tier schema in
supabase/migrations/ + src/types/database.ts — and "Model B" — the simpler
profiles/capsules(profile_id)/captures schema every live page actually uses,
which has no committed CREATE TABLE migration anywhere in the repo). Don't be
surprised by this; it's documented, not a bug to fix today.

THE OBJECTIVE FOR THIS SESSION: make CubbyHole an installable Progressive Web
App. Concretely:
1. A Web App Manifest (manifest.json or Next's app/manifest.ts) — name, short
   name, icons, start_url, display: "standalone" (to hide the mobile browser
   chrome/URL bar on iOS and Android home-screen launches), theme_color,
   background_color.
2. Icon assets — there is currently NO public/ directory in this repo at all,
   so app icons, favicons, and Apple touch icons need to be created/sourced
   from scratch, not just wired up. Include standard PWA icon sizes and an
   apple-touch-icon for iOS home-screen add.
3. Viewport/metadata exports — src/app/layout.tsx currently only exports a
   minimal `metadata` object (title + description, nothing PWA-related, no
   `viewport` export, no manifest link, no theme-color, no apple-mobile-web-
   app-* meta tags). Bring this up to what Next.js 16's App Router expects for
   full installability, including the iOS-specific meta tags that older
   Safari versions still require outside the manifest spec.
4. A service worker — for offline/installable behavior. Decide (and tell me
   the tradeoff) whether to hand-roll a minimal one or use a library
   (e.g. next-pwa or Serwist) given this is a Next 16 App Router project.
   IMPORTANT: middleware.ts (src/lib/supabase/middleware.ts) currently
   protects `/` and everything under `/dashboard*`, redirecting unauthenticated
   users to /login — make sure any service-worker caching strategy doesn't
   cache authenticated/personalized pages in a way that leaks data between
   users on a shared device, or serves a stale authenticated shell after
   sign-out.

STRICT GUARDRAILS FOR THIS SESSION:
- DO NOT alter the Model A / Model B database schemas (no changes to
  supabase/migrations/*.sql, the root *_schema.sql files, or src/types/
  database.ts). This session is PWA scaffolding only, not a data-layer session.
- DO NOT refactor the Supabase client constructors. Leave src/lib/supabase.ts,
  src/lib/supabase/client.ts (both its typed createClient() and its untyped
  `supabase` singleton), and src/lib/supabase/server.ts exactly as they are,
  even though they're inconsistent (documented, known, out of scope today).
- DO NOT modify CaptureFlow.tsx, CaptureScreen.tsx, SpinSequenceViewer.tsx,
  LenticularViewer.tsx, or ThreeViewer.tsx. They are fully optimized and
  freshly stabilized — treat them as read-only reference material if you need
  to understand existing patterns (e.g. how touch/pointer handling is done
  elsewhere in the app), but make no edits to these five files.
- Stay scoped to manifest, icons, viewport/metadata, and service-worker
  registration. If achieving "hide the mobile browser UI" requires touching
  something outside that scope (e.g. a specific page needing its own meta
  tags), flag it and ask before proceeding rather than assuming.

Start by reading src/app/layout.tsx and confirming there's still no public/
directory, then propose a plan before writing files.
```

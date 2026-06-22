-- ============================================================
-- CubbyHole — Public Sharing URL Architecture (Path B)
-- Review and run manually in the Supabase SQL editor.
-- NOT executed automatically — no CLI/migration runner touched this.
-- ============================================================
--
-- STORAGE RECONNAISSANCE (read this before running):
-- The app currently fetches asset URLs via
--   supabase.storage.from('capsule-assets').getPublicUrl(path)
-- in src/app/api/upload/route.ts and src/components/capture/CaptureScreen.tsx
-- (which uses the 'raw_captures' bucket for the initial upload).
--
-- getPublicUrl() ONLY constructs a URL string — it does NOT check or grant
-- permissions. It returns a working, fetchable URL ONLY IF the bucket is
-- already marked "Public" in Supabase Storage settings (Storage > Buckets >
-- capsule-assets > Public bucket toggle), or if the bucket has its own
-- storage.objects RLS policy allowing SELECT to the anon role.
--
-- If 'capsule-assets' is currently a PRIVATE bucket, the public sharing
-- viewer built in this phase will load the capture row fine (once is_public
-- = true), but the <img>/<model-viewer> src URLs will 403 for anonymous
-- visitors, because table-level RLS (below) and storage-level RLS are
-- independent systems.
--
-- ACTION REQUIRED: confirm in the Supabase dashboard whether
-- 'capsule-assets' is already public. If it is NOT, you will additionally
-- need a storage.objects policy such as:
--
--   create policy "Public read for shared captures"
--   on storage.objects for select
--   to anon
--   using (bucket_id = 'capsule-assets');
--
-- That policy is commented out below — uncomment and run it only if you
-- confirm the bucket is private and you want anon reads enabled for it.
-- ============================================================


-- ============================================================
-- 1. CAPTURES TABLE — add public-sharing columns
-- ============================================================

alter table captures
  add column is_public boolean not null default false,
  add column share_id  uuid not null default gen_random_uuid() unique;


-- ============================================================
-- 2. ROW LEVEL SECURITY — anon read access for shared captures
-- Allows unauthenticated (anon) clients to SELECT a capture row
-- strictly when it has been explicitly marked public.
-- ============================================================

create policy "Public read access for shared captures"
on captures
for select
to anon
using (is_public = true);


-- ============================================================
-- 3. (OPTIONAL / CONDITIONAL) STORAGE BUCKET POLICY
-- Only needed if 'capsule-assets' is a PRIVATE bucket.
-- Uncomment and run after confirming bucket visibility in the dashboard.
-- ============================================================

-- create policy "Public read for shared captures"
-- on storage.objects for select
-- to anon
-- using (bucket_id = 'capsule-assets');

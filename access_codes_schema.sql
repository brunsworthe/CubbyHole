-- ============================================================
-- CubbyHole — Access Code Architecture (Beta Unlock / Storage Grants)
-- Review and run manually in the Supabase SQL editor.
-- NOT executed automatically — no CLI/migration runner touched this.
-- ============================================================

-- ============================================================
-- 1. ACCESS CODES TABLE
-- ============================================================

create table access_codes (
  id                      uuid primary key default gen_random_uuid(),
  code                    text not null unique,
  storage_granted_bytes   bigint not null,
  max_uses                integer not null default 1,
  times_used              integer not null default 0,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- 2. PROFILES TABLE — add beta/storage columns
-- ============================================================

alter table profiles
  add column is_beta_unlocked   boolean not null default false,
  add column storage_limit_bytes bigint  not null default 0;

-- ============================================================
-- 3. ROW LEVEL SECURITY — access_codes
-- Locked down intentionally: no select/insert/update/delete policies
-- are created, so only service-role (server-side admin) calls can
-- read or redeem codes. Authenticated/anon clients get nothing.
-- ============================================================

alter table access_codes enable row level security;

-- ============================================================
-- CubbyHole — Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type visibility_tier as enum ('private', 'linked', 'custom');
create type link_status as enum ('pending', 'active', 'revoked');

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Households — the primary account group (family unit)
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Children — linked to a household
create table children (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  birth_year    int,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. Capsules — metadata for 3D objects
create table capsules (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references households(id) on delete cascade,
  child_id         uuid references children(id) on delete set null,
  title            text not null,
  description      text,
  object_url       text not null,
  thumbnail_url    text,
  visibility_tier  visibility_tier not null default 'private',
  captured_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 4. Household Links — approved multi-generational / friend connections
create table household_links (
  id                      uuid primary key default gen_random_uuid(),
  requester_household_id  uuid not null references households(id) on delete cascade,
  recipient_household_id  uuid not null references households(id) on delete cascade,
  status                  link_status not null default 'pending',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint no_self_link check (requester_household_id <> recipient_household_id),
  -- Prevent duplicate pairs regardless of direction
  constraint unique_link unique (
    least(requester_household_id::text, recipient_household_id::text),
    greatest(requester_household_id::text, recipient_household_id::text)
  )
);

-- 5. Object Permissions — explicit item-by-item grants for 'custom' tier
create table object_permissions (
  id                    uuid primary key default gen_random_uuid(),
  capsule_id            uuid not null references capsules(id) on delete cascade,
  grantee_household_id  uuid not null references households(id) on delete cascade,
  granted_by_user_id    uuid not null references auth.users(id) on delete cascade,
  created_at            timestamptz not null default now(),

  constraint unique_object_permission unique (capsule_id, grantee_household_id)
);

-- 6. One-Off Shares — temporary tokens for non-account guest sharing
create table one_off_shares (
  id                  uuid primary key default gen_random_uuid(),
  capsule_id          uuid not null references capsules(id) on delete cascade,
  token               text not null unique default encode(gen_random_bytes(32), 'base64url'),
  created_by_user_id  uuid not null references auth.users(id) on delete cascade,
  expires_at          timestamptz not null,
  max_views           int,           -- null = unlimited
  view_count          int not null default 0,
  created_at          timestamptz not null default now(),

  constraint positive_max_views check (max_views is null or max_views > 0),
  constraint view_count_non_negative check (view_count >= 0)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on children (household_id);
create index on capsules (household_id);
create index on capsules (child_id);
create index on capsules (visibility_tier);
create index on household_links (requester_household_id);
create index on household_links (recipient_household_id);
create index on household_links (status);
create index on object_permissions (capsule_id);
create index on object_permissions (grantee_household_id);
create index on one_off_shares (token);
create index on one_off_shares (capsule_id);
create index on one_off_shares (expires_at);

-- ============================================================
-- HELPER: resolve the household_id for the authenticated user
-- (checks household membership via a households_members join table
--  or falls back to owner_user_id for single-owner households)
-- ============================================================

-- Maps auth.uid() → their household_id(s)
-- We use a simple ownership model here; extend with a members table as needed.
create or replace function get_my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from households
  where owner_user_id = auth.uid();
$$;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_updated_at
  before update on households
  for each row execute function set_updated_at();

create trigger children_updated_at
  before update on children
  for each row execute function set_updated_at();

create trigger capsules_updated_at
  before update on capsules
  for each row execute function set_updated_at();

create trigger household_links_updated_at
  before update on household_links
  for each row execute function set_updated_at();

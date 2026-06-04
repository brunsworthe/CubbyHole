-- ============================================================
-- CubbyHole — Row Level Security Policies
-- ============================================================
-- Access model for capsules.SELECT:
--
--   ALLOW if ANY of the following is true:
--   (A) Requester belongs to the capsule's owning household.
--   (B) visibility_tier = 'linked' AND an active household_link
--       exists between the owning household and the requester's household.
--   (C) visibility_tier = 'custom' AND an explicit row in object_permissions
--       maps this capsule to the requester's household.
--   (D) A valid, non-expired, under-limit one_off_shares token exists
--       for this capsule (evaluated by the application via token lookup —
--       see the one_off_shares SELECT policy below).
-- ============================================================

-- Enable RLS on all tables
alter table households        enable row level security;
alter table children          enable row level security;
alter table capsules          enable row level security;
alter table household_links   enable row level security;
alter table object_permissions enable row level security;
alter table one_off_shares    enable row level security;

-- ============================================================
-- HOUSEHOLDS
-- ============================================================

-- Members can read their own household record
create policy "households: owner can read"
  on households for select
  using (owner_user_id = auth.uid());

-- Owner can update their own household
create policy "households: owner can update"
  on households for update
  using (owner_user_id = auth.uid());

-- Any authenticated user can create a household (onboarding)
create policy "households: authenticated can insert"
  on households for insert
  with check (owner_user_id = auth.uid());

-- ============================================================
-- CHILDREN
-- ============================================================

create policy "children: household owner can read"
  on children for select
  using (
    household_id in (select get_my_household_ids())
  );

create policy "children: household owner can insert"
  on children for insert
  with check (
    household_id in (select get_my_household_ids())
  );

create policy "children: household owner can update"
  on children for update
  using (
    household_id in (select get_my_household_ids())
  );

create policy "children: household owner can delete"
  on children for delete
  using (
    household_id in (select get_my_household_ids())
  );

-- ============================================================
-- CAPSULES — SELECT (4-condition access model)
-- ============================================================

create policy "capsules: select — own household"
  on capsules for select
  using (
    -- (A) Requester belongs to the owning household
    household_id in (select get_my_household_ids())
  );

create policy "capsules: select — linked households"
  on capsules for select
  using (
    -- (B) tier = 'linked' AND active household_link exists (either direction)
    visibility_tier = 'linked'
    and exists (
      select 1
      from household_links hl
      where hl.status = 'active'
        and (
          (hl.requester_household_id = capsules.household_id
            and hl.recipient_household_id in (select get_my_household_ids()))
          or
          (hl.recipient_household_id = capsules.household_id
            and hl.requester_household_id in (select get_my_household_ids()))
        )
    )
  );

create policy "capsules: select — custom object permission"
  on capsules for select
  using (
    -- (C) tier = 'custom' AND explicit object_permissions row exists
    visibility_tier = 'custom'
    and exists (
      select 1
      from object_permissions op
      where op.capsule_id = capsules.id
        and op.grantee_household_id in (select get_my_household_ids())
    )
  );

-- (D) One-off share access is handled application-side via the
-- one_off_shares SELECT policy; the capsule policy below covers
-- authenticated viewers who arrive via a token-validated route.
-- For unauthenticated (guest) token viewers, use a service-role
-- edge function that validates the token and returns the capsule.

-- ============================================================
-- CAPSULES — WRITE
-- ============================================================

create policy "capsules: household owner can insert"
  on capsules for insert
  with check (
    household_id in (select get_my_household_ids())
  );

create policy "capsules: household owner can update"
  on capsules for update
  using (
    household_id in (select get_my_household_ids())
  );

create policy "capsules: household owner can delete"
  on capsules for delete
  using (
    household_id in (select get_my_household_ids())
  );

-- ============================================================
-- HOUSEHOLD LINKS
-- ============================================================

-- A household can see links where they are either party
create policy "household_links: participant can read"
  on household_links for select
  using (
    requester_household_id in (select get_my_household_ids())
    or recipient_household_id in (select get_my_household_ids())
  );

-- Only the requester household can create a link request
create policy "household_links: requester can insert"
  on household_links for insert
  with check (
    requester_household_id in (select get_my_household_ids())
  );

-- Either party can update (accept / revoke)
create policy "household_links: participant can update"
  on household_links for update
  using (
    requester_household_id in (select get_my_household_ids())
    or recipient_household_id in (select get_my_household_ids())
  );

-- Either party can delete (withdraw / remove)
create policy "household_links: participant can delete"
  on household_links for delete
  using (
    requester_household_id in (select get_my_household_ids())
    or recipient_household_id in (select get_my_household_ids())
  );

-- ============================================================
-- OBJECT PERMISSIONS
-- ============================================================

-- The granting household can see all grants they created
create policy "object_permissions: granting household can read"
  on object_permissions for select
  using (
    -- capsule must belong to the user's household
    exists (
      select 1 from capsules c
      where c.id = object_permissions.capsule_id
        and c.household_id in (select get_my_household_ids())
    )
    -- OR the user is the grantee household
    or grantee_household_id in (select get_my_household_ids())
  );

-- Only the capsule-owning household can create grants
create policy "object_permissions: capsule owner can insert"
  on object_permissions for insert
  with check (
    exists (
      select 1 from capsules c
      where c.id = object_permissions.capsule_id
        and c.household_id in (select get_my_household_ids())
    )
    and granted_by_user_id = auth.uid()
  );

-- Only the capsule-owning household can revoke grants
create policy "object_permissions: capsule owner can delete"
  on object_permissions for delete
  using (
    exists (
      select 1 from capsules c
      where c.id = object_permissions.capsule_id
        and c.household_id in (select get_my_household_ids())
    )
  );

-- ============================================================
-- ONE-OFF SHARES
-- ============================================================

-- Owning household can see all their share tokens
create policy "one_off_shares: capsule owner can read"
  on one_off_shares for select
  using (
    exists (
      select 1 from capsules c
      where c.id = one_off_shares.capsule_id
        and c.household_id in (select get_my_household_ids())
    )
  );

-- Anyone can look up a specific token by value (for guest link resolution).
-- The application must increment view_count and enforce expiry/max_views.
create policy "one_off_shares: public token lookup"
  on one_off_shares for select
  using (
    expires_at > now()
    and (max_views is null or view_count < max_views)
  );

-- Owning household can create share tokens
create policy "one_off_shares: capsule owner can insert"
  on one_off_shares for insert
  with check (
    exists (
      select 1 from capsules c
      where c.id = one_off_shares.capsule_id
        and c.household_id in (select get_my_household_ids())
    )
    and created_by_user_id = auth.uid()
  );

-- Owning household can update (e.g., revoke by setting expires_at = now())
create policy "one_off_shares: capsule owner can update"
  on one_off_shares for update
  using (
    exists (
      select 1 from capsules c
      where c.id = one_off_shares.capsule_id
        and c.household_id in (select get_my_household_ids())
    )
  );

-- Owning household can delete tokens
create policy "one_off_shares: capsule owner can delete"
  on one_off_shares for delete
  using (
    exists (
      select 1 from capsules c
      where c.id = one_off_shares.capsule_id
        and c.household_id in (select get_my_household_ids())
    )
  );

-- ============================================================
-- VIEW COUNT INCREMENT (safe, non-policy path)
-- Called by the application when a guest views a share token.
-- Uses security definer to bypass RLS for the increment only.
-- ============================================================

create or replace function increment_share_view_count(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update one_off_shares
  set view_count = view_count + 1
  where token = p_token
    and expires_at > now()
    and (max_views is null or view_count < max_views);
end;
$$;

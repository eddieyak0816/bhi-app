-- Migration: corporate org structure
-- Creates organizations and org_memberships tables for Phase 4.

-- Organizations
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Org memberships
create table if not exists org_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  team text check (team in ('fire', 'water', 'wind', 'earth')),
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Indexes
create index if not exists org_memberships_org_id_idx on org_memberships(org_id);
create index if not exists org_memberships_user_id_idx on org_memberships(user_id);

-- RLS
alter table organizations enable row level security;
alter table org_memberships enable row level security;

-- organizations: service role can do everything; org admins can read their own org
create policy "service_role_organizations_all" on organizations
  for all to service_role using (true) with check (true);

create policy "org_admin_read_own_org" on organizations
  for select using (
    exists (
      select 1 from org_memberships
      where org_memberships.org_id = organizations.id
        and org_memberships.user_id = auth.uid()
        and org_memberships.role = 'admin'
    )
  );

-- org_memberships: service role can do everything
create policy "service_role_org_memberships_all" on org_memberships
  for all to service_role using (true) with check (true);

-- org admins can read all memberships in their org
create policy "org_admin_read_memberships" on org_memberships
  for select using (
    exists (
      select 1 from org_memberships om2
      where om2.org_id = org_memberships.org_id
        and om2.user_id = auth.uid()
        and om2.role = 'admin'
    )
  );

-- members can read their own row
create policy "member_read_own_membership" on org_memberships
  for select using (user_id = auth.uid());

comment on table organizations is 'Corporate organizations for employer wellness programs. PHI rule: never expose real names, emails, or raw lab values in employer-facing views.';
comment on table org_memberships is 'Maps users to organizations with role (member|admin) and optional wellness team (fire|water|wind|earth).';
comment on column org_memberships.role is 'member = regular participant; admin = org manager who can view de-identified aggregate data';
comment on column org_memberships.team is 'Wellness team assignment: fire | water | wind | earth';

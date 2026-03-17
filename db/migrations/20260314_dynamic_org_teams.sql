-- Migration: dynamic per-org teams
-- Replaces hardcoded fire/water/wind/earth check constraint with a free-form text column
-- and a new org_teams table for managing team names per org.

-- New org_teams table
create table if not exists org_teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists org_teams_org_id_idx on org_teams(org_id);

-- RLS
alter table org_teams enable row level security;

create policy "service_role_org_teams_all" on org_teams
  for all to service_role using (true) with check (true);

-- Drop the hardcoded team check constraint on org_memberships
-- (constraint name may vary — drop by finding it)
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'org_memberships'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%fire%';
  if con_name is not null then
    execute 'alter table org_memberships drop constraint ' || quote_ident(con_name);
  end if;
end;
$$;

comment on table org_teams is 'Per-org team names. Replaces hardcoded fire/water/wind/earth — each org defines its own teams.';

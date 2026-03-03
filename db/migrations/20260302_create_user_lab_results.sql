-- Migration: create user_lab_results table
-- Persists per-user lab results for cross-device sync and stale-date tracking.

create table if not exists user_lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  marker_name text not null,
  value numeric not null,
  unit text,
  date date not null,
  min_normal numeric,
  max_normal numeric,
  created_at timestamptz default now()
);

alter table user_lab_results enable row level security;

create policy "Users can manage their own lab results"
  on user_lab_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

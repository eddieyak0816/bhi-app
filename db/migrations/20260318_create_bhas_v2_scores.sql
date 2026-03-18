-- F43: Persist BHAS v2.3 derived values for analytics and leaderboard use
-- One row per user per day (upsert on conflict via unique constraint on
-- user_id + score_date). Daily recalcs overwrite the same row.

create table if not exists bhas_v2_scores (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  scored_at             timestamptz not null default now(),
  score_date            date not null default current_date,

  -- Score summary
  total_score           numeric(4,2) not null,
  label                 text not null check (label in ('Optimal','Healthy','Needs Improvement','High Risk')),

  -- Derived ratios
  homa_ir               numeric(6,3),
  tg_hdl_ratio          numeric(6,3),
  grip_ratio            numeric(6,3),
  wthr                  numeric(6,4),
  insulin_units_per_kg  numeric(6,3),

  -- Tie-breaker fields
  vo2_max_percentile    numeric(5,1),
  hs_crp                numeric(6,3),
  acute_visits          integer,

  -- Full per-metric breakdown (for leaderboard/analytics queries)
  metric_scores         jsonb not null default '[]'::jsonb
);

-- One row per user per calendar day
create unique index if not exists bhas_v2_scores_user_day
  on bhas_v2_scores (user_id, score_date);

-- RLS
alter table bhas_v2_scores enable row level security;

create policy "Users can read own scores"
  on bhas_v2_scores for select
  using (auth.uid() = user_id);

create policy "Users can insert own scores"
  on bhas_v2_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scores"
  on bhas_v2_scores for update
  using (auth.uid() = user_id);

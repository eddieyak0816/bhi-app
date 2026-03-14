-- Migration: add username to profiles
-- Unique display name for de-identification. Users set their own username;
-- admins can see the username ↔ real identity mapping server-side only.

alter table profiles
  add column if not exists username text unique;

-- Backfill existing rows: derive username from email prefix, lower-cased,
-- non-alphanumeric chars replaced with underscore. Append suffix on collision.
do $$
declare
  r record;
  base_name text;
  candidate text;
  suffix int;
begin
  for r in
    select id, email from profiles where username is null
  loop
    base_name := lower(regexp_replace(split_part(r.email, '@', 1), '[^a-z0-9]', '_', 'g'));
    candidate := base_name;
    suffix := 1;
    -- resolve collisions
    while exists (select 1 from profiles where username = candidate) loop
      candidate := base_name || '_' || suffix;
      suffix := suffix + 1;
    end loop;
    update profiles set username = candidate where id = r.id;
  end loop;
end;
$$;

comment on column profiles.username is
  'User-chosen unique display name (lowercase, alphanumeric + underscores). Used for de-identification in employer-facing views — never exposes real name or email.';

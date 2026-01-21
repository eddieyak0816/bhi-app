-- Optional migration: add an `id` column to logic_rules if it does not exist.
-- Run this in dev/staging after verifying with backups. It's idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'logic_rules' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.logic_rules ADD COLUMN id uuid DEFAULT gen_random_uuid();
    ALTER TABLE public.logic_rules ALTER COLUMN id SET NOT NULL;
    ALTER TABLE public.logic_rules ADD PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add id to logic_rules: %', SQLERRM;
END$$;
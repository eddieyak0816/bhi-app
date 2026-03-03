-- Migration: Add biometric fields and sex to profiles table
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'sex'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN sex VARCHAR(10)
      CHECK (sex IN ('male', 'female', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'waist_circumference'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN waist_circumference NUMERIC(5,1);
    COMMENT ON COLUMN public.profiles.waist_circumference IS 'Waist circumference in inches';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'waist_unit'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN waist_unit VARCHAR(5) DEFAULT 'in'
      CHECK (waist_unit IN ('in', 'cm'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'grip_strength'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN grip_strength NUMERIC(5,1);
    COMMENT ON COLUMN public.profiles.grip_strength IS 'Dominant hand grip strength in kg';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'age'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN age INTEGER CHECK (age > 0 AND age < 130);
  END IF;
END $$;

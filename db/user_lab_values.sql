-- db/user_lab_values.sql
-- OPT-IN storage scaffold for user lab values.
-- This table is created but client writes are blocked by RLS by default.
-- Enable a trusted backend (service role) to write via a server API.

CREATE TABLE IF NOT EXISTS public.user_lab_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  marker_id uuid NOT NULL,
  reported_value numeric NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_lab_values IS 'Opt-in storage for user lab values. Disabled for client writes by default.';

-- STRONG SAFETY: enable RLS and deny client writes.
ALTER TABLE public.user_lab_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_lab_values_no_client_writes
  ON public.user_lab_values
  FOR INSERT, UPDATE, DELETE
  USING (false)
  WITH CHECK (false);

-- NOTE: Do NOT grant client roles the ability to INSERT into this table.
-- To allow controlled writes, implement a server-side endpoint (backend/service) that calls a DB function
-- using a service role. Example pattern (do NOT expose service_role to browser):

-- Example server-side helper function (owned by a trusted DB role):
CREATE OR REPLACE FUNCTION app.insert_user_lab_value(
  p_user_id uuid,
  p_marker_id uuid,
  p_reported_value numeric
) RETURNS uuid
LANGUAGE sql SECURITY DEFINER
AS $$
  INSERT INTO public.user_lab_values (user_id, marker_id, reported_value)
  VALUES (p_user_id, p_marker_id, p_reported_value)
  RETURNING id;
$$;

-- IMPORTANT: do NOT grant EXECUTE on this function to anon/public. The backend should call this using the
-- Supabase service_role (server-side) or a trusted DB role. Granting EXECUTE to unauthenticated users is unsafe.

-- Audit note: ensure any production rollout includes encryption-at-rest, consent language, retention policy,
-- and a legal/privacy review. This file is a scaffold only and safe by default (client writes blocked).

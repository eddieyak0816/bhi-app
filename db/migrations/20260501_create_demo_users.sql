-- Demo test users — one per role type
-- Run in Supabase Dashboard → SQL Editor
-- Password for all: Demo123

DO $$
DECLARE
  uid_user       uuid;
  uid_admin      uuid;
  uid_superadmin uuid;
  uid_broker     uuid;
BEGIN

  -- 1. Role: user
  uid_user := (
    SELECT id FROM auth.users WHERE email = 'test.user@nhl-demo.com'
  );
  IF uid_user IS NULL THEN
    uid_user := extensions.uuid_generate_v4();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      uid_user,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'test.user@nhl-demo.com',
      crypt('Demo123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    );
  END IF;
  INSERT INTO public.profiles (id, role)
  VALUES (uid_user, 'user')
  ON CONFLICT (id) DO UPDATE SET role = 'user';

  -- 2. Role: admin
  uid_admin := (
    SELECT id FROM auth.users WHERE email = 'test.admin@nhl-demo.com'
  );
  IF uid_admin IS NULL THEN
    uid_admin := extensions.uuid_generate_v4();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      uid_admin,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'test.admin@nhl-demo.com',
      crypt('Demo123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    );
  END IF;
  INSERT INTO public.profiles (id, role)
  VALUES (uid_admin, 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  -- 3. Role: super_admin
  uid_superadmin := (
    SELECT id FROM auth.users WHERE email = 'test.superadmin@nhl-demo.com'
  );
  IF uid_superadmin IS NULL THEN
    uid_superadmin := extensions.uuid_generate_v4();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      uid_superadmin,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'test.superadmin@nhl-demo.com',
      crypt('Demo123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    );
  END IF;
  INSERT INTO public.profiles (id, role)
  VALUES (uid_superadmin, 'super_admin')
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

  -- 4. Role: broker
  uid_broker := (
    SELECT id FROM auth.users WHERE email = 'test.broker@nhl-demo.com'
  );
  IF uid_broker IS NULL THEN
    uid_broker := extensions.uuid_generate_v4();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      uid_broker,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'test.broker@nhl-demo.com',
      crypt('Demo123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    );
  END IF;
  INSERT INTO public.profiles (id, role)
  VALUES (uid_broker, 'broker')
  ON CONFLICT (id) DO UPDATE SET role = 'broker';

END $$;

-- ==============================================================================
-- EDUTECH — PHASE 1 AUTHENTICATION FIXES SCRIPT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Supabase Dashboard -> SQL Editor)
--
-- FIXES INCLUDED:
-- 1. FIX "Database error querying schema" on Admin Login:
--    Deletes the incomplete admin record and cleanly provisions admin@gmail.com / 123456
--    with BOTH auth.users AND auth.identities (required by GoTrue).
-- 2. FIX "Email not confirmed" on Public Signup:
--    Adds a BEFORE INSERT trigger on auth.users to automatically set
--    email_confirmed_at = NOW() for all newly registered users in development.
-- ==============================================================================

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. AUTO-CONFIRM USER EMAIL TRIGGER (Fixes "Email not confirmed")
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically confirm email for development signups
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();

-- ------------------------------------------------------------------------------
-- 3. PROVISION ADMIN USER WITH COMPLETE IDENTITIES (Fixes "Database error querying schema")
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
BEGIN
  -- Remove any existing partial/broken admin record
  DELETE FROM auth.users WHERE email = 'admin@gmail.com';

  -- Insert complete user record into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'admin@gmail.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Administrator","role":"admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Insert matching identity record into auth.identities (REQUIRED by GoTrue)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_id,
    admin_id,
    format('{"sub":"%s","email":"%s"}', admin_id::text, 'admin@gmail.com')::jsonb,
    'email',
    admin_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- Ensure profile exists and has role 'admin'
  INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
  VALUES (admin_id, 'Administrator', 'admin@gmail.com', 'admin', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Administrator';

END $$;

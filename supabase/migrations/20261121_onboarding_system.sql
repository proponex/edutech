-- ==============================================================================
-- PREPNX AUTHENTICATION & ONBOARDING MIGRATION
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Ensure onboarding_completed defaults to false for newly created rows
ALTER TABLE public.profiles 
  ALTER COLUMN onboarding_completed SET DEFAULT false;

-- 2. Update automatic trigger to ensure onboarding_completed is false for new users
-- and DO NOT insert into students/teachers/parents automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  user_name TEXT;
  is_admin BOOLEAN;
  is_completed BOOLEAN;
BEGIN
  is_admin := (new.email = 'admin@gmail.com');
  user_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  assigned_role := CASE WHEN is_admin THEN 'admin' ELSE COALESCE(new.raw_user_meta_data->>'role', 'student') END;
  is_completed := is_admin;

  INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    onboarding_completed,
    auth_provider,
    status,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    user_name,
    new.email,
    assigned_role,
    is_completed,
    COALESCE(new.raw_app_meta_data->>'provider', 'email'),
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = CASE WHEN public.profiles.name IS NULL OR public.profiles.name = '' THEN EXCLUDED.name ELSE public.profiles.name END,
    email = EXCLUDED.email,
    role = CASE WHEN EXCLUDED.email = 'admin@gmail.com' THEN 'admin' ELSE public.profiles.role END,
    updated_at = NOW();

  -- ONLY insert into specific role table if admin.
  -- Students, Teachers, and Parents are created exclusively after completing onboarding.
  IF is_admin THEN
    INSERT INTO public.admins (id, name, email) VALUES (new.id, user_name, new.email) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

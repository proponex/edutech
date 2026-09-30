-- ==============================================================================
-- EDUTECH — PHASE 1: DATABASE SCHEMA & STORAGE SETUP
-- ==============================================================================
-- Run this script in your Supabase Project's SQL Editor (Supabase Dashboard -> SQL Editor)
-- It creates:
-- 1. Profiles table (with role-based access: admin, teacher, student, parent)
-- 2. Classes table (seeded with Kindergarten to Class 12)
-- 3. Banners table (with storage path and order control)
-- 4. Storage bucket for 'banners' with public read & admin upload policies
-- 5. Row Level Security (RLS) policies
-- 6. Trigger for auto-creating profiles on auth.users sign-up
-- 7. Automated admin role promotion for admin@gmail.com lkklfka
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ------------------------------------------------------------------------------
-- 2. CLASSES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_order ON public.classes(display_order);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON public.classes(is_active);

-- ------------------------------------------------------------------------------
-- 3. BANNERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_banners_order ON public.banners(display_order);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners(is_active);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile name" ON public.profiles;
CREATE POLICY "Users can update own profile name"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (
  public.is_admin() OR (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "Service and admins can insert profiles" ON public.profiles;
CREATE POLICY "Service and admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() OR public.is_admin());

-- Classes Policies
DROP POLICY IF EXISTS "Public can view active classes" ON public.classes;
CREATE POLICY "Public can view active classes"
ON public.classes FOR SELECT
TO public
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "Admins can manage classes"
ON public.classes FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Banners Policies
DROP POLICY IF EXISTS "Public can view active banners" ON public.banners;
CREATE POLICY "Public can view active banners"
ON public.banners FOR SELECT
TO public
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners"
ON public.banners FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  user_name TEXT;
BEGIN
  -- Check role from metadata
  assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  
  -- Prevent public self-assignment to admin unless it is the seeded admin email
  IF assigned_role = 'admin' AND new.email <> 'admin@gmail.com' THEN
    assigned_role := 'student';
  END IF;
  
  -- If user email is admin@gmail.com, unconditionally assign admin role
  IF new.email = 'admin@gmail.com' THEN
    assigned_role := 'admin';
  END IF;

  user_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (new.id, user_name, new.email, assigned_role)
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = CASE WHEN EXCLUDED.email = 'admin@gmail.com' THEN 'admin' ELSE public.profiles.role END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 6. STORAGE BUCKET FOR BANNERS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: Public read access
DROP POLICY IF EXISTS "Public Banner View" ON storage.objects;
CREATE POLICY "Public Banner View"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banners');

-- Storage RLS: Admin upload access
DROP POLICY IF EXISTS "Admin Banner Insert" ON storage.objects;
CREATE POLICY "Admin Banner Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners' AND public.is_admin());

-- Storage RLS: Admin update access
DROP POLICY IF EXISTS "Admin Banner Update" ON storage.objects;
CREATE POLICY "Admin Banner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'banners' AND public.is_admin());

-- Storage RLS: Admin delete access
DROP POLICY IF EXISTS "Admin Banner Delete" ON storage.objects;
CREATE POLICY "Admin Banner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'banners' AND public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. SEED INITIAL CLASSES (Kindergarten to Class 12)
-- ------------------------------------------------------------------------------
INSERT INTO public.classes (name, display_order, is_active)
VALUES
  ('Kindergarten', 1, true),
  ('Class 1', 2, true),
  ('Class 2', 3, true),
  ('Class 3', 4, true),
  ('Class 4', 5, true),
  ('Class 5', 6, true),
  ('Class 6', 7, true),
  ('Class 7', 8, true),
  ('Class 8', 9, true),
  ('Class 9', 10, true),
  ('Class 10', 11, true),
  ('Class 11', 12, true),
  ('Class 12', 13, true)
ON CONFLICT (name) DO UPDATE 
SET display_order = EXCLUDED.display_order, is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 8. INITIAL ADMIN PROVISIONING (admin@gmail.com / 123456)
-- ------------------------------------------------------------------------------
-- You can either:
-- OPTION A (Recommended): Create the user in Supabase Dashboard:
--   1. Go to Authentication -> Users
--   2. Click "Add User" -> "Create User"
--   3. Email: admin@gmail.com, Password: 123456, Auto Confirm: checked
--   4. The trigger above will automatically create their profile with role = 'admin'.
--
-- OPTION B (Direct SQL creation):
-- Uncomment and run the block below if you prefer to create the user directly via SQL:

-- ------------------------------------------------------------------------------
-- 7.5 AUTO-CONFIRM USER EMAIL TRIGGER (For development signups)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
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
-- 8. INITIAL ADMIN PROVISIONING (admin@gmail.com / 123456)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  admin_uid UUID;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@gmail.com';
  
  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    
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
      admin_uid,
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

    -- Insert matching identity (MANDATORY for GoTrue password auth)
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
      admin_uid,
      admin_uid,
      format('{"sub":"%s","email":"%s"}', admin_uid::text, 'admin@gmail.com')::jsonb,
      'email',
      admin_uid::text,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  -- Ensure profile exists and has role admin
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (admin_uid, 'Administrator', 'admin@gmail.com', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';
END $$;

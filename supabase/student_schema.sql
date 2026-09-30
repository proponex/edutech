-- ==============================================================================
-- EDUTECH — PHASE 5 DATABASE SCHEMA
-- STUDENT PROFILE, ACADEMIC TIMELINE, CHANNEL SUBSCRIPTIONS & REVIEWS
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> Run)
--
-- This script provisions:
-- 1. Profile extensions: photo_url, phone, parent_phone, class_id, board_id, preferred_language
-- 2. Student Academic Profiles table (supporting academic history / timeline)
-- 3. Channel Subscriptions table (for packages: entire channel, particular class, class + subject)
-- 4. Channel Reviews table (for teacher reviews and ratings)
-- 5. Row Level Security (RLS) policies for student access and data privacy
-- ==============================================================================

-- 1. EXTEND PROFILES TABLE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'English';

-- 2. STUDENT ACADEMIC PROFILES (TIMELINE & HISTORICAL RECORDS)
CREATE TABLE IF NOT EXISTS public.student_academic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL, -- e.g. '2026-27'
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'English',
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_academic_student_id ON public.student_academic_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_current ON public.student_academic_profiles(student_id, is_current);

-- 3. CHANNEL SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.channel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  package_type TEXT NOT NULL CHECK (package_type IN ('entire_channel', 'particular_class', 'class_subject')),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_channel_package UNIQUE (student_id, channel_id, package_type)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON public.channel_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON public.channel_subscriptions(channel_id);

-- 4. CHANNEL REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.channel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  review_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_channel_student_review UNIQUE (channel_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_channel ON public.channel_reviews(channel_id);

-- 5. ROW LEVEL SECURITY (RLS)

-- Profiles
DROP POLICY IF EXISTS "Users can update own profile full" ON public.profiles;
CREATE POLICY "Users can update own profile full" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- Student Academic Profiles
ALTER TABLE public.student_academic_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own academic profiles" ON public.student_academic_profiles;
CREATE POLICY "Students can view own academic profiles" ON public.student_academic_profiles
  FOR SELECT USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Students can insert own academic profiles" ON public.student_academic_profiles;
CREATE POLICY "Students can insert own academic profiles" ON public.student_academic_profiles
  FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Students can update own academic profiles" ON public.student_academic_profiles;
CREATE POLICY "Students can update own academic profiles" ON public.student_academic_profiles
  FOR UPDATE USING (student_id = auth.uid() OR public.is_admin());

-- Channel Subscriptions
ALTER TABLE public.channel_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own subscriptions" ON public.channel_subscriptions;
CREATE POLICY "Students can view own subscriptions" ON public.channel_subscriptions
  FOR SELECT USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Teachers can view subscriptions to their channels" ON public.channel_subscriptions;
CREATE POLICY "Teachers can view subscriptions to their channels" ON public.channel_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_subscriptions.channel_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can create subscriptions" ON public.channel_subscriptions;
CREATE POLICY "Students can create subscriptions" ON public.channel_subscriptions
  FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin());

-- Channel Reviews
ALTER TABLE public.channel_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view channel reviews" ON public.channel_reviews;
CREATE POLICY "Anyone can view channel reviews" ON public.channel_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Students can add review if subscribed" ON public.channel_reviews;
CREATE POLICY "Students can add review if subscribed" ON public.channel_reviews
  FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin());

-- Storage Bucket for Avatars & Media (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

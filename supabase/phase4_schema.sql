-- ==============================================================================
-- EDUTECH — PHASE 4 DATABASE SCHEMA
-- TEACHER CHANNELS, CONTENT CREATION & ACADEMIC TAXONOMY
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> Run)
--
-- This script provisions:
-- 1. Academic Reference Entities: boards, reference_subjects, units, topics, sub_topics
-- 2. Teacher Channel System: channels, channel_classes, channel_boards, channel_specializations, channel_languages
-- 3. Content System: videos, live_classes, quizzes, quiz_questions, quiz_options, homework
-- 4. Storage Bucket: channel_media (for channel photo, thumbnails, attachments)
-- 5. Row Level Security (RLS) policies guaranteeing teacher content ownership
-- 6. Pre-seeded reference boards, subjects, and curriculum trees for Class 10 & Class 12
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ACADEMIC REFERENCE DATA
-- ==============================================================================

-- BOARDS
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REFERENCE SUBJECTS
CREATE TABLE IF NOT EXISTS public.reference_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CURRICULUM UNITS (TEACHER & CHANNEL OWNED)
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  unit_number INT,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_channel ON public.units(channel_id, subject_name);
CREATE INDEX IF NOT EXISTS idx_units_lookup ON public.units(class_id, board_id, subject_name);

-- CURRICULUM TOPICS
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_unit_id ON public.topics(unit_id);

-- CURRICULUM SUB-TOPICS
CREATE TABLE IF NOT EXISTS public.sub_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_topics_topic_id ON public.sub_topics(topic_id);

-- ==============================================================================
-- 2. TEACHER CHANNELS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_teacher_id ON public.channels(teacher_id);

-- CHANNEL CLASSES (ONE CHANNEL = ONE CLASS ENFORCEMENT)
CREATE TABLE IF NOT EXISTS public.channel_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_channel_class UNIQUE (channel_id)
);

-- Migration safety for existing tables
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.channel_classes DROP CONSTRAINT IF EXISTS unique_channel_class;
ALTER TABLE public.channel_classes ADD CONSTRAINT unique_channel_class UNIQUE (channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_classes_channel_id ON public.channel_classes(channel_id);

-- CHANNEL BOARDS
CREATE TABLE IF NOT EXISTS public.channel_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_channel_board UNIQUE (channel_id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_boards_channel_id ON public.channel_boards(channel_id);

-- CHANNEL SPECIALIZATIONS
CREATE TABLE IF NOT EXISTS public.channel_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_channel_specialization UNIQUE (channel_id, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_channel_specializations_channel_id ON public.channel_specializations(channel_id);

-- CHANNEL LANGUAGES
CREATE TABLE IF NOT EXISTS public.channel_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_channel_language UNIQUE (channel_id, language)
);

CREATE INDEX IF NOT EXISTS idx_channel_languages_channel_id ON public.channel_languages(channel_id);

-- ==============================================================================
-- 3. EDUCATIONAL CONTENT ENTITIES
-- ==============================================================================

-- VIDEOS
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE RESTRICT,
  subject_name TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  sub_topic_id UUID REFERENCES public.sub_topics(id) ON DELETE SET NULL,
  scope TEXT NOT NULL DEFAULT 'unit' CHECK (scope IN ('unit', 'topic', 'sub_topic')),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration_seconds INT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON public.videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_academic ON public.videos(class_id, board_id, subject_name);

-- LIVE CLASSES
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE RESTRICT,
  subject_name TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  sub_topic_id UUID REFERENCES public.sub_topics(id) ON DELETE SET NULL,
  scope TEXT NOT NULL DEFAULT 'unit' CHECK (scope IN ('unit', 'topic', 'sub_topic')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_classes_channel_id ON public.live_classes(channel_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_academic ON public.live_classes(class_id, board_id, subject_name);

-- QUIZZES
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE RESTRICT,
  subject_name TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  sub_topic_id UUID REFERENCES public.sub_topics(id) ON DELETE SET NULL,
  scope TEXT NOT NULL DEFAULT 'unit' CHECK (scope IN ('unit', 'topic', 'sub_topic')),
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INT,
  total_marks INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_channel_id ON public.quizzes(channel_id);

-- QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  marks INT NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);

-- QUIZ OPTIONS
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON public.quiz_options(question_id);

-- HOMEWORK
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE RESTRICT,
  subject_name TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  sub_topic_id UUID REFERENCES public.sub_topics(id) ON DELETE SET NULL,
  scope TEXT NOT NULL DEFAULT 'unit' CHECK (scope IN ('unit', 'topic', 'sub_topic')),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  tasks TEXT,
  marks INT,
  due_date DATE,
  attachment_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_channel_id ON public.homework(channel_id);

-- ==============================================================================
-- 4. STORAGE BUCKETS (channel_media)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('channel_media', 'channel_media', true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_topics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_languages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is owner of a channel
CREATE OR REPLACE FUNCTION public.is_channel_owner(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channels
    WHERE id = c_id AND teacher_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Academic Reference RLS (Read for all, Teachers can create/update units & topics)
DROP POLICY IF EXISTS "Anyone can view active boards" ON public.boards;
CREATE POLICY "Anyone can view active boards" ON public.boards FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Anyone can view reference subjects" ON public.reference_subjects;
CREATE POLICY "Anyone can view reference subjects" ON public.reference_subjects FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Anyone can view units" ON public.units;
CREATE POLICY "Anyone can view units" ON public.units FOR SELECT
  USING (
    channel_id IS NULL OR
    public.is_channel_owner(channel_id) OR
    channel_id IN (SELECT id FROM public.channels WHERE is_active = true)
  );

DROP POLICY IF EXISTS "Teachers can insert units" ON public.units;
CREATE POLICY "Teachers can insert units" ON public.units FOR INSERT
  WITH CHECK (public.is_channel_owner(channel_id) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can update units" ON public.units;
CREATE POLICY "Teachers can update units" ON public.units FOR UPDATE
  USING (public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "Teachers can delete units" ON public.units;
CREATE POLICY "Teachers can delete units" ON public.units FOR DELETE
  USING (public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "Anyone can view topics" ON public.topics;
CREATE POLICY "Anyone can view topics" ON public.topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Teachers can insert topics" ON public.topics;
CREATE POLICY "Teachers can insert topics" ON public.topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Teachers can update topics" ON public.topics;
CREATE POLICY "Teachers can update topics" ON public.topics FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Teachers can delete topics" ON public.topics;
CREATE POLICY "Teachers can delete topics" ON public.topics FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can view sub_topics" ON public.sub_topics;
CREATE POLICY "Anyone can view sub_topics" ON public.sub_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Teachers can insert sub_topics" ON public.sub_topics;
CREATE POLICY "Teachers can insert sub_topics" ON public.sub_topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Teachers can update sub_topics" ON public.sub_topics;
CREATE POLICY "Teachers can update sub_topics" ON public.sub_topics FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Teachers can delete sub_topics" ON public.sub_topics;
CREATE POLICY "Teachers can delete sub_topics" ON public.sub_topics FOR DELETE USING (auth.role() = 'authenticated');

-- Channels RLS
DROP POLICY IF EXISTS "Public can view active channels" ON public.channels;
CREATE POLICY "Public can view active channels" ON public.channels
  FOR SELECT USING (is_active = true OR teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Teachers can create channels" ON public.channels;
CREATE POLICY "Teachers can create channels" ON public.channels
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own channels" ON public.channels;
CREATE POLICY "Teachers can update own channels" ON public.channels
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own channels" ON public.channels;
CREATE POLICY "Teachers can delete own channels" ON public.channels
  FOR DELETE USING (teacher_id = auth.uid());

-- Channel Config tables RLS (classes, boards, specs, languages)
DROP POLICY IF EXISTS "View channel classes" ON public.channel_classes;
CREATE POLICY "View channel classes" ON public.channel_classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage channel classes" ON public.channel_classes;
CREATE POLICY "Manage channel classes" ON public.channel_classes FOR ALL USING (public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "View channel boards" ON public.channel_boards;
CREATE POLICY "View channel boards" ON public.channel_boards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage channel boards" ON public.channel_boards;
CREATE POLICY "Manage channel boards" ON public.channel_boards FOR ALL USING (public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "View channel specializations" ON public.channel_specializations;
CREATE POLICY "View channel specializations" ON public.channel_specializations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage channel specializations" ON public.channel_specializations;
CREATE POLICY "Manage channel specializations" ON public.channel_specializations FOR ALL USING (public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "View channel languages" ON public.channel_languages;
CREATE POLICY "View channel languages" ON public.channel_languages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage channel languages" ON public.channel_languages;
CREATE POLICY "Manage channel languages" ON public.channel_languages FOR ALL USING (public.is_channel_owner(channel_id));

-- Videos RLS
DROP POLICY IF EXISTS "Public can view published videos" ON public.videos;
CREATE POLICY "Public can view published videos" ON public.videos
  FOR SELECT USING (is_published = true OR public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "Teachers manage own videos" ON public.videos;
CREATE POLICY "Teachers manage own videos" ON public.videos
  FOR ALL USING (public.is_channel_owner(channel_id));

-- Live Classes RLS
DROP POLICY IF EXISTS "Public can view live classes" ON public.live_classes;
CREATE POLICY "Public can view live classes" ON public.live_classes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers manage own live classes" ON public.live_classes;
CREATE POLICY "Teachers manage own live classes" ON public.live_classes
  FOR ALL USING (public.is_channel_owner(channel_id));

-- Quizzes & Questions RLS
DROP POLICY IF EXISTS "Public can view published quizzes" ON public.quizzes;
CREATE POLICY "Public can view published quizzes" ON public.quizzes
  FOR SELECT USING (is_published = true OR public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "Teachers manage own quizzes" ON public.quizzes;
CREATE POLICY "Teachers manage own quizzes" ON public.quizzes
  FOR ALL USING (public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "Public can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Public can view quiz questions" ON public.quiz_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Teachers manage quiz questions" ON public.quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id AND public.is_channel_owner(q.channel_id)
    )
  );

DROP POLICY IF EXISTS "Public can view quiz options" ON public.quiz_options;
CREATE POLICY "Public can view quiz options" ON public.quiz_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers manage quiz options" ON public.quiz_options;
CREATE POLICY "Teachers manage quiz options" ON public.quiz_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      WHERE qq.id = quiz_options.question_id AND public.is_channel_owner(q.channel_id)
    )
  );

-- Homework RLS
DROP POLICY IF EXISTS "Public can view published homework" ON public.homework;
CREATE POLICY "Public can view published homework" ON public.homework
  FOR SELECT USING (is_published = true OR public.is_channel_owner(channel_id));

DROP POLICY IF EXISTS "Teachers manage own homework" ON public.homework;
CREATE POLICY "Teachers manage own homework" ON public.homework
  FOR ALL USING (public.is_channel_owner(channel_id));

-- Storage RLS for channel_media
DROP POLICY IF EXISTS "Public can view channel media" ON storage.objects;
CREATE POLICY "Public can view channel media" ON storage.objects
  FOR SELECT USING (bucket_id = 'channel_media');

DROP POLICY IF EXISTS "Authenticated users can upload channel media" ON storage.objects;
CREATE POLICY "Authenticated users can upload channel media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'channel_media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update channel media" ON storage.objects;
CREATE POLICY "Users can update channel media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'channel_media' AND auth.role() = 'authenticated');

-- ==============================================================================
-- 6. PRE-SEEDED ACADEMIC REFERENCE DATA (CLASSES, BOARDS & SUBJECTS ONLY)
-- NOTE: Units, Topics, and Sub-topics are NOT pre-seeded here because they
-- are created and owned by individual teachers for their channels.
-- ==============================================================================

-- Seed Classes (Kindergarten through Class 12)
INSERT INTO public.classes (name, display_order, is_active)
VALUES
  ('Kindergarten', 0, true),
  ('Class 1', 1, true),
  ('Class 2', 2, true),
  ('Class 3', 3, true),
  ('Class 4', 4, true),
  ('Class 5', 5, true),
  ('Class 6', 6, true),
  ('Class 7', 7, true),
  ('Class 8', 8, true),
  ('Class 9', 9, true),
  ('Class 10', 10, true),
  ('Class 11', 11, true),
  ('Class 12', 12, true)
ON CONFLICT (name) DO NOTHING;

-- Seed Boards
INSERT INTO public.boards (name, code, display_order, is_active)
VALUES
  ('Tamil Nadu State Board', 'tnsb', 1, true),
  ('CBSE', 'cbse', 2, true),
  ('ICSE', 'icse', 3, true),
  ('IB', 'ib', 4, true),
  ('Other', 'other', 5, true)
ON CONFLICT (name) DO NOTHING;

-- Seed Reference Subjects (Broad Searchable Discovery)
INSERT INTO public.reference_subjects (name, slug, display_order, is_active)
VALUES
  ('Mathematics', 'mathematics', 1, true),
  ('Physics', 'physics', 2, true),
  ('Chemistry', 'chemistry', 3, true),
  ('Biology', 'biology', 4, true),
  ('English', 'english', 5, true),
  ('Tamil', 'tamil', 6, true),
  ('Science', 'science', 7, true),
  ('Social Science', 'social-science', 8, true),
  ('Hindi', 'hindi', 9, true),
  ('Computer Science', 'computer-science', 10, true),
  ('Economics', 'economics', 11, true),
  ('Accountancy', 'accountancy', 12, true),
  ('Business Studies', 'business-studies', 13, true),
  ('History', 'history', 14, true),
  ('Geography', 'geography', 15, true)
ON CONFLICT (name) DO NOTHING;


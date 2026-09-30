-- ==============================================================================
-- EDUTECH — ARCHITECTURE FIX: SEPARATE ROLE TABLES
-- ==============================================================================

-- 1. Create separate tables for each role
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  phone TEXT,
  parent_phone TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  preferred_language TEXT DEFAULT 'English',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Migrate existing data from profiles
INSERT INTO public.students (id, name, email, photo_url, phone, parent_phone, class_id, board_id, preferred_language, created_at, updated_at)
SELECT id, name, email, photo_url, phone, parent_phone, class_id, board_id, preferred_language, created_at, updated_at
FROM public.profiles WHERE role = 'student'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teachers (id, name, email, photo_url, phone, created_at, updated_at)
SELECT id, name, email, photo_url, phone, created_at, updated_at
FROM public.profiles WHERE role = 'teacher'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parents (id, name, email, photo_url, phone, created_at, updated_at)
SELECT id, name, email, photo_url, phone, created_at, updated_at
FROM public.profiles WHERE role = 'parent'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admins (id, name, email, created_at, updated_at)
SELECT id, name, email, created_at, updated_at
FROM public.profiles WHERE role = 'admin'
ON CONFLICT (id) DO NOTHING;

-- 3. Update Foreign Keys to point to specific tables instead of profiles
-- (Note: We must drop the old constraints first)

ALTER TABLE public.student_academic_profiles DROP CONSTRAINT IF EXISTS student_academic_profiles_student_id_fkey;
ALTER TABLE public.student_academic_profiles ADD CONSTRAINT student_academic_profiles_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.channel_subscriptions DROP CONSTRAINT IF EXISTS channel_subscriptions_student_id_fkey;
ALTER TABLE public.channel_subscriptions ADD CONSTRAINT channel_subscriptions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.channel_reviews DROP CONSTRAINT IF EXISTS channel_reviews_student_id_fkey;
ALTER TABLE public.channel_reviews ADD CONSTRAINT channel_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.student_content_progress DROP CONSTRAINT IF EXISTS student_content_progress_student_id_fkey;
ALTER TABLE public.student_content_progress ADD CONSTRAINT student_content_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_teacher_id_fkey;
ALTER TABLE public.channels ADD CONSTRAINT channels_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_teacher_id_fkey;
ALTER TABLE public.units ADD CONSTRAINT units_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

ALTER TABLE public.teacher_messages DROP CONSTRAINT IF EXISTS teacher_messages_teacher_id_fkey;
ALTER TABLE public.teacher_messages ADD CONSTRAINT teacher_messages_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

ALTER TABLE public.teacher_messages DROP CONSTRAINT IF EXISTS teacher_messages_student_id_fkey;
ALTER TABLE public.teacher_messages ADD CONSTRAINT teacher_messages_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- 4. Enable RLS and Create Policies for new tables

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is an admin using the new admins table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Students
CREATE POLICY "Students can view own profile or admins view all" ON public.students FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin() OR EXISTS (SELECT 1 FROM public.teachers WHERE id = auth.uid()));
CREATE POLICY "Students can update own profile" ON public.students FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Service and admins can insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

-- Teachers
CREATE POLICY "Teachers can view own profile or admins view all" ON public.teachers FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin() OR EXISTS (SELECT 1 FROM public.students WHERE id = auth.uid()));
CREATE POLICY "Teachers can update own profile" ON public.teachers FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Service and admins can insert teachers" ON public.teachers FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

-- Parents
CREATE POLICY "Parents can view own profile or admins view all" ON public.parents FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Parents can update own profile" ON public.parents FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Service and admins can insert parents" ON public.parents FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

-- Admins
CREATE POLICY "Admins can view own profile" ON public.admins FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins can update own profile" ON public.admins FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Service and admins can insert admins" ON public.admins FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

-- 5. Modify the automatic profile creation trigger on signup
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

  -- Insert into profiles for backwards compatibility and role-based redirect in login
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (new.id, user_name, new.email, assigned_role)
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = CASE WHEN EXCLUDED.email = 'admin@gmail.com' THEN 'admin' ELSE public.profiles.role END,
    updated_at = NOW();

  -- Insert into the specific role table
  IF assigned_role = 'student' THEN
    INSERT INTO public.students (id, name, email) VALUES (new.id, user_name, new.email) ON CONFLICT (id) DO NOTHING;
  ELSIF assigned_role = 'teacher' THEN
    INSERT INTO public.teachers (id, name, email) VALUES (new.id, user_name, new.email) ON CONFLICT (id) DO NOTHING;
  ELSIF assigned_role = 'parent' THEN
    INSERT INTO public.parents (id, name, email) VALUES (new.id, user_name, new.email) ON CONFLICT (id) DO NOTHING;
  ELSIF assigned_role = 'admin' THEN
    INSERT INTO public.admins (id, name, email) VALUES (new.id, user_name, new.email) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

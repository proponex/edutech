-- ==============================================================================
-- EDUTECH — PARENT DASHBOARD REPAIR & STUDENT-PARENT LINKING SCHEMA EXTENSION
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- It safely adds:
-- 1. Permanent unique student_id_code column (ED-YYYY-NNNNNN)
-- 2. Atomic yearly sequence tracking for student IDs
-- 3. Automatic sequence generator function
-- 4. Status, responded_at, and updated_at to parent_students table
-- 5. Strict uniqueness and integrity constraints
-- 6. Safe idempotent backfill for existing students
-- 7. Row Level Security (RLS) policies for parent-student relationships
-- ==============================================================================

-- 1. ADD student_id_code TO profiles AND students TABLES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id_code VARCHAR(30);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_id_code VARCHAR(30);

-- Unique index on student_id_code (sparse to allow nulls for non-students)
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_student_id_code
  ON public.profiles(student_id_code)
  WHERE student_id_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_student_id_code
  ON public.students(student_id_code)
  WHERE student_id_code IS NOT NULL;

-- 2. YEARLY SEQUENCE TRACKING TABLE FOR ATOMIC ID GENERATION
CREATE TABLE IF NOT EXISTS public.student_id_sequences (
  year INT PRIMARY KEY,
  current_seq INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. ATOMIC STUDENT ID GENERATOR FUNCTION (ED-YYYY-NNNNNN)
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
  v_seq INT;
  v_id TEXT;
BEGIN
  -- Atomically increment the sequence for the current year
  INSERT INTO public.student_id_sequences (year, current_seq, updated_at)
  VALUES (v_year, 1, TIMEZONE('utc'::text, NOW()))
  ON CONFLICT (year) DO UPDATE
  SET current_seq = public.student_id_sequences.current_seq + 1,
      updated_at = TIMEZONE('utc'::text, NOW())
  RETURNING current_seq INTO v_seq;

  -- Format as ED-YYYY-NNNNNN (6 zero-padded digits)
  v_id := 'ED-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_id;
END;
$$;

-- 4. EXTEND parent_students TABLE WITH STATUS & AUDIT TIMESTAMPS
-- Ensure parent_students table exists
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'Guardian',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(parent_id, student_id)
);

-- Add status column: pending, accepted, rejected, cancelled
ALTER TABLE public.parent_students 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint for valid statuses
ALTER TABLE public.parent_students DROP CONSTRAINT IF EXISTS chk_parent_students_status;
ALTER TABLE public.parent_students ADD CONSTRAINT chk_parent_students_status
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

-- Add timestamp columns
ALTER TABLE public.parent_students 
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE public.parent_students 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Indexes for fast relationship and status lookups
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON public.parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_status ON public.parent_students(status);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_status ON public.parent_students(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_status ON public.parent_students(student_id, status);

-- Unique index to prevent duplicate pending or accepted requests between same parent and student
CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_student_active_link
  ON public.parent_students(parent_id, student_id)
  WHERE status IN ('pending', 'accepted');

-- 5. SAFE IDEMPOTENT BACKFILL SCRIPT FOR EXISTING STUDENTS
-- Automatically assigns an ED-YYYY-NNNNNN ID to every student who doesn't have one yet.
DO $$
DECLARE
  r RECORD;
  new_id TEXT;
  current_val INT;
  rec_year INT;
BEGIN
  -- Process all student profiles missing an ID, ordered by creation time
  FOR r IN 
    SELECT p.id, p.created_at
    FROM public.profiles p
    WHERE p.role = 'student' 
      AND (p.student_id_code IS NULL OR p.student_id_code = '')
    ORDER BY p.created_at ASC 
  LOOP
    rec_year := EXTRACT(YEAR FROM r.created_at);
    IF rec_year IS NULL OR rec_year < 2020 THEN
      rec_year := EXTRACT(YEAR FROM CURRENT_DATE);
    END IF;

    -- Atomically increment for that year
    INSERT INTO public.student_id_sequences (year, current_seq, updated_at)
    VALUES (rec_year, 1, TIMEZONE('utc'::text, NOW()))
    ON CONFLICT (year) DO UPDATE
    SET current_seq = public.student_id_sequences.current_seq + 1,
        updated_at = TIMEZONE('utc'::text, NOW())
    RETURNING current_seq INTO current_val;

    new_id := 'ED-' || rec_year::TEXT || '-' || LPAD(current_val::TEXT, 6, '0');

    -- Update profiles
    UPDATE public.profiles 
    SET student_id_code = new_id, 
        updated_at = TIMEZONE('utc'::text, NOW()) 
    WHERE id = r.id;

    -- Update students table
    UPDATE public.students 
    SET student_id_code = new_id, 
        updated_at = TIMEZONE('utc'::text, NOW()) 
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES FOR parent_students
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- Parents can view their own connection requests
DROP POLICY IF EXISTS "Parents can view own requests" ON public.parent_students;
CREATE POLICY "Parents can view own requests" ON public.parent_students
  FOR SELECT
  USING (parent_id = auth.uid());

-- Students can view connection requests sent to them
DROP POLICY IF EXISTS "Students can view requests to them" ON public.parent_students;
CREATE POLICY "Students can view requests to them" ON public.parent_students
  FOR SELECT
  USING (student_id = auth.uid());

-- Parents can create connection requests
DROP POLICY IF EXISTS "Parents can insert requests" ON public.parent_students;
CREATE POLICY "Parents can insert requests" ON public.parent_students
  FOR INSERT
  WITH CHECK (parent_id = auth.uid() AND status = 'pending');

-- Students can update requests sent to them (accept or reject)
DROP POLICY IF EXISTS "Students can update requests to them" ON public.parent_students;
CREATE POLICY "Students can update requests to them" ON public.parent_students
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Parents can update (cancel) their own pending requests
DROP POLICY IF EXISTS "Parents can cancel own pending requests" ON public.parent_students;
CREATE POLICY "Parents can cancel own pending requests" ON public.parent_students
  FOR UPDATE
  USING (parent_id = auth.uid() AND status = 'pending')
  WITH CHECK (parent_id = auth.uid());

-- Admins have full access
DROP POLICY IF EXISTS "Admins full access on parent_students" ON public.parent_students;
CREATE POLICY "Admins full access on parent_students" ON public.parent_students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Output confirmation
COMMENT ON TABLE public.parent_students IS 'Parent-student relationships with pending/accepted/rejected state';
COMMENT ON COLUMN public.profiles.student_id_code IS 'Permanent unique student identifier (ED-YYYY-NNNNNN)';

-- ==============================================================================
-- EDUTECH — PHASE 5.2 QUIZ ATTEMPTS SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to support the new Quiz UI Flow

CREATE TABLE IF NOT EXISTS public.student_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  total_marks INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  time_taken_seconds INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_completed BOOLEAN NOT NULL DEFAULT true,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.student_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.student_quiz_attempts(quiz_id);

ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attempts" ON public.student_quiz_attempts;
CREATE POLICY "Students can view own attempts" ON public.student_quiz_attempts
  FOR SELECT USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Students can insert own attempts" ON public.student_quiz_attempts;
CREATE POLICY "Students can insert own attempts" ON public.student_quiz_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin());

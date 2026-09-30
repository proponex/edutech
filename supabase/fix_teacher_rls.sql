-- ==============================================================================
-- EDUTECH — FIX TEACHER RLS FOR STUDENT DETAILS
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to allow teachers to view their students' details

-- 1. Allow Teachers to view profiles of their subscribed students
DROP POLICY IF EXISTS "Teachers can view profiles of their students" ON public.profiles;
CREATE POLICY "Teachers can view profiles of their students" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.channel_subscriptions cs
    JOIN public.channels c ON cs.channel_id = c.id
    WHERE cs.student_id = profiles.id AND c.teacher_id = auth.uid()
  )
);

-- 2. Allow Teachers to view academic profiles of their subscribed students
DROP POLICY IF EXISTS "Teachers can view academic profiles of their students" ON public.student_academic_profiles;
CREATE POLICY "Teachers can view academic profiles of their students" ON public.student_academic_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.channel_subscriptions cs
    JOIN public.channels c ON cs.channel_id = c.id
    WHERE cs.student_id = student_academic_profiles.student_id AND c.teacher_id = auth.uid()
  )
);

-- 3. Allow Teachers to view student data of their subscribed students
DROP POLICY IF EXISTS "Teachers can view student records of their students" ON public.students;
CREATE POLICY "Teachers can view student records of their students" ON public.students
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.channel_subscriptions cs
    JOIN public.channels c ON cs.channel_id = c.id
    WHERE cs.student_id = students.id AND c.teacher_id = auth.uid()
  )
);

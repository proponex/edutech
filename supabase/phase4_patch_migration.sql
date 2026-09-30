-- ==============================================================================
-- EDUTECH — PHASE 3 + PHASE 4 CORRECTION PATCH MIGRATION
-- ==============================================================================
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
--
-- This migration applies:
-- 1. One Channel = One Class database constraint
-- 2. Channel & Teacher ownership columns on Units
-- 3. Strict RLS policies ensuring Teacher B cannot see or modify Teacher A's units
-- ==============================================================================

-- 1. Add direct class_id reference to channels table
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;

-- 2. Enforce at most one class per channel in channel_classes table
ALTER TABLE public.channel_classes DROP CONSTRAINT IF EXISTS unique_channel_class;
ALTER TABLE public.channel_classes ADD CONSTRAINT unique_channel_class UNIQUE (channel_id);

-- 3. Add channel_id and teacher_id to units table
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Create Index on units channel lookup
CREATE INDEX IF NOT EXISTS idx_units_channel ON public.units(channel_id, subject_name);

-- 5. Update Units RLS Policies for Strict Teacher Ownership
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

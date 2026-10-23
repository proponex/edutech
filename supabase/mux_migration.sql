-- ==============================================================================
-- EDUTECH — MUX VIDEO INTEGRATION MIGRATION
-- ==============================================================================
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
--
-- This migration:
-- 1. Adds Mux-specific columns to the videos table
-- 2. Adds watched_seconds and progress_percent to student_content_progress
-- 3. Creates indexes for Mux ID lookups (used by the webhook handler)
-- 4. Adds RLS policies so teachers can read/update their own videos' Mux fields
-- ==============================================================================

-- ==============================================================================
-- 1. ADD MUX COLUMNS TO videos TABLE
-- ==============================================================================

-- mux_upload_id: the Mux Direct Upload ID (from /api/mux/create-upload)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS mux_upload_id TEXT;

-- mux_asset_id: the Mux Asset ID (set by webhook: video.asset.created)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS mux_asset_id TEXT;

-- mux_playback_id: the Mux Playback ID (set by webhook: video.asset.ready)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;

-- mux_duration: float seconds as returned by Mux
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS mux_duration DOUBLE PRECISION;

-- mux_status: lifecycle state of the Mux video
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS mux_status TEXT;
-- Update check constraint to allow all standard states
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_mux_status_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_mux_status_check
  CHECK (mux_status IN ('waiting', 'pending', 'uploading', 'processing', 'ready', 'errored'));

-- mux_error_message: records descriptive error details when Mux processing or upload fails
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS mux_error_message TEXT;

-- Indexes for webhook lookup efficiency and status queries
CREATE INDEX IF NOT EXISTS idx_videos_mux_upload_id ON public.videos(mux_upload_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON public.videos(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_playback_id ON public.videos(mux_playback_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_status ON public.videos(mux_status);

-- ==============================================================================
-- 2. ADD MISSING COLUMNS TO student_content_progress TABLE
-- ==============================================================================

ALTER TABLE public.student_content_progress ADD COLUMN IF NOT EXISTS watched_seconds INT;
ALTER TABLE public.student_content_progress ADD COLUMN IF NOT EXISTS progress_percent INT;

-- ==============================================================================
-- 3. VERIFY RLS POLICIES FOR VIDEOS TABLE
-- ==============================================================================

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published videos" ON public.videos;
CREATE POLICY "Anyone can view published videos" ON public.videos
  FOR SELECT USING (
    is_published = true
    OR is_demo = true
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = videos.channel_id AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.channel_subscriptions cs
      WHERE cs.channel_id = videos.channel_id
        AND cs.student_id = auth.uid()
        AND cs.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Teachers can manage own channel videos" ON public.videos;
CREATE POLICY "Teachers can manage own channel videos" ON public.videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = videos.channel_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can insert videos" ON public.videos;
CREATE POLICY "Teachers can insert videos" ON public.videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = videos.channel_id AND c.teacher_id = auth.uid()
    )
  );

-- ==============================================================================
-- 4. BACKFILL: Recover videos already processed by Mux but stuck in old status
-- ==============================================================================

UPDATE public.videos
SET mux_status = 'ready'
WHERE mux_playback_id IS NOT NULL
  AND mux_playback_id != ''
  AND (mux_status IS NULL OR mux_status NOT IN ('ready', 'errored'));

-- ==============================================================================
-- Done.
-- ==============================================================================

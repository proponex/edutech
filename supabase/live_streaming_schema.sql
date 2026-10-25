-- ==============================================================================
-- EDUTECH -- LIVE STREAMING SCHEMA MIGRATION
-- ==============================================================================
-- Apply this in Supabase Dashboard -> SQL Editor -> New Query -> Run All
--
-- Creates:
--   1. live_sessions       -- one row per teacher live-class session
--   2. live_chat_messages  -- per-session chat messages
--   3. live_session_viewers -- viewer count tracking (upsert-based)
--   4. RLS policies        -- teacher ownership + student subscription checks
--   5. Indexes             -- for efficient webhook & realtime queries
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. LIVE SESSIONS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id               UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,

  title                    TEXT NOT NULL,
  description              TEXT,
  subject_name             TEXT,
  unit_id                  UUID REFERENCES public.units(id) ON DELETE SET NULL,

  status                   TEXT NOT NULL DEFAULT 'scheduled'
                             CHECK (status IN ('scheduled','starting','live','idle','ended','errored')),

  scheduled_start_at       TIMESTAMPTZ,
  started_at               TIMESTAMPTZ,
  ended_at                 TIMESTAMPTZ,

  mux_live_stream_id       TEXT,
  mux_stream_key           TEXT,
  mux_playback_id          TEXT,
  mux_stream_key_id        TEXT,

  mux_recording_asset_id   TEXT,
  mux_recording_playback_id TEXT,
  recording_status         TEXT DEFAULT 'none'
                             CHECK (recording_status IN ('none','processing','ready','errored')),

  viewer_count             INT NOT NULL DEFAULT 0,
  chat_enabled             BOOLEAN NOT NULL DEFAULT true,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_channel_id ON public.live_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher_id ON public.live_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_mux_live_stream_id ON public.live_sessions(mux_live_stream_id);

-- ==============================================================================
-- 2. LIVE CHAT MESSAGES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role     TEXT NOT NULL DEFAULT 'student'
                    CHECK (sender_role IN ('teacher','student')),
  message         TEXT NOT NULL CHECK (length(message) > 0 AND length(message) <= 500),
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_session_id ON public.live_chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_sender_id ON public.live_chat_messages(sender_id);

-- ==============================================================================
-- 3. LIVE SESSION VIEWERS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.live_session_viewers (
  session_id  UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_viewers_session ON public.live_session_viewers(session_id);

-- ==============================================================================
-- 4. ENABLE RLS
-- ==============================================================================

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_viewers ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. RLS POLICIES -- live_sessions
-- ==============================================================================

DROP POLICY IF EXISTS "Teachers can manage their own live sessions" ON public.live_sessions;
CREATE POLICY "Teachers can manage their own live sessions"
  ON public.live_sessions FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view sessions for subscribed channels" ON public.live_sessions;
CREATE POLICY "Students can view sessions for subscribed channels"
  ON public.live_sessions FOR SELECT
  USING (
    status IN ('scheduled', 'live', 'idle', 'ended')
    AND EXISTS (
      SELECT 1 FROM public.channel_subscriptions cs
      WHERE cs.channel_id = live_sessions.channel_id
        AND cs.student_id = auth.uid()
        AND cs.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Teachers can see sessions across their channels" ON public.live_sessions;
CREATE POLICY "Teachers can see sessions across their channels"
  ON public.live_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = live_sessions.channel_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ==============================================================================
-- 6. RLS POLICIES -- live_chat_messages
-- ==============================================================================

DROP POLICY IF EXISTS "Subscribers can read chat messages" ON public.live_chat_messages;
CREATE POLICY "Subscribers can read chat messages"
  ON public.live_chat_messages FOR SELECT
  USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_chat_messages.session_id
        AND (
          ls.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.channel_subscriptions cs
            WHERE cs.channel_id = ls.channel_id
              AND cs.student_id = auth.uid()
              AND cs.status = 'active'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Participants can send chat messages" ON public.live_chat_messages;
CREATE POLICY "Participants can send chat messages"
  ON public.live_chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_chat_messages.session_id
        AND ls.chat_enabled = true
        AND ls.status IN ('live', 'idle')
        AND (
          ls.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.channel_subscriptions cs
            WHERE cs.channel_id = ls.channel_id
              AND cs.student_id = auth.uid()
              AND cs.status = 'active'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Teachers can moderate chat messages" ON public.live_chat_messages;
CREATE POLICY "Teachers can moderate chat messages"
  ON public.live_chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_chat_messages.session_id
        AND ls.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_chat_messages.session_id
        AND ls.teacher_id = auth.uid()
    )
  );

-- ==============================================================================
-- 7. RLS POLICIES -- live_session_viewers
-- ==============================================================================

DROP POLICY IF EXISTS "Viewers can upsert their own presence" ON public.live_session_viewers;
CREATE POLICY "Viewers can upsert their own presence"
  ON public.live_session_viewers FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view their session viewers" ON public.live_session_viewers;
CREATE POLICY "Teachers can view their session viewers"
  ON public.live_session_viewers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_session_viewers.session_id
        AND ls.teacher_id = auth.uid()
    )
  );

-- ==============================================================================
-- 8. REALTIME PUBLICATION
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
  END IF;
END $$;

-- ==============================================================================
-- 9. UPDATED_AT TRIGGER for live_sessions
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_live_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_live_sessions_updated_at ON public.live_sessions;
CREATE TRIGGER trg_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_live_sessions_updated_at();

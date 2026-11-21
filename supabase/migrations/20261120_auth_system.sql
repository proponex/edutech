-- ==============================================================================
-- PREPNX AUTHENTICATION SYSTEM MIGRATION
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add onboarding_completed and auth tracking columns to profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN auth_provider TEXT DEFAULT 'email';
  END IF;
END $$;

-- 3. Create email_otps table for secure SMTP-delivered OTP verification
CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset', 'email_verification')),
  payload JSONB DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  resend_count INTEGER NOT NULL DEFAULT 0,
  resend_available_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 seconds'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_email_otps_email_purpose ON public.email_otps(email, purpose);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON public.email_otps(expires_at);

-- Row Level Security for email_otps (strict service-role only access)
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage email_otps" ON public.email_otps;
CREATE POLICY "Service role can manage email_otps"
  ON public.email_otps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Create password_reset_tokens table for secure token verification
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON public.password_reset_tokens(user_id);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role can manage password_reset_tokens"
  ON public.password_reset_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Helper function for clean OTP expiration cleanup
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.email_otps WHERE expires_at < NOW() - INTERVAL '1 day';
  DELETE FROM public.password_reset_tokens WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

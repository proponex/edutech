-- ==============================================================================
-- PREPNX 28-DAY PRECISE SUBSCRIPTION SYSTEM MIGRATION
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Ensure columns exist with precise TIMESTAMPTZ
ALTER TABLE public.channel_subscriptions 
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '28_days';

-- 2. Backfill existing subscriptions to exact 28 days (2,419,200 seconds)
UPDATE public.channel_subscriptions
SET 
  starts_at = COALESCE(starts_at, created_at, NOW()),
  expires_at = COALESCE(starts_at, created_at, NOW()) + INTERVAL '28 days',
  duration = '28_days'
WHERE expires_at IS NULL;

-- 3. Automatic Trigger to Guarantee 28-Day Expiry on Insert/Update if not provided
CREATE OR REPLACE FUNCTION public.enforce_28day_subscription_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.starts_at IS NULL THEN
    NEW.starts_at := NOW();
  END IF;

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.starts_at + INTERVAL '28 days';
  END IF;

  IF NEW.duration IS NULL OR NEW.duration = '1_month' THEN
    NEW.duration := '28_days';
  END IF;

  -- Auto-expire if past expiry
  IF NEW.expires_at <= NOW() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_28day_subscription_expiry ON public.channel_subscriptions;
CREATE TRIGGER trg_enforce_28day_subscription_expiry
  BEFORE INSERT OR UPDATE ON public.channel_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_28day_subscription_expiry();

-- 4. Index for fast access control queries
CREATE INDEX IF NOT EXISTS idx_channel_subs_active_expiry 
  ON public.channel_subscriptions (student_id, channel_id, status, expires_at);


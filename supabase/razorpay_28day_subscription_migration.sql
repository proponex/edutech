-- ==============================================================================
-- EDUTECH: RAZORPAY PAYMENT INTEGRATION & 28-DAY CHANNEL SUBSCRIPTIONS MIGRATION
-- ==============================================================================
-- Run this migration in your Supabase SQL Editor (Dashboard -> SQL Editor -> Run)
--
-- This script provisions:
-- 1. public.payments table (authoritative payment tracking)
-- 2. Extensions to public.channel_subscriptions (28-day expiration, starts_at, payment_id)
-- 3. Indexes & Unique constraints for idempotent Razorpay reconciliation
-- 4. Secure Row Level Security (RLS) policies
-- ==============================================================================

-- 1. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT UNIQUE,
  amount BIGINT NOT NULL CHECK (amount >= 0), -- Amount in paise (integer minor units: ₹1 = 100 paise)
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Unique constraint & indexes for payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_rzp_payment_unique ON public.payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_channel ON public.payments(channel_id);
CREATE INDEX IF NOT EXISTS idx_payments_rzp_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- 2. EXTEND CHANNEL_SUBSCRIPTIONS FOR 28-DAY LIFECYCLE
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '28_days';
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL;
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_channel_subs_student ON public.channel_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_channel_subs_channel ON public.channel_subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_subs_status ON public.channel_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_channel_subs_expires_at ON public.channel_subscriptions(expires_at);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR PAYMENTS
-- Students can view their own payments
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;
CREATE POLICY "Students can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

-- Teachers can view payments made for their channels
DROP POLICY IF EXISTS "Teachers can view channel payments" ON public.payments;
CREATE POLICY "Teachers can view channel payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = payments.channel_id AND c.teacher_id = auth.uid()
    ) OR public.is_admin()
  );

-- Admins have full access to payments
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. RLS POLICIES FOR CHANNEL_SUBSCRIPTIONS
-- Students can read their own subscriptions
DROP POLICY IF EXISTS "Students can view own subscriptions" ON public.channel_subscriptions;
CREATE POLICY "Students can view own subscriptions" ON public.channel_subscriptions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

-- Teachers can view subscriptions to their channels
DROP POLICY IF EXISTS "Teachers can view channel subscriptions" ON public.channel_subscriptions;
CREATE POLICY "Teachers can view channel subscriptions" ON public.channel_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_subscriptions.channel_id AND c.teacher_id = auth.uid()
    ) OR public.is_admin()
  );

-- Service role bypasses RLS for privileged write operations; students cannot manually insert/update subscriptions
DROP POLICY IF EXISTS "Students cannot insert subscriptions directly" ON public.channel_subscriptions;
CREATE POLICY "Admins can manage subscriptions" ON public.channel_subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ==============================================================================
-- EDUTECH — ADMIN PAYOUT LEDGER & TEACHER SETTINGS SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> Run)
--
-- This script provisions:
-- 1. teacher_payouts: Immutable ledger of all completed bank/UPI disbursements
-- 2. teacher_payout_settings: Bank account and UPI details for educator payouts
-- 3. Row Level Security (RLS) policies for Super Admin and Teachers
-- ==============================================================================

-- 1. TEACHER PAYOUT DISBURSEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'reversed')),
  utr_reference TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_payouts_teacher ON public.teacher_payouts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_status ON public.teacher_payouts(status);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_utr ON public.teacher_payouts(utr_reference);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_completed ON public.teacher_payouts(completed_at DESC);

-- 2. TEACHER PAYOUT SETTINGS TABLE (BANK & UPI DETAILS)
CREATE TABLE IF NOT EXISTS public.teacher_payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_holder_name TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  upi_id TEXT,
  account_type TEXT DEFAULT 'savings',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_settings_teacher ON public.teacher_payout_settings(teacher_id);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.teacher_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_payout_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all payouts and payout settings
CREATE POLICY "Admins full access to teacher_payouts"
  ON public.teacher_payouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins full access to teacher_payout_settings"
  ON public.teacher_payout_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Teachers can view their own payouts
CREATE POLICY "Teachers can view own payouts"
  ON public.teacher_payouts
  FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- Teachers can view and update their own payout settings
CREATE POLICY "Teachers can manage own payout settings"
  ON public.teacher_payout_settings
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Service role bypass for server-side operations
CREATE POLICY "Service role bypass teacher_payouts"
  ON public.teacher_payouts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role bypass teacher_payout_settings"
  ON public.teacher_payout_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- EDUTECH — TEACHER WITHDRAWAL REQUESTS & SUBJECT PRICING SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> Run)
--
-- This script provisions:
-- 1. withdrawal_requests: Teacher payout request workflow table
-- 2. Indexes and RLS policies for teachers and administrators
-- 3. Storage bucket permissions for withdrawal_qr_codes
-- ==============================================================================

-- 1. TEACHER WITHDRAWAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_amount_paise BIGINT NOT NULL CHECK (requested_amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi', 'gpay', 'bank_transfer')),
  upi_id TEXT,
  gpay_number TEXT,
  qr_image_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'rejected')),
  admin_notes TEXT,
  rejection_reason TEXT,
  payout_reference TEXT,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_teacher ON public.withdrawal_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created ON public.withdrawal_requests(created_at DESC);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Admins have full access to view, update, and manage all withdrawal requests
DROP POLICY IF EXISTS "Admins full access to withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "Admins full access to withdrawal_requests"
  ON public.withdrawal_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Teachers can view their own withdrawal requests
DROP POLICY IF EXISTS "Teachers can view own withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "Teachers can view own withdrawal_requests"
  ON public.withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- Teachers can insert their own withdrawal requests
DROP POLICY IF EXISTS "Teachers can insert own withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "Teachers can insert own withdrawal_requests"
  ON public.withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

-- Service role bypass for server-side operations
DROP POLICY IF EXISTS "Service role bypass withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "Service role bypass withdrawal_requests"
  ON public.withdrawal_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


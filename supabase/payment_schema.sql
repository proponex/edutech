-- ==============================================================================
-- EDUTECH PAYMENT & RAZORPAY INTEGRATION SCHEMA
-- ==============================================================================
-- Supports:
-- 1. Payment Orders (Courses, Exams, Subscription Packages)
-- 2. Payment Transactions (Authoritative Razorpay payment capture records)
-- 3. Teacher Earnings & Commission Split Ledger
-- 4. Refund Records
-- 5. Webhook Ingestion & Deduplication
-- 6. Row Level Security & Access Control
-- ==============================================================================

-- 1. PAYMENT ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_order_id TEXT UNIQUE,
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'exam')),
  item_id UUID NOT NULL,
  package_type TEXT CHECK (package_type IN ('entire_channel', 'particular_class', 'class_subject', 'single_exam')),
  class_id UUID,
  subject_name TEXT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'expired')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_student ON public.payment_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_item ON public.payment_orders(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_rzp_order ON public.payment_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);

-- 2. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_signature TEXT,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('authorized', 'captured', 'failed', 'refunded')),
  method TEXT, -- 'card', 'upi', 'netbanking', 'wallet'
  error_code TEXT,
  error_description TEXT,
  verified_at TIMESTAMPTZ,
  verification_source TEXT DEFAULT 'api' CHECK (verification_source IN ('api', 'webhook', 'reconcile')),
  raw_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_trans_order ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_rzp_payment ON public.payment_transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_student ON public.payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_trans_created ON public.payment_transactions(created_at DESC);

-- 3. TEACHER EARNINGS TABLE (COMMISSION ATTRIBUTION)
CREATE TABLE IF NOT EXISTS public.teacher_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  gross_amount_paise BIGINT NOT NULL CHECK (gross_amount_paise >= 0),
  platform_commission_paise BIGINT NOT NULL CHECK (platform_commission_paise >= 0),
  teacher_share_paise BIGINT NOT NULL CHECK (teacher_share_paise >= 0),
  commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00, -- 20% platform commission, 80% teacher
  status TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('pending', 'cleared', 'refunded', 'paid_out')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_earnings_teacher ON public.teacher_earnings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_order ON public.teacher_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_status ON public.teacher_earnings(status);

-- 4. REFUND RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.refund_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  razorpay_refund_id TEXT UNIQUE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refund_records_trans ON public.refund_records(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refund_records_rzp_ref ON public.refund_records(razorpay_refund_id);

-- 5. PAYMENT WEBHOOK EVENTS TABLE (DEDUPLICATION & AUDIT)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_eid ON public.payment_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON public.payment_webhook_events(event_type);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES
-- Students can view their own orders
DROP POLICY IF EXISTS "Students can view own payment orders" ON public.payment_orders;
CREATE POLICY "Students can view own payment orders" ON public.payment_orders
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

-- Students can view their own transactions
DROP POLICY IF EXISTS "Students can view own payment transactions" ON public.payment_transactions;
CREATE POLICY "Students can view own payment transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

-- Teachers can view their own earnings
DROP POLICY IF EXISTS "Teachers can view own earnings" ON public.teacher_earnings;
CREATE POLICY "Teachers can view own earnings" ON public.teacher_earnings
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.is_admin());

-- Admins full access on all payment tables
DROP POLICY IF EXISTS "Admins can manage payment orders" ON public.payment_orders;
CREATE POLICY "Admins can manage payment orders" ON public.payment_orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can manage payment transactions" ON public.payment_transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage teacher earnings" ON public.teacher_earnings;
CREATE POLICY "Admins can manage teacher earnings" ON public.teacher_earnings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage refunds" ON public.refund_records;
CREATE POLICY "Admins can manage refunds" ON public.refund_records
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage webhook events" ON public.payment_webhook_events;
CREATE POLICY "Admins can manage webhook events" ON public.payment_webhook_events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

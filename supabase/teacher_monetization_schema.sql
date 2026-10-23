-- ==============================================================================
-- EDUTECH — TEACHER MONETIZATION, SUBSCRIPTIONS & ENTITLEMENTS SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> Run)
--
-- This script provisions:
-- 1. teacher_content_pricing (Channel, Subject, and Chapter pricing for 1mo, 6mo, 12mo)
-- 2. content_entitlements (Granular student access rights with calendar-based expiration)
-- 3. teacher_pricing_audit (Immutable audit log of all pricing modifications)
-- 4. Extends channel_subscriptions with expires_at, duration, and unit_id
-- 5. Row Level Security (RLS) policies for Teachers, Students, and Super Admins
-- ==============================================================================

-- 1. TEACHER CONTENT PRICING TABLE
CREATE TABLE IF NOT EXISTS public.teacher_content_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('channel', 'subject', 'chapter')),
  subject_name TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  duration TEXT NOT NULL CHECK (duration IN ('1_month', '6_months', '12_months')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate pricing configurations
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_pricing_unique 
ON public.teacher_content_pricing (
  channel_id,
  scope,
  COALESCE(subject_name, '__ALL__'),
  COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
  duration
);

CREATE INDEX IF NOT EXISTS idx_tcp_channel ON public.teacher_content_pricing(channel_id);
CREATE INDEX IF NOT EXISTS idx_tcp_teacher ON public.teacher_content_pricing(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tcp_unit ON public.teacher_content_pricing(unit_id);
CREATE INDEX IF NOT EXISTS idx_tcp_scope ON public.teacher_content_pricing(scope);

-- 2. CONTENT ENTITLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.content_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('channel', 'subject', 'chapter')),
  subject_name TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  duration TEXT NOT NULL CHECK (duration IN ('1_month', '6_months', '12_months')),
  order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_student ON public.content_entitlements(student_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_channel ON public.content_entitlements(channel_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_unit ON public.content_entitlements(unit_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON public.content_entitlements(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_entitlements_teacher ON public.content_entitlements(teacher_id);

-- 3. TEACHER PRICING AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.teacher_pricing_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pricing_id UUID,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  subject_name TEXT,
  unit_id UUID,
  duration TEXT NOT NULL,
  previous_amount_paise BIGINT NOT NULL DEFAULT 0,
  new_amount_paise BIGINT NOT NULL,
  previous_is_active BOOLEAN NOT NULL DEFAULT true,
  new_is_active BOOLEAN NOT NULL DEFAULT true,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_channel ON public.teacher_pricing_audit(channel_id);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_teacher ON public.teacher_pricing_audit(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_created ON public.teacher_pricing_audit(created_at DESC);

-- 4. EXTEND CHANNEL SUBSCRIPTIONS FOR BACKWARD COMPATIBILITY
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;
ALTER TABLE public.channel_subscriptions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL;

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.teacher_content_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_pricing_audit ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- Teacher Content Pricing:
-- Public & Students can view active pricing plans
DROP POLICY IF EXISTS "Public can view active content pricing" ON public.teacher_content_pricing;
CREATE POLICY "Public can view active content pricing" ON public.teacher_content_pricing
  FOR SELECT TO authenticated, anon
  USING (is_active = true OR public.is_admin());

-- Teachers can view their own pricing (active or inactive)
DROP POLICY IF EXISTS "Teachers can view own content pricing" ON public.teacher_content_pricing;
CREATE POLICY "Teachers can view own content pricing" ON public.teacher_content_pricing
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.teacher_id = auth.uid()) OR
    public.is_admin()
  );

-- Teachers can insert & update their own pricing
DROP POLICY IF EXISTS "Teachers can manage own content pricing" ON public.teacher_content_pricing;
CREATE POLICY "Teachers can manage own content pricing" ON public.teacher_content_pricing
  FOR ALL TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.teacher_id = auth.uid()) OR
    public.is_admin()
  )
  WITH CHECK (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.teacher_id = auth.uid()) OR
    public.is_admin()
  );

-- Content Entitlements:
-- Students can view their own entitlements
DROP POLICY IF EXISTS "Students can view own entitlements" ON public.content_entitlements;
CREATE POLICY "Students can view own entitlements" ON public.content_entitlements
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_admin());

-- Admins full access on entitlements
DROP POLICY IF EXISTS "Admins can manage entitlements" ON public.content_entitlements;
CREATE POLICY "Admins can manage entitlements" ON public.content_entitlements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pricing Audit:
DROP POLICY IF EXISTS "Teachers can view own pricing audit" ON public.teacher_pricing_audit;
CREATE POLICY "Teachers can view own pricing audit" ON public.teacher_pricing_audit
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage pricing audit" ON public.teacher_pricing_audit;
CREATE POLICY "Admins can manage pricing audit" ON public.teacher_pricing_audit
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

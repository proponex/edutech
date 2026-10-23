-- ==============================================================================
-- EDUTECH — SUPER ADMIN DASHBOARD SCHEMA EXTENSION
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- to support Super Admin Audit Logging, Parent-Student Linking, Pricing, and Activity Tracking.

-- 1. Add status columns to user role tables (for suspension/reactivation)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- 2. Parent-Student explicit relationships table
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'Guardian', -- 'Father', 'Mother', 'Guardian'
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON public.parent_students(student_id);

-- 3. Audit Logs table (tracks sensitive administrative actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 4. Activity Logs table (tracks website events: signups, course creation, exam attempts, etc.)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_role TEXT,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 5. Pricing Management Foundation (Courses & Exams)
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('course', 'exam')),
  item_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount_paise BIGINT NOT NULL DEFAULT 0, -- Integer minor units: ₹100.00 = 10000 paise
  currency TEXT NOT NULL DEFAULT 'INR',
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_plans_item ON public.pricing_plans(item_type, item_id);

CREATE TABLE IF NOT EXISTS public.pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_plan_id UUID NOT NULL REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
  previous_amount_paise BIGINT NOT NULL DEFAULT 0,
  new_amount_paise BIGINT NOT NULL DEFAULT 0,
  previous_is_free BOOLEAN NOT NULL DEFAULT true,
  new_is_free BOOLEAN NOT NULL DEFAULT true,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_history_plan ON public.pricing_history(pricing_plan_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;

-- Helper function: Check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for parent_students
DROP POLICY IF EXISTS "Admins can manage parent_students" ON public.parent_students;
CREATE POLICY "Admins can manage parent_students" ON public.parent_students
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Parents can view their student links" ON public.parent_students;
CREATE POLICY "Parents can view their student links" ON public.parent_students
  FOR SELECT USING (parent_id = auth.uid() OR student_id = auth.uid());

-- Policies for audit_logs (only admins and service role can read/insert)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

-- Policies for activity_logs
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view activity logs" ON public.activity_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

-- Policies for pricing_plans
DROP POLICY IF EXISTS "Everyone can view active pricing" ON public.pricing_plans;
CREATE POLICY "Everyone can view active pricing" ON public.pricing_plans
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage pricing" ON public.pricing_plans;
CREATE POLICY "Admins can manage pricing" ON public.pricing_plans
  FOR ALL USING (public.is_admin());

-- Policies for pricing_history
DROP POLICY IF EXISTS "Admins can view pricing history" ON public.pricing_history;
CREATE POLICY "Admins can view pricing history" ON public.pricing_history
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert pricing history" ON public.pricing_history;
CREATE POLICY "Admins can insert pricing history" ON public.pricing_history
  FOR INSERT WITH CHECK (public.is_admin());

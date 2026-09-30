-- ==============================================================================
-- EDUTECH — PHASE 3 DATABASE SCHEMA: COURSE CATALOG & SUBJECT MANAGEMENT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> Run)
--
-- This script provisions:
-- 1. public.subjects
-- 2. public.syllabus_units
-- 3. public.topics
-- 4. Row Level Security (RLS) policies for public reading and admin-only write
-- 5. Standard initial syllabus seed data for Class 12
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. SUBJECTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_class_subject_name UNIQUE (class_id, name),
  CONSTRAINT unique_class_subject_slug UNIQUE (class_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_display_order ON public.subjects(class_id, display_order);
CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects(is_active);

-- ------------------------------------------------------------------------------
-- 2. SYLLABUS UNITS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.syllabus_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  unit_number INT,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_units_subject_id ON public.syllabus_units(subject_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_units_display_order ON public.syllabus_units(subject_id, display_order);
CREATE INDEX IF NOT EXISTS idx_syllabus_units_is_active ON public.syllabus_units(is_active);

-- ------------------------------------------------------------------------------
-- 3. TOPICS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.syllabus_units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_unit_id ON public.topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_topics_display_order ON public.topics(unit_id, display_order);
CREATE INDEX IF NOT EXISTS idx_topics_is_active ON public.topics(is_active);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Subjects RLS
DROP POLICY IF EXISTS "Public can view active subjects" ON public.subjects;
CREATE POLICY "Public can view active subjects"
  ON public.subjects
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
CREATE POLICY "Admins can insert subjects"
  ON public.subjects
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
CREATE POLICY "Admins can update subjects"
  ON public.subjects
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
CREATE POLICY "Admins can delete subjects"
  ON public.subjects
  FOR DELETE
  USING (public.is_admin());

-- Syllabus Units RLS
DROP POLICY IF EXISTS "Public can view active units" ON public.syllabus_units;
CREATE POLICY "Public can view active units"
  ON public.syllabus_units
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert units" ON public.syllabus_units;
CREATE POLICY "Admins can insert units"
  ON public.syllabus_units
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update units" ON public.syllabus_units;
CREATE POLICY "Admins can update units"
  ON public.syllabus_units
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete units" ON public.syllabus_units;
CREATE POLICY "Admins can delete units"
  ON public.syllabus_units
  FOR DELETE
  USING (public.is_admin());

-- Topics RLS
DROP POLICY IF EXISTS "Public can view active topics" ON public.topics;
CREATE POLICY "Public can view active topics"
  ON public.topics
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert topics" ON public.topics;
CREATE POLICY "Admins can insert topics"
  ON public.topics
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update topics" ON public.topics;
CREATE POLICY "Admins can update topics"
  ON public.topics
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete topics" ON public.topics;
CREATE POLICY "Admins can delete topics"
  ON public.topics
  FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. INITIAL SEED DATA FOR CLASS 12 (ACADEMIC CATALOG FOUNDATION)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  class12_id UUID;
  math_id UUID := gen_random_uuid();
  phys_id UUID := gen_random_uuid();
  chem_id UUID := gen_random_uuid();
  bio_id UUID := gen_random_uuid();
  
  unit_rel_id UUID := gen_random_uuid();
  unit_calc_id UUID := gen_random_uuid();
  unit_elec_id UUID := gen_random_uuid();
  unit_optics_id UUID := gen_random_uuid();
BEGIN
  -- Find Class 12
  SELECT id INTO class12_id FROM public.classes WHERE name = 'Class 12' LIMIT 1;

  IF class12_id IS NOT NULL THEN
    -- Seed Subjects for Class 12 if not already present
    INSERT INTO public.subjects (id, class_id, name, slug, description, display_order, is_active)
    VALUES
      (math_id, class12_id, 'Mathematics', 'mathematics', 'Core higher secondary mathematics covering calculus, algebra, vectors, and probability.', 1, true),
      (phys_id, class12_id, 'Physics', 'physics', 'Theoretical and applied physics including electrostatics, optics, modern physics, and magnetism.', 2, true),
      (chem_id, class12_id, 'Chemistry', 'chemistry', 'Organic, inorganic, and physical chemistry with reaction mechanisms and coordination compounds.', 3, true),
      (bio_id, class12_id, 'Biology', 'biology', 'Genetics, evolution, biotechnology, ecology, and human physiology for board and competitive exams.', 4, true)
    ON CONFLICT (class_id, slug) DO NOTHING;

    -- Retrieve actual mathematics id if conflict occurred
    SELECT id INTO math_id FROM public.subjects WHERE class_id = class12_id AND slug = 'mathematics' LIMIT 1;
    SELECT id INTO phys_id FROM public.subjects WHERE class_id = class12_id AND slug = 'physics' LIMIT 1;

    -- Seed Units for Mathematics
    IF math_id IS NOT NULL THEN
      INSERT INTO public.syllabus_units (id, subject_id, title, description, unit_number, display_order, is_active)
      VALUES
        (unit_rel_id, math_id, 'Relations and Functions', 'Equivalence relations, functions, inverse trigonometric functions.', 1, 1, true),
        (unit_calc_id, math_id, 'Calculus', 'Continuity, differentiability, applications of derivatives, integrals, and differential equations.', 2, 2, true)
      ON CONFLICT DO NOTHING;

      -- Seed Topics for Unit 1 (Relations and Functions)
      INSERT INTO public.topics (unit_id, title, description, display_order, is_active)
      VALUES
        (unit_rel_id, 'Types of Relations', 'Reflexive, symmetric, transitive and equivalence relations.', 1, true),
        (unit_rel_id, 'One-to-One and Onto Functions', 'Bijective functions and mapping properties.', 2, true),
        (unit_rel_id, 'Inverse Trigonometric Functions', 'Principal value branches and essential properties.', 3, true)
      ON CONFLICT DO NOTHING;

      -- Seed Topics for Unit 2 (Calculus)
      INSERT INTO public.topics (unit_id, title, description, display_order, is_active)
      VALUES
        (unit_calc_id, 'Continuity & Differentiability', 'Derivative of composite functions, chain rule, exponential and logarithmic functions.', 1, true),
        (unit_calc_id, 'Applications of Derivatives', 'Rate of change of quantities, increasing/decreasing functions, tangents and normals, maxima and minima.', 2, true),
        (unit_calc_id, 'Integrals & Differential Equations', 'Integration as inverse process of differentiation, definite integrals, solving linear differential equations.', 3, true)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Seed Units for Physics
    IF phys_id IS NOT NULL THEN
      INSERT INTO public.syllabus_units (id, subject_id, title, description, unit_number, display_order, is_active)
      VALUES
        (unit_elec_id, phys_id, 'Electrostatics & Current Electricity', 'Electric charges and fields, electrostatic potential and capacitance, electric current and circuits.', 1, 1, true),
        (unit_optics_id, phys_id, 'Optics & Modern Physics', 'Ray optics, wave optics, dual nature of radiation and matter, atoms and nuclei.', 2, 2, true)
      ON CONFLICT DO NOTHING;

      -- Seed Topics for Unit 1
      INSERT INTO public.topics (unit_id, title, description, display_order, is_active)
      VALUES
        (unit_elec_id, 'Electric Charges and Fields', 'Coulomb law, electric field lines, electric dipole, Gauss theorem and its applications.', 1, true),
        (unit_elec_id, 'Electrostatic Potential and Capacitance', 'Potential difference, capacitors in series and parallel, energy stored in capacitor.', 2, true),
        (unit_elec_id, 'Current Electricity and Circuits', 'Ohms law, Kirchhoff rules, Wheatstone bridge, meter bridge, and potentiometer principles.', 3, true)
      ON CONFLICT DO NOTHING;
    END IF;

  END IF;
END $$;

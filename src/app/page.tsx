'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { SearchPreferenceSection } from '@/components/home/search-preference';
import { ClassSelectorSection } from '@/components/home/class-selector';
import { TuitionExperienceSection } from '@/components/home/tuition-experience';
import { HowItWorksSection } from '@/components/home/how-it-works';
import { ParentExperienceSection } from '@/components/home/parent-experience';
import { StudentExperienceSection } from '@/components/home/student-experience';
import { ReviewsSection } from '@/components/home/reviews-section';
import { FinalCTASection } from '@/components/home/final-cta';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors selection:bg-primary-200 selection:text-primary-950">
      {/* PHASE 2A — PUBLIC HEADER */}
      <Header />

      <main className="flex-1">
        {/* PHASE 2B — DYNAMIC HERO BANNER (Hides completely if 0 active banners in Supabase) */}
        <HeroCarousel />

        {/* PHASE 2C & 2D — SEARCH & 5-QUESTION PREFERENCE QUESTIONNAIRE */}
        <SearchPreferenceSection />

        {/* PHASE 2E & 2F — SUPABASE-DRIVEN CLASS SELECTOR & CONNECTED PROGRAMS SECTION */}
        <ClassSelectorSection />

        {/* PHASE 2G — TUITION EXPERIENCE ("Everything great tuition needs") */}
        <TuitionExperienceSection />

        {/* PHASE 2H — HOW IT WORKS (01 Choose, 02 Learn, 03 Practice, 04 Grow) */}
        <HowItWorksSection />

        {/* PHASE 2I — PARENT EXPERIENCE ("Know how your child is doing") */}
        <ParentExperienceSection />

        {/* PHASE 2J — STUDENT EXPERIENCE (Lessons, Doubts, Homework, Tests, Growth) */}
        <StudentExperienceSection />

        {/* PHASE 2K — REVIEWS & COMMUNITY FEEDBACK (Verified Development Placeholder) */}
        <ReviewsSection />

        {/* PHASE 2L — FINAL CALL TO ACTION */}
        <FinalCTASection />
      </main>

      {/* PHASE 2M — PROFESSIONAL FOOTER (No Public Admin Links) */}
      <Footer />
    </div>
  );
}

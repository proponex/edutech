'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSplitSection } from '@/components/home/hero-split-section';
import { HowItWorksSection } from '@/components/home/how-it-works-section';
import { StudentExperiencesSection } from '@/components/home/student-experiences-section';
import { FeaturesSection } from '@/components/home/features-section';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6FF] text-[#1E1035] selection:bg-[#EEE8FF] selection:text-[#3D1E6D] public-landing">
      {/* 1. NAVIGATION HEADER */}
      <Header />

      <main className="flex-1">
        {/* 2. HERO: PROMOTIONAL BANNER (LEFT) + LOGIN PANEL (RIGHT) */}
        <HeroSplitSection />

        {/* 3. HOW IT WORKS (4 CLEAR STEPS) */}
        <HowItWorksSection />

        {/* 4. STUDENT EXPERIENCES (AUTHENTIC STORIES & OUTCOMES) */}
        <StudentExperiencesSection />

        {/* 5. FEATURES (SUPPORTED PLATFORM CAPABILITIES IN EDITORIAL BENTO GRID) */}
        <FeaturesSection />
      </main>

      {/* 6. FOOTER */}
      <Footer />
    </div>
  );
}

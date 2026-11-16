'use client';

import React from 'react';
import { Footer } from '@/components/layout/footer';
import { HeroSplitSection } from '@/components/home/hero-split-section';
import { HowItWorksSection } from '@/components/home/how-it-works-section';
import { FeaturesSection } from '@/components/home/features-section';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6FF] text-[#1E1035] selection:bg-[#EEE8FF] selection:text-[#3D1E6D] public-landing">
      <main className="flex-1">
        {/* 1. HERO: PROMOTIONAL BANNER (LEFT) + LOGIN PANEL (RIGHT) */}
        <HeroSplitSection />

        {/* 2. HOW IT WORKS (4 CLEAR STEPS) */}
        <HowItWorksSection />

        {/* 3. FEATURES (SUPPORTED PLATFORM CAPABILITIES IN EDITORIAL BENTO GRID) */}
        <FeaturesSection />
      </main>

      {/* 4. FOOTER */}
      <Footer />
    </div>
  );
}

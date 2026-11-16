'use client';

import React from 'react';
import Image from 'next/image';
import { UserPlus, Compass, Video, TrendingUp } from 'lucide-react';

const ASSETS = {
  floatingBook: '/images/hero_books_transparent.png',
};

const STEPS = [
  {
    number: '01',
    title: 'Create Your Account',
    description:
      'Sign up as a student, parent, or teacher in under two minutes. Set your class, board preference, and subject interests — and your personalised dashboard is ready.',
    icon: UserPlus,
  },
  {
    number: '02',
    title: 'Explore Your Subjects',
    description:
      'Browse your complete school syllabus chapter by chapter. Find exactly what you need — whether that\'s a single formula, a full unit, or an entire subject revision.',
    icon: Compass,
  },
  {
    number: '03',
    title: 'Watch & Learn at Your Pace',
    description:
      'Follow expert teacher explanations in crystal-clear video lessons. Rewatch any section, adjust playback speed, and take your time until every concept clicks.',
    icon: Video,
  },
  {
    number: '04',
    title: 'Track Growth & Progress',
    description:
      'Attempt chapter quizzes to test your understanding. See your scores, identify weak areas, and let parents stay informed — all automatically updated in real time.',
    icon: TrendingUp,
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-[#F8F6FF] via-[#FAF8FF] to-[#F8F6FF] relative overflow-hidden text-[#1E1035]" id="how-it-works">
      {/* Ambient background grid */}
      <div className="absolute inset-0 pattern-grid pointer-events-none opacity-30" />

      {/* Atmospheric Glowing Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#DCCFFF]/60 rounded-full blur-3xl opacity-50 pointer-events-none -z-10 animate-glow-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-[#EEE8FF]/70 rounded-full blur-3xl opacity-60 pointer-events-none -z-10" />

      {/* =============================================================== */}
      {/* MULTIPLE DARK VIOLET WAVES BESIDE THE CARDS (LEFT & RIGHT FLANKS) */}
      {/* =============================================================== */}

      {/* Left Flank: Multiple Layered Dark Violet Waves */}
      <div className="absolute left-0 top-0 bottom-0 w-44 sm:w-64 lg:w-80 pointer-events-none select-none overflow-hidden z-10 opacity-85">
        <svg
          className="h-full w-full animate-wave-flow"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 320 800"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Deep Dark Violet Base Wave */}
          <path
            d="M-80 0 C140 180 -40 380 160 520 C240 600 80 720 -80 800 Z"
            fill="#1E1035"
            fillOpacity="0.45"
          />
          {/* Rich Violet Middle Wave */}
          <path
            d="M-100 0 C120 120 20 280 180 440 C280 540 100 700 -100 800 Z"
            fill="#2A174E"
            fillOpacity="0.65"
            className="animate-wave-flow-slow"
          />
          {/* Accent Purple Crest Wave */}
          <path
            d="M-120 0 C80 160 -20 320 120 480 C200 580 40 720 -120 800 Z"
            fill="#3D1E6D"
            fillOpacity="0.8"
            className="animate-wave-flow-reverse"
          />
          {/* Bright Violet Highlight Ribbon */}
          <path
            d="M-140 0 C60 200 -30 360 80 520 C140 620 10 740 -140 800 Z"
            fill="#6244A6"
            fillOpacity="0.9"
          />
        </svg>
      </div>

      {/* Right Flank: Multiple Layered Dark Violet Waves */}
      <div className="absolute right-0 top-0 bottom-0 w-44 sm:w-64 lg:w-80 pointer-events-none select-none overflow-hidden z-10 opacity-85">
        <svg
          className="h-full w-full animate-wave-flow-reverse"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 320 800"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Deep Dark Violet Base Wave */}
          <path
            d="M400 0 C180 180 360 380 160 520 C80 600 240 720 400 800 Z"
            fill="#1E1035"
            fillOpacity="0.45"
          />
          {/* Rich Violet Middle Wave */}
          <path
            d="M420 0 C200 120 300 280 140 440 C40 540 220 700 420 800 Z"
            fill="#2A174E"
            fillOpacity="0.65"
            className="animate-wave-flow-slow"
          />
          {/* Accent Purple Crest Wave */}
          <path
            d="M440 0 C240 160 340 320 200 480 C120 580 280 720 440 800 Z"
            fill="#3D1E6D"
            fillOpacity="0.8"
            className="animate-wave-flow"
          />
          {/* Bright Violet Highlight Ribbon */}
          <path
            d="M460 0 C260 200 350 360 240 520 C180 620 310 740 460 800 Z"
            fill="#6244A6"
            fillOpacity="0.9"
          />
        </svg>
      </div>

      {/* Floating 3D Accent Books */}
      <div className="absolute top-12 right-12 w-20 aspect-square opacity-70 pointer-events-none select-none hidden xl:block animate-float-slow z-20">
        <Image
          src={ASSETS.floatingBook}
          alt="Floating Book Decor"
          fill
          sizes="80px"
          className="object-contain drop-shadow-2xl"
          unoptimized
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#3D1E6D] text-xs font-black border border-[#DCCFFF] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#6244A6] animate-ping" />
            <span>HOW IT WORKS</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-[#1E1035] tracking-tight">
            Your Path to Academic Success
          </h2>
          <p className="text-base sm:text-lg text-[#5F5875] leading-relaxed font-normal">
            Four simple steps from signing up to achieving the results you&apos;ve been working toward.
          </p>
        </div>

        {/* 4 Elevated Clean Cards with High Contrast on Light Ground */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative z-20">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative rounded-3xl bg-white/95 backdrop-blur-md border border-[#DCCFFF] hover:border-[#6244A6] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl shadow-violet-950/5 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-900/15"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display text-4xl font-black bg-gradient-to-r from-[#3D1E6D] to-[#6244A6] bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                      {step.number}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] flex items-center justify-center text-[#3D1E6D] shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:bg-[#3D1E6D] group-hover:text-white">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="font-display text-xl font-extrabold text-[#1E1035] tracking-tight mb-3">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[#5F5875] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Bottom Divider into Features with Flowing Wave Motion */}
      <div className="w-full pointer-events-none select-none -mb-1 mt-16 lg:mt-24 overflow-hidden">
        <svg
          className="w-[105%] -ml-[2.5%] h-14 sm:h-20 lg:h-24"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 1440 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,30 C360,90 720,0 1080,60 C1260,90 1380,40 1440,50 L1440,100 L0,100 Z"
            fill="#EEE8FF"
            fillOpacity="0.75"
            className="animate-wave-flow"
          />
          <path
            d="M0,45 C280,10 600,80 920,40 C1200,5 1360,60 1440,50 L1440,100 L0,100 Z"
            fill="#DCCFFF"
            fillOpacity="0.6"
            className="animate-wave-flow-reverse"
          />
          <path
            d="M0,60 C400,20 800,80 1200,40 C1320,30 1400,50 1440,55 L1440,100 L0,100 Z"
            fill="#FFFFFF"
            className="animate-wave-flow-slow"
          />
        </svg>
      </div>
    </section>
  );
}

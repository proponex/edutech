'use client';

import React from 'react';
import Image from 'next/image';
import { UserPlus, Compass, Video, TrendingUp, CheckCircle2 } from 'lucide-react';

const ASSETS = {
  journeyBg:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDw7EVrhLkDo5Q28M2naiK0pKMjGwbjWx_3vGW_9xXYSelLGyNY_TYbkRSZo80KJQQGxWftUJLG0TVJyqQdrP8M2w75stWVBACXBVOSX48NQtPLr9NpnObgGGIsczznIS2EltThYJ4pEsyWNijhLv0lOB3rg_kpzoKfx_i0ogZIeBHjOHuo3uYEezkynt4pKwuvA6v36utintihu5N8ujxnv6sIaQW13eGyceLO7l4',
  floatingBook: '/images/hero_books_transparent.png',
};

const STEPS = [
  {
    number: '01',
    title: 'Create Your Account',
    description:
      'Sign up as a student, parent, or teacher in under two minutes. Set your class, board preference, and subject interests — and your personalised dashboard is ready.',
    highlight: 'Quick Role-Based Setup',
    icon: UserPlus,
  },
  {
    number: '02',
    title: 'Explore Your Subjects',
    description:
      'Browse your complete school syllabus chapter by chapter. Find exactly what you need — whether that\'s a single formula, a full unit, or an entire subject revision.',
    highlight: 'Full K–12 Syllabus',
    icon: Compass,
  },
  {
    number: '03',
    title: 'Watch & Learn at Your Pace',
    description:
      'Follow expert teacher explanations in crystal-clear video lessons. Rewatch any section, adjust playback speed, and take your time until every concept clicks.',
    highlight: 'HD Video Lessons',
    icon: Video,
  },
  {
    number: '04',
    title: 'Track Growth & Progress',
    description:
      'Attempt chapter quizzes to test your understanding. See your scores, identify weak areas, and let parents stay informed — all automatically updated in real time.',
    highlight: 'Real-Time Progress Insights',
    icon: TrendingUp,
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#180C2E] relative overflow-hidden text-white" id="how-it-works">
      {/* Rich 3D Stepping Stone Educational Journey Background Layer (IMAGE_11) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden mix-blend-screen opacity-45">
        <Image
          src={ASSETS.journeyBg}
          alt="3D Educational Stepping Stones Journey Texture"
          fill
          className="object-cover object-center scale-105"
          unoptimized
        />
      </div>

      {/* Radial Violet Dark Atmosphere & Constellation Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#180C2E]/90 via-[#221040]/75 to-[#180C2E]/95 pointer-events-none" />

      {/* Geometric SVG Pathway / Constellation Graphic with Active Dash & Node Animations */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-40">
        <svg className="w-full h-full" fill="none" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M100 200 L350 280 L650 240 L950 320 L1100 250"
            stroke="#BBA5F0"
            strokeDasharray="6 6"
            strokeWidth="2"
            className="animate-dash-flow"
          />
          <path
            d="M150 550 L420 480 L750 560 L1050 490"
            stroke="#8060CE"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            className="animate-dash-flow"
          />
          <circle cx="100" cy="200" fill="#A485E8" r="5" className="animate-node-glow" />
          <circle cx="350" cy="280" fill="#A485E8" r="6" className="animate-node-glow [animation-delay:600ms]" />
          <circle cx="650" cy="240" fill="#A485E8" r="5" className="animate-node-glow [animation-delay:1200ms]" />
          <circle cx="950" cy="320" fill="#A485E8" r="7" className="animate-node-glow [animation-delay:1800ms]" />
          <circle cx="1100" cy="250" fill="#A485E8" r="5" className="animate-node-glow [animation-delay:2400ms]" />
        </svg>
      </div>

      {/* Floating Accent Book Decor with 100% Transparent Background */}
      <div className="absolute top-10 right-10 w-24 opacity-60 pointer-events-none select-none hidden lg:block animate-float-slow">
        <Image
          src={ASSETS.floatingBook}
          alt="Floating Book Decor"
          width={100}
          height={100}
          className="w-full drop-shadow-2xl"
          unoptimized
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#DCCFFF] text-xs font-bold border border-violet-400/30 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#BBA5F0] animate-ping" />
            <span>HOW IT WORKS</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Your Path to Academic Success
          </h2>
          <p className="text-base sm:text-lg text-violet-200/80 leading-relaxed font-normal">
            Four simple steps from signing up to achieving the results you&apos;ve been working toward.
          </p>
        </div>

        {/* 4 Elevated Glass Cards Above Background Pattern */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative rounded-3xl bg-white/95 backdrop-blur-xl border border-violet-300/40 hover:border-violet-300 p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl shadow-black/30 hover:-translate-y-2 hover:shadow-violet-500/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display text-4xl font-black bg-gradient-to-r from-[#3D1E6D] to-[#6244A6] bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                      {step.number}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] flex items-center justify-center text-[#3D1E6D] shadow-sm transition-all duration-300 group-hover:scale-110">
                      <Icon className="w-5 h-5 text-[#3D1E6D]" />
                    </div>
                  </div>

                  <h3 className="font-display text-xl font-extrabold text-[#1E1035] tracking-tight mb-3">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[#5F5875] leading-relaxed mb-6">
                    {step.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#DCCFFF]/80 flex items-center gap-2 text-xs font-bold text-[#3D1E6D]">
                  <CheckCircle2 className="w-4 h-4 text-[#6244A6] shrink-0" />
                  <span>{step.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Bottom Divider into Lavender with Flowing Wave Motion */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none select-none overflow-hidden">
        <svg
          className="w-[105%] -ml-[2.5%] h-14 sm:h-20 lg:h-24"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 1440 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,30 C360,90 720,0 1080,60 C1260,90 1380,40 1440,50 L1440,100 L0,100 Z"
            fill="#2A174E"
            fillOpacity="0.6"
            className="animate-wave-flow"
          />
          <path
            d="M0,45 C280,10 600,80 920,40 C1200,5 1360,60 1440,50 L1440,100 L0,100 Z"
            fill="#DCCFFF"
            fillOpacity="0.5"
            className="animate-wave-flow-reverse"
          />
          <path
            d="M0,60 C400,20 800,80 1200,40 C1320,30 1400,50 1440,55 L1440,100 L0,100 Z"
            fill="#F8F6FF"
            className="animate-wave-flow-slow"
          />
        </svg>
      </div>
    </section>
  );
}

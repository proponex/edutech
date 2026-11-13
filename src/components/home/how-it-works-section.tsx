'use client';

import React from 'react';
import { UserPlus, Compass, Video, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface StepItem {
  number: string;
  title: string;
  description: string;
  highlight: string;
  icon: React.ElementType;
}

const STEPS: StepItem[] = [
  {
    number: '01',
    title: 'Create Account',
    description:
      'Sign up as a student, parent, or teacher in seconds. Set your grade level, target board (CBSE, ICSE, or State), and subject preferences.',
    highlight: 'Instant Role-Based Setup',
    icon: UserPlus,
  },
  {
    number: '02',
    title: 'Explore Learning',
    description:
      'Browse chapter-wise learning tracks, comprehensive syllabi, and curated subject channels tailored to your exact school syllabus.',
    highlight: 'Structured K–12 Syllabi',
    icon: Compass,
  },
  {
    number: '03',
    title: 'Learn from Expert Teachers',
    description:
      'Stream crystal-clear HD video lessons powered by Mux, participate in interactive live sessions, and submit questions for teacher feedback.',
    highlight: 'Mux-Powered HD Classrooms',
    icon: Video,
  },
  {
    number: '04',
    title: 'Track Your Progress',
    description:
      'Attempt chapter practice quizzes, review granular performance metrics, and stay aligned with dedicated real-time parent monitoring.',
    highlight: 'Real-time Analytics & Growth',
    icon: TrendingUp,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white border-y border-[#DCCFFF]/60 relative overflow-hidden">
      {/* Decorative background lavender tint */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#F8F6FF] rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEE8FF] text-[#6244A6] text-xs font-bold border border-[#DCCFFF]">
            <span>STRUCTURED METHODOLOGY</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#282238] tracking-tight">
            How EduTech Powers Your Success
          </h2>
          <p className="text-base sm:text-lg text-[#5F5875] leading-relaxed">
            A proven, four-step digital tuition workflow engineered to take students from foundational comprehension to confident board exam mastery.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative rounded-2xl bg-[#F8F6FF]/70 hover:bg-white border border-[#DCCFFF]/80 p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-violet-950/5 hover:-translate-y-1"
              >
                {/* Step Header: Number & Icon */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display text-3xl font-extrabold text-[#BBA5F0] group-hover:text-[#6244A6] transition-colors">
                      {step.number}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-white group-hover:bg-[#EEE8FF] border border-[#DCCFFF] flex items-center justify-center text-[#6244A6] shadow-2xs transition-colors">
                      <Icon className="w-5 h-5 text-[#6244A6]" />
                    </div>
                  </div>

                  <h3 className="font-display text-xl font-bold text-[#282238] tracking-tight mb-3">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[#5F5875] leading-relaxed mb-6">
                    {step.description}
                  </p>
                </div>

                {/* Highlight Tag */}
                <div className="pt-4 border-t border-[#DCCFFF]/60 flex items-center gap-2 text-xs font-semibold text-[#6244A6]">
                  <CheckCircle2 className="w-4 h-4 text-[#8060CE] shrink-0" />
                  <span>{step.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Action Note */}
        <div className="mt-14 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#6244A6] hover:text-[#8060CE] transition-colors group"
          >
            <span>Ready to start? Join thousands of students today</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}


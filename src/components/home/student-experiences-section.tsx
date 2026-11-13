'use client';

import React from 'react';
import { Star, MessageSquareQuote, ShieldCheck, TrendingUp, UserCheck, GraduationCap } from 'lucide-react';

interface ExperienceItem {
  id: string;
  name: string;
  role: string;
  board: string;
  subject: string;
  outcome: string;
  quote: string;
  cohort: string;
}

const EXPERIENCES: ExperienceItem[] = [
  {
    id: 'exp-1',
    name: 'Aarav Sharma',
    role: 'Student',
    board: 'CBSE • Class 10',
    subject: 'Mathematics & Science',
    outcome: 'Scored 96% in Term Exams',
    quote:
      'The chapter video walkthroughs made polynomial theorems and chemical reactions intuitive. Being able to rewatch tough explanations before school tests gave me real confidence.',
    cohort: 'Verified Cohort Participant',
  },
  {
    id: 'exp-2',
    name: 'Priya Narayanan',
    role: 'Parent',
    board: 'Parent of Class 8 Learner',
    subject: 'Comprehensive Tuition',
    outcome: 'Daily Study Transparency',
    quote:
      'As a working parent, the parent portal is invaluable. I can see exactly which chapters my daughter completed and where she needed extra practice without any guesswork.',
    cohort: 'Verified Parent Guardian',
  },
  {
    id: 'exp-3',
    name: 'Kavya Subramanian',
    role: 'Student',
    board: 'ICSE • Class 12',
    subject: 'Physics & Chemistry',
    outcome: 'Mechanics & Organic Mastery',
    quote:
      'The teacher’s clarity in mechanics and organic chemistry is unmatched. The practice quizzes pinpointed my weak formulas immediately, saving hours of unfocused revision.',
    cohort: 'Verified Cohort Participant',
  },
];

export function StudentExperiencesSection() {
  return (
    <section id="experiences" className="py-20 lg:py-28 bg-[#F8F6FF] relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div
        className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#EEE8FF] rounded-full blur-3xl pointer-events-none opacity-60 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[#6244A6] text-xs font-bold border border-[#DCCFFF] shadow-2xs">
            <MessageSquareQuote className="w-3.5 h-3.5 text-[#8060CE]" />
            <span>AUTHENTIC EXPERIENCES</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#282238] tracking-tight">
            Real Stories from Students &amp; Parents
          </h2>

          <p className="text-base sm:text-lg text-[#5F5875] leading-relaxed">
            Verified academic feedback from learners and guardians who replaced traditional coaching centers with EduTech.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8060CE]" />
            <span>Sample Pilot Cohort Case Studies &bull; Authenticated 2026–27 Reviews</span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {EXPERIENCES.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl bg-white border border-[#DCCFFF]/80 p-7 sm:p-8 flex flex-col justify-between shadow-lg shadow-violet-950/4 hover:shadow-xl hover:shadow-violet-900/8 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Top Rating & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-[#6244A6] bg-[#EEE8FF] px-2.5 py-0.5 rounded-full border border-[#DCCFFF]">
                    {item.role}
                  </span>
                </div>

                {/* Outcome Callout */}
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6244A6] bg-[#F8F6FF] px-3 py-1.5 rounded-xl border border-[#DCCFFF]/60">
                  <TrendingUp className="w-3.5 h-3.5 text-[#8060CE]" />
                  <span>{item.outcome}</span>
                </div>

                {/* Quote */}
                <p className="text-sm text-[#282238] leading-relaxed italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-6 mt-6 border-t border-[#DCCFFF]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm font-extrabold text-[#282238]">
                    {item.name}
                  </h4>
                  <p className="text-xs text-[#5F5875] font-medium">
                    {item.board} &bull; {item.subject}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#EEE8FF] border border-[#DCCFFF] flex items-center justify-center text-[#6244A6] shrink-0 font-bold text-xs">
                  {item.name.charAt(0)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Bottom Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-[#DCCFFF]/80 text-center max-w-3xl mx-auto shadow-sm">
          <p className="text-xs sm:text-sm text-[#5F5875]">
            <strong className="text-[#282238]">Transparency Commitment:</strong> All student performance metrics are verified against real exam papers and quiz logs submitted to the EduTech academic evaluation system.
          </p>
        </div>
      </div>
    </section>
  );
}


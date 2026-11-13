'use client';

import React from 'react';
import {
  Video,
  BookOpen,
  Award,
  BarChart3,
  Users2,
  FileCheck2,
  Layers,
  Sparkles,
  Play,
  Clock,
  Shield,
  CheckCircle,
} from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-white relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div
        className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#F8F6FF] rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEE8FF] text-[#6244A6] text-xs font-bold border border-[#DCCFFF]">
            <Sparkles className="w-3.5 h-3.5 text-[#8060CE]" />
            <span>PLATFORM CAPABILITIES</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#282238] tracking-tight">
            Engineered for Modern Academic Mastery
          </h2>

          <p className="text-base sm:text-lg text-[#5F5875] leading-relaxed">
            Every feature on EduTech is built specifically around the K–12 learning lifecycle — from video comprehension to parent oversight.
          </p>
        </div>

        {/* Editorial Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* ================================================================= */}
          {/* FEATURE 1: MUX HD VIDEO LESSONS (LARGE FEATURE CARD - 8 COLS)     */}
          {/* ================================================================= */}
          <div className="md:col-span-12 lg:col-span-8 rounded-3xl bg-gradient-to-br from-[#F8F6FF] to-[#EEE8FF]/50 border border-[#DCCFFF]/80 p-8 sm:p-10 flex flex-col justify-between shadow-lg shadow-violet-950/4 relative overflow-hidden group">
            <div className="space-y-4 max-w-xl mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center shadow-2xs">
                <Video className="w-6 h-6 text-[#6244A6]" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#282238] tracking-tight">
                Studio-Quality Video Lessons with Mux
              </h3>
              <p className="text-sm sm:text-base text-[#5F5875] leading-relaxed">
                Stream chapter breakdowns with ultra-low latency, crystal-clear 1080p resolution, adjustable playback speeds, and bookmarking designed for deep revision.
              </p>
            </div>

            {/* Visual Classroom Lesson Player Mock */}
            <div className="rounded-2xl bg-white border border-[#DCCFFF] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCCFFF]/50 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#282238]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Class 10 CBSE • Quadratic Equations &amp; Polynomials</span>
                </div>
                <span className="text-[11px] font-semibold text-[#6244A6] bg-[#EEE8FF] px-2.5 py-0.5 rounded-full">
                  HD Lesson
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#5F5875]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#8060CE]" />
                    38 mins
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-[#8060CE]" />
                    Chapter 4
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#F8F6FF] border border-[#DCCFFF] text-[11px] font-bold text-[#6244A6]">
                    1.25x Speed
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F8F6FF] border border-[#DCCFFF] text-[11px] font-bold text-[#6244A6]">
                    1080p Mux
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* FEATURE 2: PARENT MONITORING PORTAL (4 COLS)                      */}
          {/* ================================================================= */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF]/80 p-8 flex flex-col justify-between shadow-lg shadow-violet-950/4 relative overflow-hidden group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center shadow-2xs">
                <BarChart3 className="w-6 h-6 text-[#6244A6]" />
              </div>
              <h3 className="font-display text-2xl font-extrabold text-[#282238] tracking-tight">
                Dedicated Parent Oversight
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                Parents get complete transparency. Monitor completed video hours, homework submissions, and quiz percentiles from any device.
              </p>
            </div>

            {/* Parent Mini Metric Mock */}
            <div className="mt-8 p-4 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF]/70 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#282238]">
                <span>Weekly Study Target</span>
                <span className="text-[#6244A6]">92% Achieved</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#EEE8FF] overflow-hidden">
                <div className="w-[92%] h-full bg-[#6244A6] rounded-full" />
              </div>
              <p className="text-[11px] text-[#5F5875]">
                6 of 7 chapter quizzes completed this week with high accuracy.
              </p>
            </div>
          </div>

          {/* ================================================================= */}
          {/* FEATURE 3: K-12 BOARD TAXONOMY (4 COLS)                           */}
          {/* ================================================================= */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF]/80 p-8 flex flex-col justify-between shadow-lg shadow-violet-950/4 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center shadow-2xs">
                <Layers className="w-6 h-6 text-[#6244A6]" />
              </div>
              <h3 className="font-display text-2xl font-extrabold text-[#282238] tracking-tight">
                Complete K–12 Boards
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                Structured taxonomies covering Kindergarten through Class 12. Full alignment with CBSE, ICSE, and State Board standards.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#6244A6]">
                CBSE Curriculum
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#6244A6]">
                ICSE Board
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#6244A6]">
                State Syllabus
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#6244A6]">
                Board Coaching
              </span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* FEATURE 4: EXPERT VERIFIED EDUCATORS (4 COLS)                     */}
          {/* ================================================================= */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF]/80 p-8 flex flex-col justify-between shadow-lg shadow-violet-950/4 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center shadow-2xs">
                <Users2 className="w-6 h-6 text-[#6244A6]" />
              </div>
              <h3 className="font-display text-2xl font-extrabold text-[#282238] tracking-tight">
                Vetted Subject Specialists
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                Learn from verified teachers with proven board exam coaching records. Direct guidance, personal feedback, and mentoring.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3 p-3 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF]/60">
              <div className="w-8 h-8 rounded-full bg-[#6244A6] text-white flex items-center justify-center text-xs font-bold shrink-0">
                ✓
              </div>
              <span className="text-xs font-semibold text-[#282238]">
                100% Background-Checked Academic Faculty
              </span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* FEATURE 5: PRACTICE DRILLS & QUIZZES (4 COLS)                     */}
          {/* ================================================================= */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF]/80 p-8 flex flex-col justify-between shadow-lg shadow-violet-950/4 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center shadow-2xs">
                <FileCheck2 className="w-6 h-6 text-[#6244A6]" />
              </div>
              <h3 className="font-display text-2xl font-extrabold text-[#282238] tracking-tight">
                Chapter Practice Quizzes
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                Reinforce every lesson with instant objective quizzes, timed test series, and comprehensive formula revision notes.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#6244A6] bg-[#EEE8FF] px-4 py-2.5 rounded-xl border border-[#DCCFFF]">
              <span>Instant Scoring &amp; Review</span>
              <Award className="w-4 h-4 text-[#8060CE]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


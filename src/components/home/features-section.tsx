'use client';

import React from 'react';
import Image from 'next/image';
import {
  Video,
  BarChart3,
  Layers,
  Users2,
  FileCheck2,
  Sparkles,
  Clock,
  BookOpen,
  Award,
} from 'lucide-react';

const ASSETS = {
  hdVideoLesson: '/images/hd_video_lesson_transparent.png',
  stackedBooksMini: '/images/hero_books_transparent.png',
};

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28 bg-white relative overflow-hidden" id="features">
      {/* Subtle Organic Lilac Topographical Pattern Background */}
      <div className="absolute inset-0 pattern-topographic pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEE8FF] text-[#3D1E6D] text-xs font-black border border-[#DCCFFF] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#6244A6]" />
            <span>EVERYTHING YOU NEED</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-[#1E1035] tracking-tight">
            Built for Students, Parents &amp; Teachers
          </h2>
          <p className="text-base sm:text-lg text-[#5F5875] leading-relaxed font-normal">
            Every feature is designed around the real needs of K–12 learners — from watching lessons and practising quizzes to parents tracking progress at a glance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* Feature Card 1: HD Video Lessons with 3D Realistic Study Illustration */}
          <div className="md:col-span-12 lg:col-span-8 rounded-3xl bg-gradient-to-br from-[#F8F6FF] via-[#FAF8FF] to-[#EEE8FF] border border-[#DCCFFF] hover:border-[#6244A6] p-8 sm:p-10 flex flex-col justify-between shadow-xl shadow-violet-950/5 hover:shadow-2xl hover:shadow-violet-900/15 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center mb-8">
              <div className="sm:col-span-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <Video className="w-6 h-6 text-[#3D1E6D]" />
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-[#1E1035] tracking-tight">
                  Crystal-Clear HD Video Lessons
                </h3>
                <p className="text-sm sm:text-base text-[#5F5875] leading-relaxed">
                  Watch chapter-wise video lessons in stunning HD clarity. Pause, rewind, and replay at your own pace — with adjustable speed for focused revision before every exam.
                </p>
              </div>

              {/* 3D HD Video Lesson Illustration with 100% Transparent Background */}
              <div className="sm:col-span-4 flex justify-center">
                <div className="relative w-48 sm:w-56 aspect-[680/497] group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={ASSETS.hdVideoLesson}
                    alt="3D Educational HD Video Lesson Tablet with Play Controls and Formulas"
                    fill
                    sizes="(max-width: 640px) 192px, 224px"
                    className="object-contain drop-shadow-xl filter contrast-[1.02]"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Interactive Mock Video Player Pill */}
            <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-[#DCCFFF] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCCFFF]/60 text-xs">
                <div className="flex items-center gap-2 font-black text-[#1E1035]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6244A6] animate-pulse" />
                  <span>Class 10 CBSE · Quadratic Equations &amp; Polynomials</span>
                </div>
                <span className="text-[11px] font-bold text-[#3D1E6D] bg-[#EEE8FF] px-3 py-0.5 rounded-full">
                  HD Lesson
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#5F5875]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-semibold text-[#1E1035]">
                    <Clock className="w-3.5 h-3.5 text-[#6244A6]" />
                    38 mins
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-[#1E1035]">
                    <BookOpen className="w-3.5 h-3.5 text-[#6244A6]" />
                    Chapter 4
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F8F6FF] border border-[#DCCFFF] text-[11px] font-bold text-[#3D1E6D]">
                    1.25× Speed
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#F8F6FF] border border-[#DCCFFF] text-[11px] font-bold text-[#3D1E6D]">
                    Crystal HD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Card 2: Dedicated Parent Dashboard */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF] hover:border-[#6244A6] p-8 flex flex-col justify-between shadow-xl shadow-violet-950/5 hover:shadow-2xl hover:shadow-violet-900/15 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110">
                <BarChart3 className="w-6 h-6 text-[#3D1E6D]" />
              </div>
              <h3 className="font-display text-2xl font-black text-[#1E1035] tracking-tight">
                Dedicated Parent Dashboard
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                Stay completely in the loop. See which chapters your child completed, how they scored on quizzes, and where they need extra support — all from one place.
              </p>
            </div>
            <div className="mt-8 p-4 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#1E1035]">
                <span>Weekly Study Target</span>
                <span className="text-[#3D1E6D] font-extrabold">92% Achieved</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#EEE8FF] overflow-hidden">
                <div className="w-[92%] h-full bg-gradient-to-r from-[#2A174E] to-[#6244A6] rounded-full" />
              </div>
              <p className="text-[11px] text-[#5F5875] font-medium">
                6 of 7 chapter quizzes completed this week with high accuracy.
              </p>
            </div>
          </div>

          {/* Feature Card 3: Full School Curriculum Coverage with 3D Stack Accent (IMAGE_6) */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF] hover:border-[#6244A6] p-8 flex flex-col justify-between shadow-xl shadow-violet-950/5 hover:shadow-2xl hover:shadow-violet-900/15 hover:-translate-y-1 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110">
                  <Layers className="w-6 h-6 text-[#3D1E6D]" />
                </div>
                <div className="relative w-14 h-14 aspect-square transition-transform duration-300 group-hover:scale-110">
                  <Image
                    src={ASSETS.stackedBooksMini}
                    alt="Stacked 3D colorful books"
                    fill
                    sizes="56px"
                    className="object-contain filter drop-shadow-md"
                    unoptimized
                  />
                </div>
              </div>
              <h3 className="font-display text-2xl font-black text-[#1E1035] tracking-tight">
                Full School Curriculum Coverage
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                All subjects, all classes — from foundational concepts to board-exam mastery. Full alignment with CBSE, ICSE, and State Board syllabi.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#3D1E6D]">CBSE</span>
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#3D1E6D]">ICSE</span>
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#3D1E6D]">State Board</span>
              <span className="px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-bold text-[#3D1E6D]">Board Coaching</span>
            </div>
          </div>

          {/* Feature Card 4: Qualified Subject Teachers */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF] hover:border-[#6244A6] p-8 flex flex-col justify-between shadow-xl shadow-violet-950/5 hover:shadow-2xl hover:shadow-violet-900/15 hover:-translate-y-1 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110">
                <Users2 className="w-6 h-6 text-[#3D1E6D]" />
              </div>
              <h3 className="font-display text-2xl font-black text-[#1E1035] tracking-tight">
                Qualified Subject Teachers
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                Learn from verified teachers with proven track records in board exam preparation. Direct guidance, personal feedback, and subject mentoring built in.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3 p-3.5 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF]/80">
              <div className="w-8 h-8 rounded-full bg-[#3D1E6D] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                ✓
              </div>
              <span className="text-xs font-bold text-[#1E1035]">
                100% Background-Checked Academic Faculty
              </span>
            </div>
          </div>

          {/* Feature Card 5: Practice & Test Yourself */}
          <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#DCCFFF] hover:border-[#6244A6] p-8 flex flex-col justify-between shadow-xl shadow-violet-950/5 hover:shadow-2xl hover:shadow-violet-900/15 hover:-translate-y-1 transition-all duration-300 group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110">
                <FileCheck2 className="w-6 h-6 text-[#3D1E6D]" />
              </div>
              <h3 className="font-display text-2xl font-black text-[#1E1035] tracking-tight">
                Practice &amp; Test Yourself
              </h3>
              <p className="text-sm text-[#5F5875] leading-relaxed">
                Reinforce every lesson with chapter quizzes, timed test series, and formula revision cards — with instant scoring to know exactly where you stand.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#3D1E6D] bg-[#EEE8FF] px-4 py-3 rounded-xl border border-[#DCCFFF]">
              <span>Instant Scoring &amp; Review</span>
              <Award className="w-4 h-4 text-[#6244A6]" />
            </div>
          </div>
        </div>
      </div>

      {/* Section Bottom Divider into Dark Footer with Flowing Wave Motion */}
      <div className="w-full pointer-events-none select-none -mb-1 overflow-hidden">
        <svg
          className="w-[105%] -ml-[2.5%] h-14 sm:h-20 lg:h-24"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 1440 96"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,32 C320,70 640,-10 960,42 C1200,75 1360,20 1440,32 L1440,96 L0,96 Z"
            fill="#2A174E"
            fillOpacity="0.4"
            className="animate-wave-flow"
          />
          <path
            d="M0,48 C240,15 520,75 800,38 C1080,8 1280,60 1440,48 L1440,96 L0,96 Z"
            fill="#1E1035"
            fillOpacity="0.8"
            className="animate-wave-flow-reverse"
          />
          <path
            d="M0,60 C360,20 720,80 1080,40 C1260,20 1380,50 1440,55 L1440,96 L0,96 Z"
            fill="#130924"
            className="animate-wave-flow-slow"
          />
        </svg>
      </div>
    </section>
  );
}

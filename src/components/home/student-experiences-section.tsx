'use client';

import React from 'react';
import Image from 'next/image';
import { MessageSquareQuote } from 'lucide-react';

const ASSETS = {
  studyDeskScene: '/images/study_desk_transparent.png',
};

const EXPERIENCES = [
  {
    id: 'exp-1',
    name: 'Aarav Sharma',
    role: 'Student',
    board: 'CBSE · Class 10 · Mathematics & Science',
    outcome: 'Scored 96% in Term Exams',
    quote:
      'I used to struggle with algebra until I found EduTech. Being able to rewatch the teacher\'s explanation as many times as I needed completely changed how I study. I went into my board exams feeling genuinely confident.',
    initial: 'A',
  },
  {
    id: 'exp-2',
    name: 'Priya Narayanan',
    role: 'Parent',
    board: 'Parent of Class 8 Learner · All Subjects',
    outcome: 'Full Study Transparency',
    quote:
      'As a working parent, knowing exactly what my daughter studied each day — without having to ask — is invaluable. The parent dashboard gives me peace of mind and helps me have more meaningful conversations with her about school.',
    initial: 'P',
  },
  {
    id: 'exp-3',
    name: 'Kavya Subramanian',
    role: 'Student',
    board: 'ICSE · Class 12 · Physics & Chemistry',
    outcome: 'Top Score in Mock Exams',
    quote:
      'The quizzes after each chapter are what made the real difference for me. They showed me exactly which formulas I hadn\'t fully grasped, so I could focus my revision where it actually mattered instead of going through everything again.',
    initial: 'K',
  },
];

export function StudentExperiencesSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#F8F6FF] relative overflow-hidden" id="experiences">
      {/* Delicate Wave Contour Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30 select-none">
        <svg className="w-full h-full" fill="none" viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 150 C300 250 600 50 1000 180 C1300 280 1500 120 1600 200" stroke="#DCCFFF" strokeWidth="1.5" />
          <path d="M-100 350 C400 450 700 250 1100 380 C1400 480 1500 320 1600 400" stroke="#DCCFFF" strokeWidth="1.5" />
          <path d="M-100 550 C300 650 800 450 1200 580 C1400 680 1500 520 1600 600" stroke="#DCCFFF" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Cozy 3D Pastel Study Desk & Lamp Scene Anchor Illustration with 100% Transparent Background */}
      <div className="absolute -right-8 top-6 w-72 sm:w-80 lg:w-96 opacity-40 xl:opacity-90 pointer-events-none select-none z-0 animate-float-slow">
        <Image
          src={ASSETS.studyDeskScene}
          alt="Cozy Pastel Study Desk Scene with Books, Notes and Lamp"
          width={400}
          height={400}
          className="w-full h-auto object-contain drop-shadow-2xl filter contrast-[1.02]"
          unoptimized
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#3D1E6D] text-xs font-black border border-[#DCCFFF] shadow-xs">
            <MessageSquareQuote className="w-3.5 h-3.5 text-[#6244A6]" />
            <span>STUDENT &amp; PARENT STORIES</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-[#1E1035] tracking-tight">
            Hear from the Families We Serve
          </h2>
          <p className="text-base sm:text-lg text-[#5F5875] leading-relaxed">
            Real experiences from students and parents who made EduTech part of their daily learning routine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {EXPERIENCES.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl bg-white border border-[#DCCFFF] hover:border-[#6244A6] p-7 sm:p-8 flex flex-col justify-between shadow-xl shadow-violet-950/5 hover:shadow-2xl hover:shadow-violet-900/15 hover:-translate-y-1.5 transition-all duration-300 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <span className="text-[11px] font-black text-[#3D1E6D] bg-[#EEE8FF] px-3 py-1 rounded-full border border-[#DCCFFF]">
                    {item.role}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3D1E6D] bg-[#F8F6FF] px-3 py-1.5 rounded-xl border border-[#DCCFFF]/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6244A6] shrink-0" />
                  <span>{item.outcome}</span>
                </div>
                <p className="text-sm text-[#1E1035] leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[#DCCFFF]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm font-black text-[#1E1035]">{item.name}</h4>
                  <p className="text-xs text-[#5F5875] font-semibold">{item.board}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4C268F] to-[#2A174E] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-md">
                  {item.initial}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Bottom Wave into White with Flowing Wave Motion */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none select-none overflow-hidden">
        <svg
          className="w-[105%] -ml-[2.5%] h-14 sm:h-20 lg:h-24"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 1440 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,40 C320,95 640,-15 960,60 C1200,98 1360,25 1440,40 L1440,100 L0,100 Z"
            fill="#EEE8FF"
            fillOpacity="0.6"
            className="animate-wave-flow"
          />
          <path
            d="M0,60 C240,25 520,95 800,50 C1080,15 1280,75 1440,60 L1440,100 L0,100 Z"
            fill="#DCCFFF"
            fillOpacity="0.4"
            className="animate-wave-flow-reverse"
          />
          <path
            d="M0,78 C360,30 720,100 1080,52 C1260,30 1380,65 1440,70 L1440,100 L0,100 Z"
            fill="#FFFFFF"
            className="animate-wave-flow-slow"
          />
        </svg>
      </div>
    </section>
  );
}

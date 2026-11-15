'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, Shield } from 'lucide-react';

const ASSETS = {
  fluidWaveFooter:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDuUU5e1L-9DuaDwYBVAOd-qc-LUq0LAe14pE8tT7UNqvZFh-s3Zc-RWmzBqw2JHhj7RLIO-v4_Mv1XXigu9rHCnOVFr8xm9-dPyvhO7AgzzDIe4ybRzhasY0V5UTNmQdIlZr-QTxVPHLFRgv1JR0pXG599D8tEGiBhgWqa6Dk4gmz3V2AHkyOU6T7M3pwx02xq5xEVLPJX3TWKGkQEr96bgD-_0DjRRxVsnJ4NGEE',
};

export function Footer() {
  return (
    <footer className="bg-[#130924] border-t border-violet-900/60 text-[#DCCFFF] relative overflow-hidden">
      {/* Background 8k Fluid Waves Luxury Texture (IMAGE_10) with Smooth Fade Mask */}
      <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
        <Image
          src={ASSETS.fluidWaveFooter}
          alt="Deluxe Dark Violet Wave Texture"
          fill
          className="object-cover object-bottom scale-105"
          unoptimized
        />
      </div>

      {/* Gradient Glow Elements for Atmospheric Depth */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4C268F] rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#6244A6]/20 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Col 1: Brand & Badge */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3D1E6D] via-[#6244A6] to-[#A485E8] flex items-center justify-center shadow-xl shadow-violet-950/60 ring-2 ring-violet-400/40 group-hover:scale-105 transition-transform text-white">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-2xl tracking-tight text-white">
                  EDUTECH
                </span>
                <span className="text-[10px] font-bold text-[#A485E8] tracking-widest uppercase">
                  Digital Classroom
                </span>
              </div>
            </Link>
            <p className="text-sm text-violet-200/80 max-w-sm leading-relaxed font-normal">
              A comprehensive digital replacement for traditional tuition. Tailored for Kindergarten through Class 12 students, parents, and certified educators.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#2A174E]/90 text-[#DCCFFF] border border-violet-500/40 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-[#A485E8] animate-ping" />
                Admissions Open for Academic Year 2026–27
              </span>
            </div>
          </div>

          {/* Col 2: Explore */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#A485E8] mb-4">
              Explore
            </h4>
            <ul className="space-y-3 text-sm font-semibold">
              <li>
                <a className="text-violet-200/90 hover:text-white transition-colors flex items-center gap-2" href="#how-it-works">
                  <span>How It Works</span>
                </a>
              </li>
              <li>
                <a className="text-violet-200/90 hover:text-white transition-colors flex items-center gap-2" href="#experiences">
                  <span>Student Experiences</span>
                </a>
              </li>
              <li>
                <a className="text-violet-200/90 hover:text-white transition-colors flex items-center gap-2" href="#features">
                  <span>Platform Features</span>
                </a>
              </li>
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors flex items-center gap-2" href="/signup">
                  <span>Create Account</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#A485E8] mb-4">
              Portals
            </h4>
            <ul className="space-y-3 text-sm font-semibold">
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors" href="/student">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors" href="/parent">
                  Parent Portal
                </Link>
              </li>
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors" href="/teacher">
                  Teacher Dashboard
                </Link>
              </li>
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors" href="/login">
                  Account Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Support & Trust */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#A485E8] mb-4">
              Support &amp; Trust
            </h4>
            <ul className="space-y-3 text-sm font-semibold">
              <li>
                <span className="text-xs text-violet-300/70 block font-normal">Need assistance?</span>
                <a className="text-white hover:text-[#A485E8] font-bold text-xs transition-colors" href="mailto:support@edutech.internal">
                  support@edutech.internal
                </a>
              </li>
              <li className="pt-1">
                <Link className="text-violet-200/90 hover:text-white transition-colors text-xs" href="/privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors text-xs" href="/terms">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-[11px] text-[#A485E8] flex items-center gap-1.5 mt-2 font-semibold">
                  <Shield className="w-4 h-4 text-[#A485E8]" />
                  Verified &amp; Encrypted Platform
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-violet-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-violet-300/70">
          <p>&copy; {new Date().getFullYear()} EduTech. All rights reserved. Empowering learners everywhere.</p>
          <p className="flex items-center gap-1 font-semibold text-violet-200/90">
            Designed for K–12 Academic Excellence
          </p>
        </div>
      </div>
    </footer>
  );
}

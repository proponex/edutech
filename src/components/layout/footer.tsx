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
    <footer className="mt-auto w-full bg-[#130924] border-t border-violet-900/60 text-[#DCCFFF] relative overflow-hidden">
      {/* Background Fluid Waves Texture covering complete size (full sides and bottom) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none">
        <Image
          src={ASSETS.fluidWaveFooter}
          alt="Deluxe Dark Violet Wave Texture"
          fill
          className="object-cover object-bottom w-full h-full opacity-65 mix-blend-screen"
          unoptimized
        />
        {/* Subtle overlay for optimal contrast and text clarity while preserving full edge-to-edge wave coverage */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#130924]/60 via-[#130924]/30 to-[#130924]/65 pointer-events-none" />
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
          </div>

          {/* Col 2: Explore */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#A485E8] mb-4">
              Explore
            </h4>
            <ul className="space-y-3 text-sm font-semibold">
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors flex items-center gap-2" href="/#how-it-works">
                  <span>How It Works</span>
                </Link>
              </li>
              <li>
                <Link className="text-violet-200/90 hover:text-white transition-colors flex items-center gap-2" href="/#features">
                  <span>Platform Features</span>
                </Link>
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
                <Link className="text-violet-200/90 hover:text-white transition-colors" href="/">
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

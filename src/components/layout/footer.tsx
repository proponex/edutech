'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Mail, Shield, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#DCCFFF]/80 bg-white text-[#5F5875] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6244A6] to-[#8060CE] flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform text-white">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-[#282238]">
                EDUTECH
              </span>
            </Link>

            <p className="text-sm text-[#5F5875] max-w-sm leading-relaxed">
              A comprehensive digital replacement for traditional tuition. Tailored for Kindergarten through Class 12 students, parents, and certified educators.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF]">
                <span className="w-2 h-2 rounded-full bg-[#8060CE] animate-pulse" />
                Admissions Open for Academic Year 2026–27
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#282238] mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <a href="#how-it-works" className="hover:text-[#6244A6] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#experiences" className="hover:text-[#6244A6] transition-colors">
                  Student Experiences
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#6244A6] transition-colors">
                  Platform Features
                </a>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#6244A6] transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#282238] mb-4">
              Portals
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <Link href="/student" className="hover:text-[#6244A6] transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/parent" className="hover:text-[#6244A6] transition-colors">
                  Parent Portal
                </Link>
              </li>
              <li>
                <Link href="/teacher" className="hover:text-[#6244A6] transition-colors">
                  Teacher Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#6244A6] transition-colors">
                  Account Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#282238] mb-4">
              Support &amp; Trust
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <span className="text-xs text-[#5F5875]">Need assistance?</span>
                <a
                  href="mailto:support@edutech.internal"
                  className="block text-[#6244A6] hover:underline font-semibold text-xs mt-0.5"
                >
                  support@edutech.internal
                </a>
              </li>
              <li className="pt-2">
                <Link href="/privacy" className="hover:text-[#6244A6] transition-colors text-xs">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#6244A6] transition-colors text-xs">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-[11px] text-[#5F5875] flex items-center gap-1 mt-1">
                  <Shield className="w-3.5 h-3.5 text-[#8060CE]" />
                  Verified &amp; Encrypted Platform
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#DCCFFF]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5F5875]">
          <p>
            &copy; {new Date().getFullYear()} EduTech. All rights reserved. Empowering learners everywhere.
          </p>
          <p className="flex items-center gap-1 font-medium">
            Designed for K–12 Academic Excellence
          </p>
        </div>
      </div>
    </footer>
  );
}

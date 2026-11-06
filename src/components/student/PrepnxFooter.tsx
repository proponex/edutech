'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export function PrepnxFooter() {
  return (
    <footer className="mt-auto border-t border-[#E9DDF8] bg-white pt-12 pb-8 text-[#68647D] transition-colors">
      <div className="w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Column 1: Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/student" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] border border-[#E9DDF8] flex items-center justify-center text-[#9333EA] shadow-2xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-[#17133A]">
                Prepnx
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-[#68647D] max-w-sm leading-relaxed">
              A complete learning platform for school &amp; competitive exam preparation. Designed for students from LKG through Class 12.
            </p>
            <p className="text-xs text-[#8A869C]">
              Empowering learners with structured curriculum, expert guidance, and verifiable progress.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#17133A] font-display">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-[#68647D] font-medium">
              <li>
                <Link href="/student" className="hover:text-[#9333EA] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/student?tab=channels" className="hover:text-[#9333EA] transition-colors">
                  Channels
                </Link>
              </li>
              <li>
                <Link href="/student?tab=analysis" className="hover:text-[#9333EA] transition-colors">
                  Analysis
                </Link>
              </li>
              <li>
                <Link href="/student/payments" className="hover:text-[#9333EA] transition-colors">
                  Subscription
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Courses */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#17133A] font-display">
              Courses
            </h4>
            <ul className="space-y-2 text-sm text-[#68647D] font-medium">
              <li>
                <Link href="/student?tab=search" className="hover:text-[#9333EA] transition-colors">
                  LKG – UKG
                </Link>
              </li>
              <li>
                <Link href="/student?tab=search" className="hover:text-[#9333EA] transition-colors">
                  Class 1 – 5
                </Link>
              </li>
              <li>
                <Link href="/student?tab=search" className="hover:text-[#9333EA] transition-colors">
                  Class 6 – 8
                </Link>
              </li>
              <li>
                <Link href="/student?tab=search" className="hover:text-[#9333EA] transition-colors">
                  Class 9 – 12
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#17133A] font-display">
              Support
            </h4>
            <ul className="space-y-2 text-sm text-[#68647D] font-medium">
              <li>
                <Link href="/#help-center" className="hover:text-[#9333EA] transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <a href="mailto:support@prepnx.com" className="hover:text-[#9333EA] transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#9333EA] transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#9333EA] transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-10 pt-6 border-t border-[#E9DDF8] flex flex-col sm:flex-row items-center justify-between text-xs text-[#68647D] gap-4">
          <p>&copy; 2026 Prepnx Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#9333EA]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#9333EA]">Terms of Service</Link>
            <Link href="/#help-center" className="hover:text-[#9333EA]">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


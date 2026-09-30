import React from 'react';
import Link from 'next/link';
import { GraduationCap, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-md shadow-primary-500/20">
                <GraduationCap className="w-5 h-5 text-neutral-950" />
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-neutral-950 dark:text-white">
                EDUTECH
              </span>
            </Link>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed">
              A comprehensive digital replacement for traditional tuition. Designed for Kindergarten through Class 12 students, parents, and teachers.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                Admissions Open for Academic Year 2026–27
              </span>
            </div>
          </div>

          {/* Programs Navigation */}
          <div>
            <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider mb-4">
              Programs
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#programs" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Primary (K – Class 5)
                </Link>
              </li>
              <li>
                <Link href="/#programs" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Middle School (Class 6 – 8)
                </Link>
              </li>
              <li>
                <Link href="/#programs" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Secondary (Class 9 – 10)
                </Link>
              </li>
              <li>
                <Link href="/#programs" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Senior Secondary (11 – 12)
                </Link>
              </li>
              <li>
                <Link href="/#programs" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Board Exam Coaching
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#how-it-works" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#tuition" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Tuition Experience
                </Link>
              </li>
              <li>
                <Link href="/#for-parents" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  For Parents
                </Link>
              </li>
              <li>
                <Link href="/#for-students" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  For Students
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Sign In to Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Institutional */}
          <div>
            <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider mb-4">
              Institutional
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/signup" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Student Enrollment
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Parent Registration
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Teacher Portal
                </Link>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-neutral-400 cursor-not-allowed">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>
            &copy; {new Date().getFullYear()} Edutech Learning Technologies. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-neutral-400">
            Crafted with <Heart className="w-3 h-3 text-red-500 inline fill-red-500" /> for quality education.
          </p>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export function FinalCTASection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-primary-50/40 dark:from-neutral-900 dark:to-neutral-950 border-t border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-800 text-primary-900 dark:text-primary-300 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span>Transform Your Academic Performance</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display max-w-2xl mx-auto leading-tight">
          Ready to get started?
        </h2>

        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Join thousands of students and parents across Tamil Nadu State Board, CBSE, and ICSE schools experiencing the benefits of modern digital tuition.
        </p>

        {/* Action Buttons: Explore Programs, Sign Up */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/#programs">
            <Button variant="outline" size="lg" className="border-neutral-300 dark:border-neutral-700">
              Explore Programs
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="lg" className="flex items-center gap-2">
              Sign Up for Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Assurance items */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-primary-500" />
            Kindergarten through Class 12
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-primary-500" />
            Video & Recorded Tuitions
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-primary-500" />
            Weekly Parent Progress Reports
          </span>
        </div>
      </div>
    </section>
  );
}

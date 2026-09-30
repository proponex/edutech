import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquareQuote } from 'lucide-react';

export function ReviewsSection() {
  return (
    <section className="py-16 sm:py-20 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="secondary" className="mx-auto">
            Community & Reviews
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Student & Parent Stories
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            Real feedback from learners across Kindergarten through Class 12.
          </p>
        </div>

        {/* Tasteful Coming Soon / Development Verified State */}
        <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
          <CardContent className="p-8 sm:p-12 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-800 flex items-center justify-center mx-auto text-primary-700 dark:text-primary-400">
              <MessageSquareQuote className="w-7 h-7" />
            </div>

            <div className="max-w-lg mx-auto space-y-2">
              <Badge variant="neutral" className="text-xs font-mono">
                Verified Reviews &bull; Opening for 2026–27
              </Badge>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white font-display">
                Term Assessments & Stories Launching Soon
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                We believe in genuine, verified academic outcomes. Following the conclusion of current quarterly exams, authenticated parent reviews and student score progression reports will be published here.
              </p>
            </div>

            {/* Quality Commitment Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 text-left">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 block">
                  100% Verified
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Reviews submitted only by active enrolled students and verified guardians.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="text-xs font-bold text-secondary-600 dark:text-secondary-400 block">
                  Outcome-Based
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Real academic score improvements tracked across school tests.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <span className="text-xs font-bold text-accent-700 dark:text-accent-400 block">
                  Transparent Care
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Direct parent feedback on teaching quality and mentorship support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

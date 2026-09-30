'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquareQuote, TrendingUp } from 'lucide-react';

const DUMMY_TESTIMONIALS = [
  {
    id: 1,
    studentName: 'Aarav Sharma',
    grade: 'Class 12 • CBSE',
    subject: 'Physics',
    scoreJump: 'From 68% to 94%',
    rating: 5.0,
    quote:
      'The step-by-step concept videos and weekly doubt clearing transformed my mechanics and electromagnetism marks. Truly exceptional tuition.',
  },
  {
    id: 2,
    studentName: 'Diya Patel',
    grade: 'Class 10 • ICSE',
    subject: 'Mathematics',
    scoreJump: 'From 74% to 98%',
    rating: 5.0,
    quote:
      'My teacher explains every single theorem with practical examples. The chapter quizzes helped me master algebra and geometry with ease.',
  },
  {
    id: 3,
    studentName: 'Kavya Subramanian',
    grade: 'Class 11 • TN State Board',
    subject: 'Chemistry',
    scoreJump: 'From 62% to 91%',
    rating: 5.0,
    quote:
      'Organic chemistry was my biggest hurdle. With the dedicated unit notes and interactive practice assignments, I scored top marks in quarterly exams.',
  },
];

export function StudentTestimonialsSection() {
  return (
    <section className="w-full space-y-6 pt-4">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="secondary" className="mx-auto text-xs font-semibold">
          Verified Student Stories
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-display">
          What Our Learners Say
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Real feedback and score breakthroughs achieved with Edutech verified tutors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DUMMY_TESTIMONIALS.map((t) => (
          <Card
            key={t.id}
            className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-3xl p-6 flex flex-col justify-between hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <Badge variant="success" className="text-[11px] font-bold flex items-center gap-1 py-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {t.scoreJump}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                  {t.studentName}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                  {t.grade} • {t.subject}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center">
                <MessageSquareQuote className="w-4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

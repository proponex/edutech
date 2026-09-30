'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Award,
  Users,
  CheckCircle2,
} from 'lucide-react';

export function AboutEdutechSection() {
  const features = [
    {
      icon: Award,
      title: 'Verified Master Tutors',
      description: 'Handpicked subject matter experts with proven academic records and deep pedagogical training.',
    },
    {
      icon: BookOpen,
      title: 'Class 1 to 12 Curriculum',
      description: 'Rigorous topic-by-topic coverage across CBSE, ICSE, and State Boards with chapter assessments.',
    },
    {
      icon: GraduationCap,
      title: 'Interactive Video Lessons',
      description: 'Concept-rich video content, active problem solving, and structured homework feedback.',
    },
    {
      icon: Users,
      title: 'Transparent Progress',
      description: 'Real-time completion tracking, quiz analytics, and milestone reports visible to students and parents.',
    },
  ];

  return (
    <section className="w-full space-y-6 pt-4 pb-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="primary" className="mx-auto text-xs font-bold uppercase tracking-wider">
          About Edutech
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-display">
          Redefining Daily Tuition for School Excellence
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Edutech is India’s personalized learning companion connecting school students from Class 1 through Class 12 with dedicated, certified tutors for concept mastery and high-stakes exam preparation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card
              key={i}
              className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-3xl p-6 space-y-3 hover:border-primary-400 dark:hover:border-primary-600 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {f.title}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {f.description}
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

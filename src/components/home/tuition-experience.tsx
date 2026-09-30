import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookMarked,
  Video,
  HelpCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

const TUITION_FEATURES = [
  {
    id: 'teachers',
    title: 'Expert Tuition Teachers',
    description:
      'Dedicated educators who know the school syllabus inside out and provide mentorship beyond basic lectures.',
    icon: Users,
    variant: 'primary',
  },
  {
    id: 'syllabus',
    title: 'Complete Syllabus Coverage',
    description:
      'Meticulously mapped to state and national board curriculums, ensuring no topic is overlooked before exams.',
    icon: BookMarked,
    variant: 'secondary',
  },
  {
    id: 'video-classes',
    title: 'Daily Interactive Video Classes',
    description:
      'Two-way interactive classrooms with real-time participation, instant feedback, and guided practice sessions.',
    icon: Video,
    variant: 'accent',
  },
  {
    id: 'doubt-clearing',
    title: 'Instant Doubt Clearing',
    description:
      'Dedicated doubt resolution desks where students can ask questions during and after class until concepts are crystal clear.',
    icon: HelpCircle,
    variant: 'primary',
  },
  {
    id: 'progress',
    title: 'Continuous Progress Tracking',
    description:
      'Weekly assessments, homework evaluation, and milestone reports to ensure tangible academic improvement.',
    icon: TrendingUp,
    variant: 'secondary',
  },
];

export function TuitionExperienceSection() {
  return (
    <section id="teachers" className="py-16 sm:py-20 bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="primary" className="mx-auto">
            The Digital Tuition Revolution
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Everything Great Tuition Needs
          </h2>
          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Edutech is designed as a complete digital replacement for traditional tuition centers — an immersive learning experience with accountability, expert guidance, and personalized care.
          </p>
        </div>

        {/* 5 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TUITION_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                className="border-neutral-200 dark:border-neutral-800 hover:border-primary-400 dark:hover:border-primary-500/60 shadow-sm hover:shadow-md transition-all group"
              >
                <CardContent className="p-7 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary-700 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* Value Proposition Callout Card */}
          <Card className="border-primary-300 dark:border-primary-800 bg-gradient-to-br from-primary-500/10 via-white to-transparent dark:from-primary-950/40 dark:via-neutral-900 dark:to-neutral-900 shadow-sm flex flex-col justify-center p-7">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Better than Offline Tuition</span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                No Commute, Full Safety, Zero Compromise
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Save hours of daily travel while learning from top educators in a comfortable home environment with complete parental oversight.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

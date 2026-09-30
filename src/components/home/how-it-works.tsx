import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compass, Tv, FileText, Rocket } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Choose',
    subtitle: 'Find Your Program',
    description: 'Select your grade from Kindergarten to Class 12, pick your board curriculum, and enroll in your customized tuition track.',
    icon: Compass,
    badgeColor: 'bg-primary-500 text-neutral-950',
  },
  {
    step: '02',
    title: 'Learn',
    subtitle: 'Attend Video & Recorded Classes',
    description: 'Join daily sessions with experienced tuition teachers and re-watch topic videos whenever you need to revise.',
    icon: Tv,
    badgeColor: 'bg-secondary-500 text-neutral-950',
  },
  {
    step: '03',
    title: 'Practice',
    subtitle: 'Solve Homework & Mock Tests',
    description: 'Solidify your learning with daily problem sheets, weekend chapter tests, and receive immediate teacher feedback on errors.',
    icon: FileText,
    badgeColor: 'bg-accent-500 text-neutral-950',
  },
  {
    step: '04',
    title: 'Grow',
    subtitle: 'Track Progress & Excel',
    description: 'Monitor milestone reports, eliminate weak areas with targeted mentor help, and step confidently into your school and board exams.',
    icon: Rocket,
    badgeColor: 'bg-primary-600 text-white',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="secondary" className="mx-auto">
            Structured Learning Path
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            A proven 4-step framework engineered to take students from foundational comprehension to exam mastery.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                className="border-neutral-200 dark:border-neutral-800 relative flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <CardContent className="p-7 space-y-4">
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between">
                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-display font-extrabold text-sm shadow-sm ${item.badgeColor}`}>
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white font-display">
                      {item.title}
                    </h3>
                    <h4 className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5 uppercase tracking-wider">
                      {item.subtitle}
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-3 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

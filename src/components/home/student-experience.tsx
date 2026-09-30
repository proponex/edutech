import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Video,
  HelpCircle,
  FileCheck,
  Award,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

const STUDENT_TOOLS = [
  {
    title: 'Lessons',
    description: 'High-definition conceptual video lectures structured topic-by-topic with downloadable summary notes.',
    icon: BookOpen,
    badge: 'On-Demand',
  },
  {
    title: 'Video Lessons',
    description: 'Curated interactive tuition sessions with teacher screen-sharing and problem-solving.',
    icon: Video,
    badge: 'Interactive',
  },
  {
    title: 'Doubt Resolution',
    description: 'Snap a photo of your problem or type your query to get instant, step-by-step guidance from subject experts.',
    icon: HelpCircle,
    badge: 'Unlimited',
  },
  {
    title: 'Homework & Assignments',
    description: 'Structured daily homework sets with automated correction and teacher annotations on written solutions.',
    icon: FileCheck,
    badge: 'Daily',
  },
  {
    title: 'Mock Tests & Quizzes',
    description: 'Timed chapter and term test simulations modeled directly on board examinations with percentile rankings.',
    icon: Award,
    badge: 'Evaluated',
  },
  {
    title: 'Personalized Growth',
    description: 'Adaptive study planners that spotlight tricky concepts and suggest custom practice exercises.',
    icon: TrendingUp,
    badge: 'Adaptive',
  },
];

export function StudentExperienceSection() {
  return (
    <section id="for-students" className="py-16 sm:py-20 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="primary" className="mx-auto">
            Student-Centric Learning
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            The Complete Student Experience
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            From daily video tuition to late-night doubt solving, every tool a student needs to excel academically.
          </p>
        </div>

        {/* 6 Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STUDENT_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.title}
                className="border-neutral-200 dark:border-neutral-800 hover:border-primary-400 dark:hover:border-primary-500/60 shadow-sm hover:shadow-md transition-all group"
              >
                <CardContent className="p-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-primary-700 dark:text-primary-400" />
                    </div>
                    <Badge variant="neutral" className="text-[11px]">
                      {tool.badge}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Callout */}
        <div className="text-center pt-4">
          <Link href="/signup">
            <Button variant="primary" size="lg" className="inline-flex items-center gap-2">
              Start Learning with Edutech
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

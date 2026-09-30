import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HeartHandshake,
  CheckCircle2,
  TrendingUp,
  Clock,
  Award,
  AlertCircle,
  Calendar,
  ArrowRight,
} from 'lucide-react';

export function ParentExperienceSection() {
  return (
    <section id="for-parents" className="py-16 sm:py-20 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-100 dark:bg-secondary-950/80 border border-secondary-300 dark:border-secondary-800 text-secondary-900 dark:text-secondary-300 text-xs font-semibold">
              <HeartHandshake className="w-3.5 h-3.5 text-secondary-600 dark:text-secondary-400" />
              <span>Parent Transparency & Care</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display leading-tight">
              Know how your child is doing.
            </h2>

            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Never wonder what happened during tuition hours. Edutech provides parents with continuous, real-time insights into their child&apos;s academic journey, attendance, and test readiness.
            </p>

            {/* Feature List */}
            <div className="space-y-3 pt-2">
              {[
                'Learning Progress & Curriculum Milestones',
                'Class Attendance & Punctuality Logs',
                'Homework Submission & Teacher Remarks',
                'Weekly Test Performance & Ranked Percentiles',
                'Identification of Weak Chapters for Targeted Remediation',
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="flex items-center gap-2">
                  Register as Parent
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Dashboard Preview Card */}
          <div className="lg:col-span-6">
            <div className="relative">
              {/* Product Preview Badge */}
              <div className="absolute -top-3 right-4 z-20">
                <Badge variant="neutral" className="shadow-md bg-neutral-900 text-neutral-200 border-neutral-700 text-[11px] font-mono px-3 py-1">
                  Product Preview &bull; Visual Demo
                </Badge>
              </div>

              {/* Mock Parent Dashboard Card */}
              <Card className="border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden bg-white dark:bg-neutral-900">
                {/* Mock Card Top Header */}
                <div className="p-6 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/90 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-950/80 border border-secondary-300 dark:border-secondary-800 flex items-center justify-center font-bold text-xs text-secondary-800 dark:text-secondary-300">
                      PS
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 font-medium">Child Profile</p>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Pooja Sharma &bull; Class 12 (CBSE)
                      </h4>
                    </div>
                  </div>
                  <Badge variant="success" className="text-xs">
                    Term 2 On Track
                  </Badge>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Key Metrics Grid (Progress 78%, Attendance 92%, Tests 81%) */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {/* Progress 78% */}
                    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950/80 flex items-center justify-center mx-auto text-primary-700 dark:text-primary-400 mb-1">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white font-display block">
                        78%
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                        Progress
                      </span>
                    </div>

                    {/* Attendance 92% */}
                    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-secondary-100 dark:bg-secondary-950/80 flex items-center justify-center mx-auto text-secondary-700 dark:text-secondary-400 mb-1">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white font-display block">
                        92%
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                        Attendance
                      </span>
                    </div>

                    {/* Tests 81% */}
                    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-accent-100 dark:bg-accent-950/80 flex items-center justify-center mx-auto text-accent-700 dark:text-accent-400 mb-1">
                        <Award className="w-4 h-4" />
                      </div>
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white font-display block">
                        81%
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                        Tests Avg
                      </span>
                    </div>
                  </div>

                  {/* Recent Activity Mini-Feed */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                      Academic Updates:
                    </span>
                    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          Completed Physics Mock Exam #4 (Scored 88/100)
                        </span>
                      </div>
                      <span className="text-neutral-400 text-[10px]">Today</span>
                    </div>

                    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          Attended Calculus Video Lesson (60 min)
                        </span>
                      </div>
                      <span className="text-neutral-400 text-[10px]">Yesterday</span>
                    </div>

                    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          Mentor note: Revision recommended for Wave Optics
                        </span>
                      </div>
                      <span className="text-neutral-400 text-[10px]">2 days ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Image as ImageIcon,
  GraduationCap,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { BannerItem, ClassItem } from '@/types';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachersCount, setTeachersCount] = useState<number>(0);
  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [channelsCount, setChannelsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [bannersRes, classesRes, teachersRes, studentsRes, channelsRes] = await Promise.all([
          supabase.from('banners').select('*').order('display_order', { ascending: true }),
          supabase.from('classes').select('*').order('display_order', { ascending: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('channels').select('id', { count: 'exact', head: true }),
        ]);

        if (bannersRes.data) setBanners(bannersRes.data as BannerItem[]);
        if (classesRes.data) setClasses(classesRes.data as ClassItem[]);
        if (teachersRes.count !== null) setTeachersCount(teachersRes.count);
        if (studentsRes.count !== null) setStudentsCount(studentsRes.count);
        if (channelsRes.count !== null) setChannelsCount(channelsRes.count);
      } catch {
        // Handle error silently or show empty state
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  const activeBannersCount = banners.filter((b) => b.is_active).length;
  const totalClassesCount = classes.length;
  const activeClassesCount = classes.filter((c) => c.is_active).length;

  return (
    <div className="space-y-8">
      {/* Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Welcome, Administrator
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your homepage banners and educational classes for the Edutech platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/banners">
            <Button size="sm" variant="primary" className="flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              Manage Banners
            </Button>
          </Link>
          <Link href="/admin/classes">
            <Button size="sm" variant="outline" className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              Manage Classes
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Active Banners Card */}
        <Card className="hover:border-primary-400/50 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Active Banners
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {loading ? '—' : activeBannersCount}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                of {banners.length} total
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Target: 3 main banners</span>
              <Link
                href="/admin/banners"
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Total Classes Card */}
        <Card className="hover:border-secondary-400/50 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Classes
              </span>
              <div className="w-10 h-10 rounded-xl bg-secondary-50 dark:bg-secondary-950/80 border border-secondary-200 dark:border-secondary-800 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {loading ? '—' : totalClassesCount}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Kindergarten to Class 12
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Standard K-12 setup</span>
              <Link
                href="/admin/classes"
                className="text-xs font-semibold text-secondary-600 dark:text-secondary-400 hover:underline flex items-center gap-1"
              >
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Active Classes Card */}
        <Card className="hover:border-accent-400/50 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Active Classes
              </span>
              <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/80 border border-accent-200 dark:border-accent-800 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {loading ? '—' : activeClassesCount}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                visible to public
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Status active</span>
              <Link
                href="/admin/classes"
                className="text-xs font-semibold text-accent-700 dark:text-accent-400 hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Creator & Community Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="hover:border-primary-400/50 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Teacher Channels
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
                📺
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {loading ? '—' : channelsCount}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                creator channels
              </span>
            </div>
            <p className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 text-xs text-neutral-500">
              Created & owned by teachers
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-secondary-400/50 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Registered Teachers
              </span>
              <div className="w-10 h-10 rounded-xl bg-secondary-100 dark:bg-secondary-950/80 border border-secondary-300 dark:border-secondary-800 flex items-center justify-center text-secondary-700 dark:text-secondary-300 font-bold">
                👨‍🏫
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {loading ? '—' : teachersCount}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                verified educators
              </span>
            </div>
            <p className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 text-xs text-neutral-500">
              Content creator accounts
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent-400/50 transition-all shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Registered Students
              </span>
              <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-950/80 border border-accent-300 dark:border-accent-800 flex items-center justify-center text-accent-800 dark:text-accent-300 font-bold">
                🎓
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {loading ? '—' : studentsCount}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                enrolled learners
              </span>
            </div>
            <p className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 text-xs text-neutral-500">
              K-12 student profiles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Management Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Banner Quick Preview */}
        <Card className="shadow-sm">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="font-bold text-base text-neutral-900 dark:text-white">
                Homepage Banners
              </h2>
            </div>
            <Link href="/admin/banners">
              <Button size="sm" variant="outline">
                Manage Banners
              </Button>
            </Link>
          </div>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-14 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                <div className="h-14 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
              </div>
            ) : banners.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                <ImageIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  No banners uploaded yet
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Upload up to 3 hero banners for your homepage.
                </p>
                <Link href="/admin/banners" className="mt-3 inline-block">
                  <Button size="sm" variant="primary">
                    Upload Banner
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.slice(0, 3).map((banner) => (
                  <div
                    key={banner.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/60 bg-neutral-50 dark:bg-neutral-900/60 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
                        <NextImage
                          src={banner.image_url}
                          alt={banner.title}
                          fill
                          sizes="48px"
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-neutral-900 dark:text-white">
                          {banner.title}
                        </p>
                        <p className="text-xs text-neutral-500">Order: {banner.display_order}</p>
                      </div>
                    </div>
                    <Badge variant={banner.is_active ? 'success' : 'neutral'}>
                      {banner.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classes Quick Preview */}
        <Card className="shadow-sm">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              <h2 className="font-bold text-base text-neutral-900 dark:text-white">
                Educational Classes
              </h2>
            </div>
            <Link href="/admin/classes">
              <Button size="sm" variant="outline">
                Manage Classes
              </Button>
            </Link>
          </div>
          <CardContent className="p-6">
            {loading ? (
              <div className="grid grid-cols-2 gap-2 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
                ))}
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                <p className="text-sm text-neutral-500">
                  Classes have not been seeded yet. Run the SQL schema in your Supabase SQL Editor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {classes.slice(0, 9).map((cls) => (
                  <div
                    key={cls.id}
                    className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800/60 bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium truncate text-neutral-800 dark:text-neutral-200">
                      {cls.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        cls.is_active ? 'bg-primary-500' : 'bg-neutral-400'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
            {classes.length > 9 && (
              <p className="text-xs text-neutral-400 text-center mt-3">
                + {classes.length - 9} more classes configured
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings / Foundation Info */}
      <Card id="settings" className="border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            <h2 className="font-bold text-base text-neutral-900 dark:text-white">
              Phase 1 System Information
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Phase 1 establishes the authentication layer, Supabase storage for banners, database schema for classes and profiles, and role-based routing. Additional platforms (assignments, video streaming, payments) are reserved for subsequent phases.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

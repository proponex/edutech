'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  HeartHandshake,
  BookOpen,
  FileQuestion,
  UserCheck,
  BarChart3,
  Activity,
  Tag,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  ShieldAlert,
  Settings,
  Image as ImageIcon,
  Layers,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Profile } from '@/types';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/admin/login');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !data || data.role !== 'admin') {
          await supabase.auth.signOut();
          router.push('/admin/login?error=unauthorized');
          return;
        }

        setProfile(data as Profile);
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  interface NavGroup {
    group: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      group: 'Core Management',
      items: [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard },
        { name: 'Students', href: '/admin/students', icon: Users },
        { name: 'Teachers', href: '/admin/teachers', icon: GraduationCap },
        { name: 'Parents', href: '/admin/parents', icon: HeartHandshake },
        { name: 'Courses', href: '/admin/courses', icon: BookOpen },
        { name: 'Exams', href: '/admin/exams', icon: FileQuestion },
        { name: 'Enrollments', href: '/admin/enrollments', icon: UserCheck },
      ],
    },
    {
      group: 'Platform & Insights',
      items: [
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Website Activity', href: '/admin/activity', icon: Activity },
        { name: 'Pricing Management', href: '/admin/pricing', icon: Tag },
        { name: 'Homepage Banners', href: '/admin/banners', icon: ImageIcon },
        { name: 'Classes Setup', href: '/admin/classes', icon: Layers },
      ],
    },
    {
      group: 'Financials (Coming Soon)',
      items: [
        { name: 'Payment Analytics', href: '/admin/payments', icon: CreditCard, badge: 'Soon' },
        { name: 'Teacher Earnings', href: '/admin/earnings', icon: Wallet, badge: 'Soon' },
        { name: 'Withdrawals', href: '/admin/withdrawals', icon: ArrowDownToLine, badge: 'Soon' },
      ],
    },
    {
      group: 'System & Security',
      items: [
        { name: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Verifying Super Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  // Determine current active section for breadcrumbs
  const pathParts = pathname.split('/').filter(Boolean);
  const currentSection = pathParts[1]
    ? pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1).replace('-', ' ')
    : 'Overview';

  return (
    <div className="min-h-screen flex bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-neutral-950" />
              </div>
              <div>
                <span className="font-display font-extrabold text-lg tracking-tight text-neutral-900 dark:text-white">
                  EDUTECH
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-primary-600 dark:text-primary-400">
                  Super Admin
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links (scrollable) */}
          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
                  {group.group}
                </p>
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary-500 text-neutral-950 font-semibold shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User profile & logout (sticky bottom) */}
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/80 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-700 flex items-center justify-center font-bold text-xs text-primary-800 dark:text-primary-300 shrink-0">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-neutral-900 dark:text-white">
                  {profile?.name || 'Super Admin'}
                </p>
                <p className="text-xs text-neutral-400 truncate">{profile?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-neutral-200 dark:border-neutral-800 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-8 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-primary-600 dark:text-primary-400">Super Admin</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="capitalize text-neutral-900 dark:text-white font-medium">
                {currentSection}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>System Live</span>
            </div>
            <Link
              href="/"
              target="_blank"
              className="text-xs font-medium text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 transition-colors hidden sm:block"
            >
              View Live Website &rarr;
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

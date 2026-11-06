'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  BarChart3,
  Users,
  Image as ImageIcon,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
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

  // Authentication & Role Check
  useEffect(() => {
    let isMounted = true;

    async function checkAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // STEP 1 & 2: If on login route
        if (pathname === '/admin/login') {
          if (user) {
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();

            if (data?.role === 'admin') {
              // Already logged in as admin -> redirect to admin dashboard
              router.replace('/admin');
              return;
            }
          }
          if (isMounted) setLoading(false);
          return;
        }

        // STEP 1: Not logged in on protected admin route -> redirect to login
        if (!user) {
          router.replace('/admin/login');
          return;
        }

        // STEP 2: Verify admin role
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !data || data.role !== 'admin') {
          await supabase.auth.signOut();
          router.replace('/admin/login?error=unauthorized');
          return;
        }

        if (isMounted) {
          setProfile(data as Profile);
          setLoading(false);
        }
      } catch {
        if (pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
        if (isMounted) setLoading(false);
      }
    }

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [router, supabase, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  // STEP 1: If on /admin/login, NEVER render the dashboard shell or sidebar!
  // Render ONLY the clean login page.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Loading state: Show clean centered loading screen without rendering dashboard shell
  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Verifying Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  // The 3 ONLY main admin dashboard tabs required:
  // 1. Income (/admin)
  // 2. Payment Analytics (/admin/analytics)
  // 3. Users (/admin/users)
  const navTabs = [
    {
      name: 'Income',
      href: '/admin',
      icon: Wallet,
      description: 'Platform revenue, 20% fees & teacher payouts',
    },
    {
      name: 'Payment Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      description: 'Reports, revenue trends & volume filters',
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      description: 'Students, educators & parent directories',
    },
    {
      name: 'Banner Management',
      href: '/admin/banners',
      icon: ImageIcon,
      description: 'Homepage promotional banners & carousels',
    },
  ];

  // Active section title for breadcrumbs
  const getSectionTitle = () => {
    if (pathname === '/admin' || pathname === '/admin/income') return 'Income';
    if (pathname.startsWith('/admin/analytics') || pathname.startsWith('/admin/payments')) return 'Payment Analytics';
    if (pathname.startsWith('/admin/banners')) return 'Banner Management';
    if (
      pathname.startsWith('/admin/users') ||
      pathname.startsWith('/admin/students') ||
      pathname.startsWith('/admin/teachers') ||
      pathname.startsWith('/admin/parents')
    ) {
      return 'Users';
    }
    return 'Income';
  };

  const currentSection = getSectionTitle();

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Clean Application Green Theme) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-black text-lg tracking-tight text-neutral-900 dark:text-white">
                  EDUTECH
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-primary-700 dark:text-primary-400">
                  Admin Dashboard
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

          {/* Navigation Links (Strictly 3 main tabs) */}
          <div className="p-4">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
              Admin Navigation
            </p>
            <nav className="space-y-1.5">
              {navTabs.map((item) => {
                let isActive = false;
                if (item.href === '/admin') {
                  isActive = pathname === '/admin' || pathname === '/admin/income';
                } else if (item.href === '/admin/analytics') {
                  isActive = pathname.startsWith('/admin/analytics') || pathname.startsWith('/admin/payments');
                } else if (item.href === '/admin/users') {
                  isActive =
                    pathname.startsWith('/admin/users') ||
                    pathname.startsWith('/admin/students') ||
                    pathname.startsWith('/admin/teachers') ||
                    pathname.startsWith('/admin/parents');
                }

                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all duration-150 ${isActive
                        ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-900 dark:text-primary-200 border border-primary-200 dark:border-primary-800 font-bold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 mt-0.5 ${isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200'
                        }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold tracking-tight">{item.name}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                        )}
                      </div>
                      <p
                        className={`text-[11px] leading-snug line-clamp-1 mt-0.5 ${isActive
                            ? 'text-primary-700/80 dark:text-primary-300/80'
                            : 'text-neutral-400 dark:text-neutral-500'
                          }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex-1" />

          {/* User profile & logout (sticky bottom) */}
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center font-bold text-xs text-primary-800 dark:text-primary-300 shrink-0">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-neutral-900 dark:text-white">
                  {profile?.name || 'Administrator'}
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
        <header className="h-16 px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-primary-700 dark:text-primary-400">Admin</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="capitalize text-neutral-900 dark:text-white font-medium">
                {currentSection}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 text-[11px] font-medium text-primary-800 dark:text-primary-300">
              <Sparkles className="w-3 h-3 text-primary-600 animate-pulse" />
              <span>Financial Ledger Active</span>
            </div>
            <Link
              href="/"
              target="_blank"
              className="text-xs font-medium text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 transition-colors hidden sm:flex items-center gap-1"
            >
              <span>View Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
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

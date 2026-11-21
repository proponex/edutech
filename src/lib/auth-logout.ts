'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Robust, full-stack logout function.
 * Completely purges client session, invalidates server cookies,
 * clears storage keys, and triggers a clean hard navigation.
 */
export async function performFullLogout(redirectTo: string = '/?auth=login#hero-login'): Promise<void> {
  const supabase = createClient();

  // 1. Invalidate server-side cookies via API
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch (err) {
    console.warn('[performFullLogout] Server cookie clearing warning:', err);
  }

  // 2. Invalidate client-side Supabase sessions (global and local)
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // Non-blocking fallback
  }

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Non-blocking fallback
  }

  // 3. Clear any auth-related tokens or state in localStorage & sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // Storage access may be blocked in private browsing
    }

    try {
      window.sessionStorage.clear();
    } catch {
      // Non-blocking
    }

    // 4. Force a clean page navigation to wipe memory & Next.js client router cache
    window.location.replace(redirectTo);
  }
}


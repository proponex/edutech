import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.onboarding_completed !== true) {
        redirect('/onboarding');
      }

      const role = profile.role || 'student';
      if (role === 'admin') redirect('/admin');
      if (role === 'teacher') redirect('/teacher');
      if (role === 'parent') redirect('/parent');
      redirect('/student');
    }
  } catch {
    // If not authenticated or error, redirect to landing page login section
  }

  redirect('/?auth=login#hero-login');
}

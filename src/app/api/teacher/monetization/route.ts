import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MonetizationService } from '@/lib/monetization-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get('dateRange') || undefined;
    const scope = (searchParams.get('scope') as any) || undefined;
    const duration = (searchParams.get('duration') as any) || undefined;

    const overview = await MonetizationService.getTeacherMonetizationOverview(user.id, {
      dateRange,
      scope,
      duration,
    });

    return NextResponse.json({ success: true, overview });
  } catch (err: any) {
    console.error('[API Teacher Monetization Overview Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch teacher monetization overview.' },
      { status: 500 }
    );
  }
}

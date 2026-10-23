import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MonetizationService } from '@/lib/monetization-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required.' }, { status: 400 });
    }

    const pricing = await MonetizationService.getChannelMonetizationPricing(channelId);
    return NextResponse.json({ success: true, ...pricing });
  } catch (err: any) {
    console.error('[API Monetization Pricing GET Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch pricing.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      channel_id,
      scope,
      subject_name,
      unit_id,
      is_paid,
      monthly_paise,
      six_month_paise,
      yearly_paise,
      reason,
    } = body;

    if (!channel_id || !scope) {
      return NextResponse.json(
        { error: 'channel_id and scope are required.' },
        { status: 400 }
      );
    }

    const result = await MonetizationService.saveScopePricing({
      teacherId: user.id,
      channelId: channel_id,
      scope,
      subjectName: subject_name || null,
      unitId: unit_id || null,
      isPaid: Boolean(is_paid),
      monthlyPaise: Number(monthly_paise || 0),
      sixMonthPaise: Number(six_month_paise || 0),
      yearlyPaise: Number(yearly_paise || 0),
      changedBy: user.id,
      reason: reason || 'Teacher updated monetization pricing',
    });

    return NextResponse.json({ ...result });
  } catch (err: any) {
    console.error('[API Monetization Pricing POST Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to save pricing.' },
      { status: 400 }
    );
  }
}

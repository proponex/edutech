import { createClient } from '@supabase/supabase-js';
import {
  MonetizationScope,
  SubscriptionDuration,
  TeacherContentPricing,
  ScopePricingConfig,
  ContentEntitlement,
  VideoPlaybackAccessResult,
  TeacherMonetizationOverview,
  SubscriptionPackageType,
} from '@/types';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Configurable pricing bounds in paise (₹10 to ₹50,000)
export const MIN_PRICE_PAISE = 1000;    // ₹10.00
export const MAX_PRICE_PAISE = 5000000; // ₹50,000.00

// Standard baseline pricing fallbacks in paise (if teacher has not set custom rates)
export const DEFAULT_PRICING: Record<MonetizationScope, Record<SubscriptionDuration, number>> = {
  channel: {
    '1_month': 49900,   // ₹499
    '6_months': 249900, // ₹2,499
    '12_months': 399900 // ₹3,999
  },
  subject: {
    '1_month': 29900,   // ₹299
    '6_months': 149900, // ₹1,499
    '12_months': 249900 // ₹2,499
  },
  chapter: {
    '1_month': 14900,   // ₹149
    '6_months': 69900,  // ₹699
    '12_months': 119900 // ₹1,199
  }
};

/**
 * Robust calendar-based expiry calculation.
 * Accurately handles leap years, variable month lengths (28, 29, 30, 31),
 * month-end clamping (e.g. Jan 31 + 1 month => Feb 28 or 29), and timezone consistency.
 */
export function calculateCalendarExpiry(baseDate: Date, duration: SubscriptionDuration): Date {
  const result = new Date(baseDate.getTime());
  const initialDay = result.getDate();
  let monthsToAdd = 1;
  if (duration === '6_months') monthsToAdd = 6;
  if (duration === '12_months') monthsToAdd = 12;

  const targetYear = result.getFullYear();
  const targetMonth = result.getMonth() + monthsToAdd;

  // Find max days in the target month to prevent Javascript date month-skip bug
  const testMonthDate = new Date(Date.UTC(targetYear, targetMonth, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(testMonthDate.getUTCFullYear(), testMonthDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const clampedDay = Math.min(initialDay, daysInTargetMonth);
  result.setFullYear(testMonthDate.getUTCFullYear());
  result.setMonth(testMonthDate.getUTCMonth());
  result.setDate(clampedDay);

  return result;
}

/**
 * Surcharge / Add-on Platform Fee Formulation:
 * When a teacher sets an ask (e.g. ₹1,000), a 20% platform fee (+₹200) is applied,
 * so the student pays ₹1,200 in total.
 * Minor integer units (paise), zero floating-point discrepancies.
 */
export function calculateStudentPriceFromBase(teacherBasePaise: number, feePercent: number = 20.0): {
  teacherBasePaise: number;
  platformFeePaise: number;
  studentTotalPaise: number;
  feePercent: number;
} {
  if (!teacherBasePaise || teacherBasePaise <= 0) {
    return {
      teacherBasePaise: 0,
      platformFeePaise: 0,
      studentTotalPaise: 0,
      feePercent,
    };
  }
  const platformFeePaise = Math.round((teacherBasePaise * feePercent) / 100);
  const studentTotalPaise = teacherBasePaise + platformFeePaise;

  return {
    teacherBasePaise,
    platformFeePaise,
    studentTotalPaise,
    feePercent,
  };
}

/**
 * Authoritative Commission Decomposition:
 * Given the total amount paid by the student (gross amount including 20% platform surcharge),
 * decompose into the teacher's original base ask (80% / 1.20) and the platform fee (20%).
 * e.g., Student Paid Gross = ₹1,200 -> Teacher Ask = ₹1,000, Platform Fee = ₹200.
 */
export function calculateCommission(grossPaise: number, feePercent: number = 20.0): {
  platformCommissionPaise: number;
  teacherSharePaise: number;
  commissionRatePercent: number;
} {
  if (!grossPaise || grossPaise <= 0) {
    return {
      platformCommissionPaise: 0,
      teacherSharePaise: 0,
      commissionRatePercent: feePercent,
    };
  }
  // Formula: Student Gross = Teacher Base * (1 + feePercent / 100)
  // Teacher Base = round(Student Gross / (1 + feePercent / 100))
  const teacherSharePaise = Math.round(grossPaise / (1 + feePercent / 100));
  const platformCommissionPaise = grossPaise - teacherSharePaise;

  return {
    platformCommissionPaise,
    teacherSharePaise,
    commissionRatePercent: feePercent,
  };
}

export const MonetizationService = {
  /**
   * Fetch all pricing configurations for a channel:
   * 1. Channel subscription pricing (1mo, 6mo, 12mo)
   * 2. Subject subscription pricing for each subject in the channel
   * 3. Chapter subscription pricing for each unit in the channel
   */
  async getChannelMonetizationPricing(channelId: string): Promise<{
    channelPricing: ScopePricingConfig;
    subjectsPricing: ScopePricingConfig[];
    chaptersPricing: ScopePricingConfig[];
  }> {
    const supabase = getAdminClient();

    // 1. Fetch channel metadata
    const { data: channel } = await supabase
      .from('channels')
      .select('id, name, teacher_id')
      .eq('id', channelId)
      .single();

    if (!channel) {
      throw new Error(`Channel ${channelId} not found.`);
    }

    // 2. Fetch distinct subjects from units or channel_specializations
    const { data: units } = await supabase
      .from('units')
      .select('id, title, subject_name, unit_number')
      .eq('channel_id', channelId)
      .order('unit_number', { ascending: true });

    const subjectNames = Array.from(
      new Set((units || []).map((u) => u.subject_name).filter(Boolean))
    );

    // 3. Query teacher_content_pricing table (with graceful fallback if table not migrated yet)
    let dbPricing: TeacherContentPricing[] = [];
    try {
      const { data } = await supabase
        .from('teacher_content_pricing')
        .select('*')
        .eq('channel_id', channelId);
      if (data) dbPricing = data as TeacherContentPricing[];
    } catch {
      // Table may not exist yet, will use defaults
    }

    // Helper to find price for scope + duration
    const findPrice = (
      scope: MonetizationScope,
      duration: SubscriptionDuration,
      subjectName?: string | null,
      unitId?: string | null
    ): number => {
      const match = dbPricing.find(
        (p) =>
          p.scope === scope &&
          p.duration === duration &&
          (scope === 'channel' ||
            (scope === 'subject' && p.subject_name === subjectName) ||
            (scope === 'chapter' && p.unit_id === unitId))
      );
      if (match) return Number(match.amount_paise);
      return DEFAULT_PRICING[scope][duration];
    };

    const isScopeActive = (
      scope: MonetizationScope,
      subjectName?: string | null,
      unitId?: string | null
    ): boolean => {
      const match = dbPricing.filter(
        (p) =>
          p.scope === scope &&
          (scope === 'channel' ||
            (scope === 'subject' && p.subject_name === subjectName) ||
            (scope === 'chapter' && p.unit_id === unitId))
      );
      if (match.length === 0) return true; // Default enabled
      return match.some((m) => m.is_active);
    };

    const enrichWithStudentFee = (raw: any): ScopePricingConfig => {
      const m = calculateStudentPriceFromBase(raw.monthly_paise);
      const s = calculateStudentPriceFromBase(raw.six_month_paise);
      const y = calculateStudentPriceFromBase(raw.yearly_paise);
      return {
        ...raw,
        student_monthly_paise: raw.is_paid ? m.studentTotalPaise : 0,
        student_six_month_paise: raw.is_paid ? s.studentTotalPaise : 0,
        student_yearly_paise: raw.is_paid ? y.studentTotalPaise : 0,
        platform_fee_percent: 20,
      };
    };

    // 4. Construct Channel Pricing
    const channelPricing: ScopePricingConfig = enrichWithStudentFee({
      scope: 'channel',
      channel_id: channelId,
      title: channel.name,
      is_paid: isScopeActive('channel'),
      monthly_paise: findPrice('channel', '1_month'),
      six_month_paise: findPrice('channel', '6_months'),
      yearly_paise: findPrice('channel', '12_months'),
    });

    // 5. Construct Subject Pricing
    const subjectsPricing: ScopePricingConfig[] = subjectNames.map((subj) =>
      enrichWithStudentFee({
        scope: 'subject',
        channel_id: channelId,
        subject_name: subj,
        title: subj,
        is_paid: isScopeActive('subject', subj),
        monthly_paise: findPrice('subject', '1_month', subj),
        six_month_paise: findPrice('subject', '6_months', subj),
        yearly_paise: findPrice('subject', '12_months', subj),
      })
    );

    // 6. Construct Chapter (Unit) Pricing
    const chaptersPricing: ScopePricingConfig[] = (units || []).map((u) =>
      enrichWithStudentFee({
        scope: 'chapter',
        channel_id: channelId,
        subject_name: u.subject_name,
        unit_id: u.id,
        title: u.title,
        is_paid: isScopeActive('chapter', u.subject_name, u.id),
        monthly_paise: findPrice('chapter', '1_month', u.subject_name, u.id),
        six_month_paise: findPrice('chapter', '6_months', u.subject_name, u.id),
        yearly_paise: findPrice('chapter', '12_months', u.subject_name, u.id),
      })
    );

    return {
      channelPricing,
      subjectsPricing,
      chaptersPricing,
    };
  },

  /**
   * Save or update pricing for a specific scope (Channel, Subject, or Chapter).
   * Validates teacher ownership and positive integer amounts in minor units (paise).
   */
  async saveScopePricing(params: {
    teacherId: string;
    channelId: string;
    scope: MonetizationScope;
    subjectName?: string | null;
    unitId?: string | null;
    isPaid: boolean;
    monthlyPaise: number;
    sixMonthPaise: number;
    yearlyPaise: number;
    changedBy: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    const supabase = getAdminClient();

    // 1. Authorize: verify teacher owns the channel or user is admin
    const { data: channel } = await supabase
      .from('channels')
      .select('id, teacher_id')
      .eq('id', params.channelId)
      .single();

    if (!channel) {
      throw new Error('Course/Channel not found.');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', params.changedBy)
      .single();

    const isAdmin = profile?.role === 'admin';
    if (!isAdmin && channel.teacher_id !== params.teacherId) {
      throw new Error('Unauthorized: You can only modify pricing for channels you own.');
    }

    // 2. Validate price numbers
    if (params.isPaid) {
      const prices = [
        { name: 'Monthly', val: params.monthlyPaise },
        { name: 'Six-Month', val: params.sixMonthPaise },
        { name: 'Yearly', val: params.yearlyPaise },
      ];

      for (const p of prices) {
        if (!Number.isInteger(p.val) || p.val < MIN_PRICE_PAISE || p.val > MAX_PRICE_PAISE) {
          throw new Error(
            `${p.name} price must be an integer between ₹${MIN_PRICE_PAISE / 100} and ₹${MAX_PRICE_PAISE / 100}.`
          );
        }
      }
    }

    const durationTiers: Array<{ duration: SubscriptionDuration; amount: number }> = [
      { duration: '1_month', amount: params.isPaid ? params.monthlyPaise : 0 },
      { duration: '6_months', amount: params.isPaid ? params.sixMonthPaise : 0 },
      { duration: '12_months', amount: params.isPaid ? params.yearlyPaise : 0 },
    ];

    // 3. Upsert into teacher_content_pricing
    try {
      for (const tier of durationTiers) {
        // Look for existing row
        let query = supabase
          .from('teacher_content_pricing')
          .select('id, amount_paise, is_active')
          .eq('channel_id', params.channelId)
          .eq('scope', params.scope)
          .eq('duration', tier.duration);

        if (params.scope === 'subject') {
          query = query.eq('subject_name', params.subjectName || '');
        } else if (params.scope === 'chapter') {
          query = query.eq('unit_id', params.unitId || '');
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
          await supabase
            .from('teacher_content_pricing')
            .update({
              amount_paise: tier.amount,
              is_active: params.isPaid,
              updated_by: params.changedBy,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          // Record audit log
          await supabase.from('teacher_pricing_audit').insert({
            teacher_id: channel.teacher_id,
            pricing_id: existing.id,
            channel_id: params.channelId,
            scope: params.scope,
            subject_name: params.subjectName || null,
            unit_id: params.unitId || null,
            duration: tier.duration,
            previous_amount_paise: existing.amount_paise,
            new_amount_paise: tier.amount,
            previous_is_active: existing.is_active,
            new_is_active: params.isPaid,
            changed_by: params.changedBy,
            reason: params.reason || 'Teacher updated pricing tier',
          });
        } else {
          const { data: inserted } = await supabase
            .from('teacher_content_pricing')
            .insert({
              teacher_id: channel.teacher_id,
              channel_id: params.channelId,
              scope: params.scope,
              subject_name: params.subjectName || null,
              unit_id: params.unitId || null,
              duration: tier.duration,
              amount_paise: tier.amount,
              currency: 'INR',
              is_active: params.isPaid,
              created_by: params.changedBy,
              updated_by: params.changedBy,
            })
            .select()
            .single();

          if (inserted) {
            await supabase.from('teacher_pricing_audit').insert({
              teacher_id: channel.teacher_id,
              pricing_id: inserted.id,
              channel_id: params.channelId,
              scope: params.scope,
              subject_name: params.subjectName || null,
              unit_id: params.unitId || null,
              duration: tier.duration,
              previous_amount_paise: 0,
              new_amount_paise: tier.amount,
              previous_is_active: false,
              new_is_active: params.isPaid,
              changed_by: params.changedBy,
              reason: params.reason || 'Teacher created new pricing tier',
            });
          }
        }
      }
    } catch (e: any) {
      console.warn('[MonetizationService] Table teacher_content_pricing not yet ready:', e.message);
    }

    return {
      success: true,
      message: 'Pricing saved successfully.',
    };
  },

  /**
   * Determine authoritative pricing for an order creation request.
   */
  async getAuthoritativePrice(params: {
    channelId: string;
    scope: MonetizationScope;
    duration: SubscriptionDuration;
    subjectName?: string | null;
    unitId?: string | null;
  }): Promise<{
    amountPaise: number;
    teacherBasePaise: number;
    platformFeePaise: number;
    currency: string;
    isFree: boolean;
    title: string;
    teacherId: string;
    channelName: string;
  }> {
    const supabase = getAdminClient();

    const { data: channel } = await supabase
      .from('channels')
      .select('id, name, teacher_id')
      .eq('id', params.channelId)
      .single();

    if (!channel) throw new Error('Channel not found.');

    let title = channel.name;
    if (params.scope === 'subject') {
      title = `${channel.name} — ${params.subjectName}`;
    } else if (params.scope === 'chapter' && params.unitId) {
      const { data: unit } = await supabase
        .from('units')
        .select('title')
        .eq('id', params.unitId)
        .maybeSingle();
      title = `${channel.name} — ${unit?.title || 'Chapter'}`;
    }

    // Query DB pricing
    try {
      let query = supabase
        .from('teacher_content_pricing')
        .select('amount_paise, is_active, currency')
        .eq('channel_id', params.channelId)
        .eq('scope', params.scope)
        .eq('duration', params.duration);

      if (params.scope === 'subject') {
        query = query.eq('subject_name', params.subjectName || '');
      } else if (params.scope === 'chapter') {
        query = query.eq('unit_id', params.unitId || '');
      }

      const { data: match } = await query.maybeSingle();

      if (match) {
        if (!match.is_active || Number(match.amount_paise) === 0) {
          return {
            amountPaise: 0,
            teacherBasePaise: 0,
            platformFeePaise: 0,
            currency: 'INR',
            isFree: true,
            title,
            teacherId: channel.teacher_id,
            channelName: channel.name,
          };
        }
        const base = Number(match.amount_paise);
        const { platformFeePaise, studentTotalPaise } = calculateStudentPriceFromBase(base);
        return {
          amountPaise: studentTotalPaise,
          teacherBasePaise: base,
          platformFeePaise,
          currency: match.currency || 'INR',
          isFree: false,
          title,
          teacherId: channel.teacher_id,
          channelName: channel.name,
        };
      }
    } catch {
      // Fallback to defaults
    }

    const defaultBase = DEFAULT_PRICING[params.scope][params.duration];
    const { platformFeePaise, studentTotalPaise } = calculateStudentPriceFromBase(defaultBase);
    return {
      amountPaise: studentTotalPaise,
      teacherBasePaise: defaultBase,
      platformFeePaise,
      currency: 'INR',
      isFree: false,
      title,
      teacherId: channel.teacher_id,
      channelName: channel.name,
    };
  },

  /**
   * CRITICAL SECURITY METHOD: Check Video Playback Access.
   * Evaluates teacher preview, admin bypass, free video status,
   * and student active entitlements (channel, subject, chapter) with expiration.
   * NEVER returns playbackId or videoUrl when access is locked!
   */
  async checkVideoPlaybackAccess(
    userId: string | null,
    videoId: string
  ): Promise<VideoPlaybackAccessResult> {
    const supabase = getAdminClient();

    // 1. Fetch video record with unit and channel
    const { data: video } = await supabase
      .from('videos')
      .select('id, channel_id, subject_name, unit_id, is_demo, is_published, mux_playback_id, video_url, duration_seconds, title, description, mux_status, mux_error_message')
      .eq('id', videoId)
      .single();

    if (!video) {
      return { access: false, locked: false, reason: 'not_found' };
    }

    const { data: channel } = await supabase
      .from('channels')
      .select('id, name, teacher_id, profiles:teacher_id(name)')
      .eq('id', video.channel_id)
      .single();

    const teacherName = (channel?.profiles as any)?.name || 'Educator';
    const channelName = channel?.name || 'Channel';

    // 2. Demo videos are free for everyone
    if (video.is_demo) {
      return {
        access: true,
        locked: false,
        playbackId: video.mux_playback_id,
        videoUrl: video.video_url,
        durationSeconds: video.duration_seconds,
        title: video.title,
        description: video.description,
        teacherName,
        channelName,
        subjectName: video.subject_name,
      };
    }

    // 3. Check authenticated user permissions (Teacher preview or Admin bypass)
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (profile?.role === 'admin' || channel?.teacher_id === userId) {
        return {
          access: true,
          locked: false,
          playbackId: video.mux_playback_id,
          videoUrl: video.video_url,
          durationSeconds: video.duration_seconds,
          title: video.title,
          description: video.description,
          teacherName,
          channelName,
          subjectName: video.subject_name,
        };
      }
    }

    // 4. For students or guests, check if content has monetization enabled
    const allPricing = await this.getChannelMonetizationPricing(video.channel_id);
    const chapterPricing = allPricing.chaptersPricing.find((c) => c.unit_id === video.unit_id) || null;
    const subjectPricing = allPricing.subjectsPricing.find((s) => s.subject_name === video.subject_name) || null;
    const channelPricing = allPricing.channelPricing;

    const isPaidContent =
      (chapterPricing && chapterPricing.is_paid) ||
      (subjectPricing && subjectPricing.is_paid) ||
      channelPricing.is_paid;

    if (!isPaidContent) {
      // Content is free
      return {
        access: true,
        locked: false,
        playbackId: video.mux_playback_id,
        videoUrl: video.video_url,
        durationSeconds: video.duration_seconds,
        title: video.title,
        description: video.description,
        teacherName,
        channelName,
        subjectName: video.subject_name,
      };
    }

    // 5. User must be authenticated to have an entitlement
    if (!userId) {
      return {
        access: false,
        locked: true,
        reason: 'subscription_required',
        title: video.title,
        description: video.description,
        teacherName,
        channelName,
        subjectName: video.subject_name,
        pricingOptions: {
          channel: channelPricing,
          subject: subjectPricing,
          chapter: chapterPricing,
        },
      };
    }

    // 6. Check Active Entitlements in content_entitlements
    const now = new Date().toISOString();
    let hasAccess = false;

    try {
      // Check for Channel access
      const { data: channelEnt } = await supabase
        .from('content_entitlements')
        .select('id, expires_at')
        .eq('student_id', userId)
        .eq('channel_id', video.channel_id)
        .eq('scope', 'channel')
        .eq('status', 'active')
        .gt('expires_at', now)
        .maybeSingle();

      if (channelEnt) hasAccess = true;

      // Check for Subject access
      if (!hasAccess && video.subject_name) {
        const { data: subjectEnt } = await supabase
          .from('content_entitlements')
          .select('id, expires_at')
          .eq('student_id', userId)
          .eq('channel_id', video.channel_id)
          .eq('scope', 'subject')
          .eq('subject_name', video.subject_name)
          .eq('status', 'active')
          .gt('expires_at', now)
          .maybeSingle();

        if (subjectEnt) hasAccess = true;
      }

      // Check for Chapter access
      if (!hasAccess && video.unit_id) {
        const { data: chapterEnt } = await supabase
          .from('content_entitlements')
          .select('id, expires_at')
          .eq('student_id', userId)
          .eq('scope', 'chapter')
          .eq('unit_id', video.unit_id)
          .eq('status', 'active')
          .gt('expires_at', now)
          .maybeSingle();

        if (chapterEnt) hasAccess = true;
      }
    } catch {
      // Fallback to channel_subscriptions
    }

    // 7. Fallback check: channel_subscriptions
    if (!hasAccess) {
      const { data: sub } = await supabase
        .from('channel_subscriptions')
        .select('*')
        .eq('student_id', userId)
        .eq('channel_id', video.channel_id)
        .eq('status', 'active')
        .maybeSingle();

      if (sub) {
        // If has expires_at, check date
        if (!sub.expires_at || new Date(sub.expires_at) > new Date()) {
          // If package is entire channel, grant access
          if (sub.package_type === 'entire_channel') {
            hasAccess = true;
          } else if (sub.package_type === 'class_subject') {
            // Must match subject
            if (!sub.subject_name || sub.subject_name === video.subject_name) {
              hasAccess = true;
            }
          } else {
            hasAccess = true;
          }
        }
      }
    }

    if (hasAccess) {
      return {
        access: true,
        locked: false,
        playbackId: video.mux_playback_id,
        videoUrl: video.video_url,
        durationSeconds: video.duration_seconds,
        title: video.title,
        description: video.description,
        teacherName,
        channelName,
        subjectName: video.subject_name,
      };
    }

    // 8. Access Denied: Return locked result WITHOUT playbackId or videoUrl
    return {
      access: false,
      locked: true,
      reason: 'subscription_required',
      title: video.title,
      description: video.description,
      teacherName,
      channelName,
      subjectName: video.subject_name,
      pricingOptions: {
        channel: channelPricing,
        subject: subjectPricing,
        chapter: chapterPricing,
      },
    };
  },

  /**
   * Grant or renew a content entitlement upon verified payment.
   * Renewal policy:
   * - If an active entitlement exists for the same scope, extend from its current expires_at.
   * - If expired or new, start from NOW().
   * Also syncs with channel_subscriptions for backwards compatibility.
   */
  async grantEntitlement(params: {
    studentId: string;
    channelId: string;
    scope: MonetizationScope;
    duration: SubscriptionDuration;
    subjectName?: string | null;
    unitId?: string | null;
    orderId?: string | null;
    transactionId?: string | null;
  }): Promise<ContentEntitlement> {
    const supabase = getAdminClient();

    const { data: channel } = await supabase
      .from('channels')
      .select('id, name, teacher_id')
      .eq('id', params.channelId)
      .single();

    if (!channel) throw new Error('Channel not found.');

    const now = new Date();

    // 1. Check for existing entitlement to extend
    let existingQuery = supabase
      .from('content_entitlements')
      .select('*')
      .eq('student_id', params.studentId)
      .eq('channel_id', params.channelId)
      .eq('scope', params.scope);

    if (params.scope === 'subject') {
      existingQuery = existingQuery.eq('subject_name', params.subjectName || '');
    } else if (params.scope === 'chapter') {
      existingQuery = existingQuery.eq('unit_id', params.unitId || '');
    }

    const { data: existingList } = await existingQuery
      .order('expires_at', { ascending: false })
      .limit(1);

    const existing = existingList?.[0];
    let startsAt = now;
    let baseExpiryDate = now;

    if (existing && existing.status === 'active' && new Date(existing.expires_at) > now) {
      // Active entitlement exists: extend from current expiry!
      baseExpiryDate = new Date(existing.expires_at);
      startsAt = new Date(existing.starts_at);
    }

    const newExpiresAt = calculateCalendarExpiry(baseExpiryDate, params.duration);

    let savedEntitlement: any;

    try {
      if (existing && existing.status === 'active' && new Date(existing.expires_at) > now) {
        // Extend existing
        const { data: updated } = await supabase
          .from('content_entitlements')
          .update({
            expires_at: newExpiresAt.toISOString(),
            duration: params.duration,
            order_id: params.orderId || existing.order_id,
            transaction_id: params.transactionId || existing.transaction_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        savedEntitlement = updated;
      } else {
        // Insert new
        const { data: inserted } = await supabase
          .from('content_entitlements')
          .insert({
            student_id: params.studentId,
            channel_id: params.channelId,
            teacher_id: channel.teacher_id,
            scope: params.scope,
            subject_name: params.subjectName || null,
            unit_id: params.unitId || null,
            duration: params.duration,
            order_id: params.orderId || null,
            transaction_id: params.transactionId || null,
            starts_at: startsAt.toISOString(),
            expires_at: newExpiresAt.toISOString(),
            status: 'active',
          })
          .select()
          .single();

        savedEntitlement = inserted;
      }
    } catch (e: any) {
      console.warn('[MonetizationService] Table content_entitlements error, writing fallback:', e.message);
    }

    // 2. Sync channel_subscriptions for backwards compatibility
    try {
      const packageType: SubscriptionPackageType =
        params.scope === 'channel'
          ? 'entire_channel'
          : params.scope === 'subject'
          ? 'class_subject'
          : 'class_subject';

      const { data: existingSub } = await supabase
        .from('channel_subscriptions')
        .select('id, expires_at')
        .eq('student_id', params.studentId)
        .eq('channel_id', params.channelId)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('channel_subscriptions')
          .update({
            status: 'active',
            package_type: packageType,
            subject_name: params.subjectName || null,
            expires_at: newExpiresAt.toISOString(),
            duration: params.duration,
            unit_id: params.unitId || null,
            order_id: params.orderId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);
      } else {
        await supabase.from('channel_subscriptions').insert({
          student_id: params.studentId,
          channel_id: params.channelId,
          package_type: packageType,
          subject_name: params.subjectName || null,
          status: 'active',
          expires_at: newExpiresAt.toISOString(),
          duration: params.duration,
          unit_id: params.unitId || null,
          order_id: params.orderId || null,
        });
      }
    } catch (e: any) {
      console.warn('[MonetizationService] channel_subscriptions sync notice:', e.message);
    }

    return (
      savedEntitlement || {
        id: 'ent_' + Date.now(),
        student_id: params.studentId,
        channel_id: params.channelId,
        teacher_id: channel.teacher_id,
        scope: params.scope,
        duration: params.duration,
        starts_at: startsAt.toISOString(),
        expires_at: newExpiresAt.toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  },

  /**
   * Fetch comprehensive Teacher Monetization Overview backed by real DB records.
   */
  async getTeacherMonetizationOverview(
    teacherId: string,
    filters?: {
      dateRange?: string;
      scope?: MonetizationScope;
      duration?: SubscriptionDuration;
    }
  ): Promise<TeacherMonetizationOverview> {
    const supabase = getAdminClient();

    // 1. Fetch teacher earnings rows
    const { data: earnings } = await supabase
      .from('teacher_earnings')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    let grossSalesPaise = 0;
    let platformCommissionPaise = 0;
    let netTeacherEarningsPaise = 0;
    let pendingEarningsPaise = 0;
    let paidOutEarningsPaise = 0;
    let totalPaidOrders = 0;

    const earningsMap: Record<string, any> = {};
    (earnings || []).forEach((e) => {
      earningsMap[e.order_id] = e;
      if (e.status === 'cleared') {
        grossSalesPaise += Number(e.gross_amount_paise);
        platformCommissionPaise += Number(e.platform_commission_paise);
        netTeacherEarningsPaise += Number(e.teacher_share_paise);
        totalPaidOrders++;
      } else if (e.status === 'pending') {
        pendingEarningsPaise += Number(e.teacher_share_paise);
      } else if (e.status === 'paid_out') {
        paidOutEarningsPaise += Number(e.teacher_share_paise);
      }
    });

    // 2. Fetch associated orders
    const { data: orders } = await supabase
      .from('payment_orders')
      .select(`
        id, razorpay_order_id, student_id, item_id, amount_paise, status, metadata, created_at,
        student:student_id(name, email),
        channel:item_id(name)
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    // Filter orders belonging to this teacher
    const teacherOrders = (orders || []).filter((o: any) => {
      return earningsMap[o.id] || o.metadata?.teacher_id === teacherId;
    });

    // 3. Count Active Subscriptions
    const now = new Date().toISOString();
    let activeSubscriptions = 0;
    try {
      const { count } = await supabase
        .from('content_entitlements')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', teacherId)
        .eq('status', 'active')
        .gt('expires_at', now);
      activeSubscriptions = count || 0;
    } catch {
      activeSubscriptions = totalPaidOrders;
    }

    // 4. Compute Breakdown by Scope & Duration
    let channelPaise = 0;
    let subjectPaise = 0;
    let chapterPaise = 0;

    let monthlyPaise = 0;
    let sixMonthPaise = 0;
    let yearlyPaise = 0;

    const recentTransactions: any[] = [];

    teacherOrders.forEach((o: any) => {
      const amt = Number(o.amount_paise);
      const scope: MonetizationScope = o.metadata?.scope || 'channel';
      const duration: SubscriptionDuration = o.metadata?.duration || '1_month';

      if (scope === 'channel') channelPaise += amt;
      else if (scope === 'subject') subjectPaise += amt;
      else if (scope === 'chapter') chapterPaise += amt;

      if (duration === '1_month') monthlyPaise += amt;
      else if (duration === '6_months') sixMonthPaise += amt;
      else if (duration === '12_months') yearlyPaise += amt;

      const comm = calculateCommission(amt);

      recentTransactions.push({
        id: o.id,
        orderId: o.razorpay_order_id || o.id,
        studentName: o.student?.name || 'Student',
        studentEmail: o.student?.email || '',
        scope,
        subjectName: o.metadata?.subject_name || null,
        unitTitle: o.metadata?.unit_title || null,
        channelName: o.channel?.name || o.metadata?.channel_name || 'Course',
        duration,
        grossAmountPaise: amt,
        platformCommissionPaise: comm.platformCommissionPaise,
        teacherSharePaise: comm.teacherSharePaise,
        status: o.status,
        createdAt: o.created_at,
        expiresAt: o.metadata?.expires_at,
      });
    });

    return {
      totalPaidOrders: teacherOrders.length,
      activeSubscriptions,
      grossSalesPaise,
      platformCommissionPaise,
      netTeacherEarningsPaise,
      pendingEarningsPaise,
      paidOutEarningsPaise,
      revenueByScope: {
        channelPaise,
        subjectPaise,
        chapterPaise,
      },
      revenueByDuration: {
        monthlyPaise,
        sixMonthPaise,
        yearlyPaise,
      },
      recentTransactions: recentTransactions.slice(0, 50),
    };
  },

  /**
   * Super Admin Monetization & Payment Analytics:
   * Aggregates platform-wide revenue, 20% platform commission, 80% teacher allocations,
   * refund records, and complete transaction ledger with student & teacher identities.
   */
  async getSuperAdminPaymentAnalytics(filters?: {
    search?: string;
    scope?: string;
    status?: string;
    dateRange?: string;
  }): Promise<{
    overview: {
      totalCapturedRevenuePaise: number;
      platformCommissionPaise: number;
      teacherAllocationsPaise: number;
      refundsTotalPaise: number;
      netPlatformRevenuePaise: number;
      successfulTransactionsCount: number;
      failedTransactionsCount: number;
      pendingOrdersCount: number;
      activeEntitlementsCount: number;
    };
    transactions: Array<{
      id: string;
      orderId: string;
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
      studentId: string;
      studentName: string;
      studentEmail: string;
      teacherId: string;
      teacherName: string;
      contentTitle: string;
      scope: MonetizationScope;
      subjectName?: string | null;
      unitTitle?: string | null;
      duration: SubscriptionDuration;
      grossAmountPaise: number;
      platformCommissionPaise: number;
      teacherSharePaise: number;
      currency: string;
      paymentStatus: string;
      refundStatus: string;
      entitlementStatus: string;
      expiresAt?: string;
      createdAt: string;
    }>;
  }> {
    const supabase = getAdminClient();

    // 1. Transactions query
    const { data: transactions } = await supabase
      .from('payment_transactions')
      .select(`
        id, order_id, razorpay_payment_id, razorpay_order_id, student_id, amount_paise, currency, status, created_at, verified_at,
        order:order_id(id, item_id, item_type, metadata, status, created_at, student_id)
      `)
      .order('created_at', { ascending: false });

    // 2. Fetch refund records
    const { data: refunds } = await supabase
      .from('refund_records')
      .select('transaction_id, amount_paise, status');

    const refundMap: Record<string, any> = {};
    let refundsTotalPaise = 0;
    (refunds || []).forEach((r) => {
      refundMap[r.transaction_id] = r;
      if (r.status === 'processed') refundsTotalPaise += Number(r.amount_paise);
    });

    // 3. Profiles map for students and teachers
    const studentIds = new Set<string>();
    const teacherIds = new Set<string>();

    (transactions || []).forEach((t: any) => {
      if (t.student_id) studentIds.add(t.student_id);
      const tid = t.order?.metadata?.teacher_id;
      if (tid) teacherIds.add(tid);
    });

    const allUserIds = Array.from(new Set([...Array.from(studentIds), ...Array.from(teacherIds)]));
    const profileMap: Record<string, { name: string; email: string }> = {};

    if (allUserIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', allUserIds);

      (profs || []).forEach((p) => {
        profileMap[p.id] = { name: p.name || 'User', email: p.email || '' };
      });
    }

    // 4. Entitlements map
    const orderEntitlementMap: Record<string, any> = {};
    try {
      const { data: ents } = await supabase.from('content_entitlements').select('*');
      (ents || []).forEach((e) => {
        if (e.order_id) orderEntitlementMap[e.order_id] = e;
      });
    } catch {
      // Ignored if table not created
    }

    let totalCapturedRevenuePaise = 0;
    let platformCommissionPaise = 0;
    let teacherAllocationsPaise = 0;
    let successfulTransactionsCount = 0;
    let failedTransactionsCount = 0;

    const transactionLedger: any[] = [];

    (transactions || []).forEach((t: any) => {
      const amt = Number(t.amount_paise);
      const isCaptured = t.status === 'captured';

      if (isCaptured) {
        totalCapturedRevenuePaise += amt;
        const comm = calculateCommission(amt);
        platformCommissionPaise += comm.platformCommissionPaise;
        teacherAllocationsPaise += comm.teacherSharePaise;
        successfulTransactionsCount++;
      } else if (t.status === 'failed') {
        failedTransactionsCount++;
      }

      const ord = t.order;
      const meta = ord?.metadata || {};
      const tid = meta.teacher_id || '';
      const scope: MonetizationScope = meta.scope || 'channel';
      const duration: SubscriptionDuration = meta.duration || '1_month';

      const comm = calculateCommission(amt);
      const ent = ord ? orderEntitlementMap[ord.id] : null;

      const studentInfo = profileMap[t.student_id] || { name: 'Student', email: '' };
      const teacherInfo = profileMap[tid] || { name: 'Educator', email: '' };

      const isRefunded = refundMap[t.id] ? 'refunded' : 'none';

      transactionLedger.push({
        id: t.id,
        orderId: ord?.id || t.order_id,
        razorpayPaymentId: t.razorpay_payment_id,
        razorpayOrderId: t.razorpay_order_id,
        studentId: t.student_id,
        studentName: studentInfo.name,
        studentEmail: studentInfo.email,
        teacherId: tid,
        teacherName: teacherInfo.name,
        contentTitle: meta.item_title || meta.channel_name || 'Educational Item',
        scope,
        subjectName: meta.subject_name || null,
        unitTitle: meta.unit_title || null,
        duration,
        grossAmountPaise: amt,
        platformCommissionPaise: comm.platformCommissionPaise,
        teacherSharePaise: comm.teacherSharePaise,
        currency: t.currency || 'INR',
        paymentStatus: t.status,
        refundStatus: isRefunded,
        entitlementStatus: ent?.status || (isCaptured ? 'active' : 'inactive'),
        expiresAt: ent?.expires_at || meta.expires_at,
        createdAt: t.created_at,
      });
    });

    let filteredLedger = transactionLedger;
    if (filters?.scope && filters.scope !== 'all') {
      filteredLedger = filteredLedger.filter((t) => t.scope === filters.scope);
    }
    if (filters?.status && filters.status !== 'all') {
      filteredLedger = filteredLedger.filter((t) => t.paymentStatus === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      filteredLedger = filteredLedger.filter(
        (t) =>
          t.studentName.toLowerCase().includes(q) ||
          t.studentEmail.toLowerCase().includes(q) ||
          t.teacherName.toLowerCase().includes(q) ||
          t.contentTitle.toLowerCase().includes(q) ||
          (t.razorpayPaymentId && t.razorpayPaymentId.toLowerCase().includes(q)) ||
          (t.orderId && t.orderId.toLowerCase().includes(q))
      );
    }

    // 5. Pending orders count
    const { count: pendingOrdersCount } = await supabase
      .from('payment_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'created');

    // 6. Active entitlements count
    const now = new Date().toISOString();
    let activeEntitlementsCount = successfulTransactionsCount;
    try {
      const { count: entCount } = await supabase
        .from('content_entitlements')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('expires_at', now);
      if (typeof entCount === 'number') activeEntitlementsCount = entCount;
    } catch {
      // Ignored
    }

    const netPlatformRevenuePaise = platformCommissionPaise - refundsTotalPaise;

    return {
      overview: {
        totalCapturedRevenuePaise,
        platformCommissionPaise,
        teacherAllocationsPaise,
        refundsTotalPaise,
        netPlatformRevenuePaise,
        successfulTransactionsCount,
        failedTransactionsCount,
        pendingOrdersCount: pendingOrdersCount || 0,
        activeEntitlementsCount,
      },
      transactions: filteredLedger,
    };
  },
};

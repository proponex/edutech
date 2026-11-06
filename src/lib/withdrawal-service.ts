import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { TeacherWithdrawalRequest, WithdrawalStatus, WithdrawalPaymentMethod } from '@/types';
import { AdminFinanceService } from './admin-finance-service';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin credentials missing from environment.');
  }
  return createClient(url, key);
}

// Fallback persistence file in case table has not yet been executed in Supabase SQL Editor
const FALLBACK_FILE_PATH = path.resolve(process.cwd(), '.withdrawal_requests_fallback.json');

function readFallbackStore(): TeacherWithdrawalRequest[] {
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[WithdrawalService] Failed to read fallback store:', err);
  }
  return [];
}

function writeFallbackStore(data: TeacherWithdrawalRequest[]) {
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[WithdrawalService] Failed to write fallback store:', err);
  }
}

export const WithdrawalService = {
  /**
   * Get teacher's financial withdrawal summary and history.
   * Calculates:
   * - Total teacher share earned
   * - Already disbursed / paid out amount
   * - Unpaid balance
   * - In-flight reserved balance (active 'requested' or 'processing' requests)
   * - Withdrawable available balance = Unpaid - In-flight
   */
  async getTeacherWithdrawalSummary(teacherId: string): Promise<{
    totalEarnedPaise: number;
    paidOutPaise: number;
    unpaidPaise: number;
    inFlightReservedPaise: number;
    availableForWithdrawalPaise: number;
    requests: TeacherWithdrawalRequest[];
  }> {
    const supabase = getAdminClient();

    // 1. Fetch teacher earnings rows
    const { data: earnings, error: earnErr } = await supabase
      .from('teacher_earnings')
      .select('gross_amount_paise, teacher_share_paise, status')
      .eq('teacher_id', teacherId);

    if (earnErr) {
      console.error('[WithdrawalService] Error fetching teacher earnings:', earnErr);
    }

    let totalEarnedPaise = 0;
    let paidOutPaise = 0;
    let unpaidPaise = 0;

    (earnings || []).forEach((e) => {
      const share = Number(e.teacher_share_paise) || 0;
      totalEarnedPaise += share;
      if (e.status === 'paid_out') {
        paidOutPaise += share;
      } else {
        unpaidPaise += share;
      }
    });

    // 2. Fetch withdrawal requests
    let requests: TeacherWithdrawalRequest[] = [];
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error && error.code === 'PGRST205') {
        // Table not migrated yet; read fallback store
        requests = readFallbackStore().filter((r) => r.teacher_id === teacherId);
      } else if (!error && data) {
        requests = data as TeacherWithdrawalRequest[];
      }
    } catch {
      requests = readFallbackStore().filter((r) => r.teacher_id === teacherId);
    }

    // Sort newest first
    requests.sort((a, b) => new Date(b.created_at || b.requested_at || 0).getTime() - new Date(a.created_at || a.requested_at || 0).getTime());

    // 3. Calculate in-flight reserved balance (requests in 'requested' or 'processing' state)
    let inFlightReservedPaise = 0;
    requests.forEach((r) => {
      if (r.status === 'requested' || r.status === 'processing') {
        inFlightReservedPaise += Number(r.requested_amount_paise) || 0;
      }
    });

    const availableForWithdrawalPaise = Math.max(0, unpaidPaise - inFlightReservedPaise);

    return {
      totalEarnedPaise,
      paidOutPaise,
      unpaidPaise,
      inFlightReservedPaise,
      availableForWithdrawalPaise,
      requests,
    };
  },

  /**
   * Submit a new withdrawal request for a teacher.
   * Validates:
   * - Amount must be positive and at least ₹1 (100 paise)
   * - Amount cannot exceed available withdrawable balance
   * - Valid payment destination must be provided (GPay, UPI ID, or QR code)
   */
  async createWithdrawalRequest(params: {
    teacherId: string;
    amountPaise: number;
    paymentMethod: WithdrawalPaymentMethod;
    upiId?: string | null;
    gpayNumber?: string | null;
    qrImageUrl?: string | null;
    notes?: string | null;
  }): Promise<TeacherWithdrawalRequest> {
    if (!params.teacherId) {
      throw new Error('Teacher ID is required.');
    }

    const amount = Math.round(Number(params.amountPaise) || 0);
    if (amount < 100) {
      throw new Error('Minimum withdrawal amount is ₹1.00 (100 paise).');
    }

    // Verify destination details
    const upi = params.upiId?.trim();
    const gpay = params.gpayNumber?.trim();
    const qr = params.qrImageUrl?.trim();

    if (!upi && !gpay && !qr) {
      throw new Error('Please provide at least one valid payout destination (GPay mobile number, UPI ID, or QR code image).');
    }

    // Calculate current available balance
    const summary = await this.getTeacherWithdrawalSummary(params.teacherId);
    if (amount > summary.availableForWithdrawalPaise) {
      const availRupees = (summary.availableForWithdrawalPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      });
      const reqRupees = (amount / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      });
      throw new Error(
        `Requested withdrawal amount (₹${reqRupees}) exceeds your current available withdrawable earnings (₹${availRupees}). In-flight requests are reserved.`
      );
    }

    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const newRecord: Partial<TeacherWithdrawalRequest> = {
      teacher_id: params.teacherId,
      requested_amount_paise: amount,
      currency: 'INR',
      payment_method: params.paymentMethod || 'upi',
      upi_id: upi || null,
      gpay_number: gpay || null,
      qr_image_url: qr || null,
      notes: params.notes?.trim() || null,
      status: 'requested',
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert(newRecord)
        .select()
        .single();

      if (!error && data) {
        return data as TeacherWithdrawalRequest;
      }

      if (error && error.code === 'PGRST205') {
        // Table not created in Supabase yet -> save to fallback store
        const fallbackItem: TeacherWithdrawalRequest = {
          ...(newRecord as any),
          id: 'wr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
        };
        const all = readFallbackStore();
        all.unshift(fallbackItem);
        writeFallbackStore(all);
        return fallbackItem;
      }

      throw new Error(error?.message || 'Failed to submit withdrawal request.');
    } catch (err: any) {
      if (err.message && err.message.includes('exceeds')) throw err;
      // Fallback
      const fallbackItem: TeacherWithdrawalRequest = {
        ...(newRecord as any),
        id: 'wr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
      };
      const all = readFallbackStore();
      all.unshift(fallbackItem);
      writeFallbackStore(all);
      return fallbackItem;
    }
  },

  /**
   * Admin: Get all withdrawal requests with teacher profiles, available earnings, and channel details.
   */
  async getAllWithdrawalRequests(): Promise<TeacherWithdrawalRequest[]> {
    const supabase = getAdminClient();

    let requests: TeacherWithdrawalRequest[] = [];
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code === 'PGRST205') {
        requests = readFallbackStore();
      } else if (!error && data) {
        requests = data as TeacherWithdrawalRequest[];
      }
    } catch {
      requests = readFallbackStore();
    }

    if (requests.length === 0) {
      return [];
    }

    // Fetch unique teacher IDs
    const teacherIds = Array.from(new Set(requests.map((r) => r.teacher_id)));

    const [{ data: profiles }, { data: channels }, { data: earnings }] = await Promise.all([
      supabase.from('profiles').select('id, name, email, phone, photo_url').in('id', teacherIds),
      supabase.from('channels').select('id, name, teacher_id').in('teacher_id', teacherIds),
      supabase.from('teacher_earnings').select('teacher_id, teacher_share_paise, status').in('teacher_id', teacherIds),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const channelMap = new Map<string, string[]>();
    (channels || []).forEach((c) => {
      if (c.teacher_id) {
        const cur = channelMap.get(c.teacher_id) || [];
        cur.push(c.name);
        channelMap.set(c.teacher_id, cur);
      }
    });

    const teacherAvailableMap = new Map<string, number>();
    (earnings || []).forEach((e) => {
      if (e.status !== 'paid_out' && e.teacher_id) {
        const cur = teacherAvailableMap.get(e.teacher_id) || 0;
        teacherAvailableMap.set(e.teacher_id, cur + (Number(e.teacher_share_paise) || 0));
      }
    });

    return requests.map((req) => {
      const prof = profileMap.get(req.teacher_id);
      const chs = channelMap.get(req.teacher_id) || [];
      const avail = teacherAvailableMap.get(req.teacher_id) || 0;

      return {
        ...req,
        teacher_name: prof?.name || 'Educator',
        teacher_email: prof?.email || '',
        teacher_phone: prof?.phone || null,
        teacher_photo_url: prof?.photo_url || null,
        channel_name: chs.length > 0 ? chs.join(', ') : 'Direct Channel',
        available_earnings_paise: avail,
      };
    });
  },

  /**
   * Admin: Process a withdrawal request.
   * Actions:
   * - 'processing': Admin acknowledged and is executing transfer
   * - 'completed': Requires actual external bank/UPI reference or UTR.
   *                Updates teacher_earnings to 'paid_out', records payout, updates request status.
   * - 'rejected': Requires rejection reason. Releases reserved balance.
   */
  async processWithdrawalRequest(params: {
    requestId: string;
    action: 'processing' | 'completed' | 'rejected';
    adminId?: string;
    utrReference?: string;
    adminNotes?: string;
    rejectionReason?: string;
  }): Promise<{ success: boolean; message: string; request: TeacherWithdrawalRequest }> {
    const supabase = getAdminClient();

    // 1. Find existing request
    let existing: TeacherWithdrawalRequest | null = null;
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', params.requestId)
        .maybeSingle();

      if (!error && data) {
        existing = data as TeacherWithdrawalRequest;
      }
    } catch {
      // Fallback
    }

    if (!existing) {
      const fallbackList = readFallbackStore();
      const match = fallbackList.find((r) => r.id === params.requestId);
      if (match) existing = match;
    }

    if (!existing) {
      throw new Error(`Withdrawal request with ID ${params.requestId} not found.`);
    }

    if (existing.status === 'completed') {
      throw new Error('This withdrawal request has already been completed and cannot be modified.');
    }

    const now = new Date().toISOString();
    let updatedStatus: WithdrawalStatus = existing.status;
    let payoutRef = existing.payout_reference;
    let completedAt = existing.completed_at;
    let rejectionReason = existing.rejection_reason;
    let adminNotes = params.adminNotes !== undefined ? params.adminNotes.trim() : existing.admin_notes;

    if (params.action === 'processing') {
      updatedStatus = 'processing';
    } else if (params.action === 'rejected') {
      if (!params.rejectionReason || !params.rejectionReason.trim()) {
        throw new Error('A rejection reason is required when rejecting a withdrawal request.');
      }
      updatedStatus = 'rejected';
      rejectionReason = params.rejectionReason.trim();
    } else if (params.action === 'completed') {
      if (!params.utrReference || !params.utrReference.trim()) {
        throw new Error('Bank UTR or UPI Transaction Reference is required to confirm external payout.');
      }
      updatedStatus = 'completed';
      payoutRef = params.utrReference.trim();
      completedAt = now;

      // Execute payout fulfillment in AdminFinanceService:
      // Updates matching teacher_earnings to 'paid_out' and creates payout record
      await AdminFinanceService.recordTeacherPayout({
        teacherId: existing.teacher_id,
        amountPaise: Number(existing.requested_amount_paise),
        utrReference: payoutRef,
        paymentMethod: existing.payment_method || 'upi',
        adminId: params.adminId,
        notes: `Fulfillment of withdrawal request ${existing.id}. ${adminNotes || ''}`.trim(),
      });
    }

    const updatedData: Partial<TeacherWithdrawalRequest> = {
      status: updatedStatus,
      admin_notes: adminNotes || null,
      rejection_reason: rejectionReason || null,
      payout_reference: payoutRef || null,
      processed_by: params.adminId || null,
      completed_at: completedAt || null,
      updated_at: now,
    };

    // Save update to Supabase
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update(updatedData)
        .eq('id', params.requestId)
        .select()
        .single();

      if (!error && data) {
        return {
          success: true,
          message: `Withdrawal request successfully updated to ${updatedStatus}.`,
          request: data as TeacherWithdrawalRequest,
        };
      }
    } catch {
      // Ignore
    }

    // Save to fallback store if table doesn't exist
    const fallbackList = readFallbackStore();
    const idx = fallbackList.findIndex((r) => r.id === params.requestId);
    const updatedFallback = {
      ...existing,
      ...updatedData,
    };
    if (idx !== -1) {
      fallbackList[idx] = updatedFallback;
    } else {
      fallbackList.unshift(updatedFallback);
    }
    writeFallbackStore(fallbackList);

    return {
      success: true,
      message: `Withdrawal request successfully updated to ${updatedStatus}.`,
      request: updatedFallback,
    };
  },
};

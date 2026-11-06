import { createClient } from '@supabase/supabase-js';
import { decomposeStudentPayment } from './pricing-calculator';
import {
  AdminIncomeOverview,
  AdminTransactionItem,
  AdminTeacherPendingPayout,
  PaymentAnalyticsFilters,
  PaymentAnalyticsReport,
  AdminUsersStats,
  TeacherPayoutSettings,
  Profile,
} from '@/types';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const AdminFinanceService = {
  /**
   * Tab 1: Income Overview & Financial Summary
   * Calculates Total Income, 20% Platform Income, Pending Money, Paid Teacher Cost,
   * plus full transaction ledger and teacher-grouped pending payouts.
   */
  async getIncomeDashboardData(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminIncomeOverview> {
    const supabase = getAdminClient();
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 20;

    // 1. Fetch transactions, orders, profiles, and channels in parallel
    const [
      { data: transactions, error: txError },
      { data: earnings, error: earnError },
      { data: profiles },
      { data: channels },
    ] = await Promise.all([
      supabase
        .from('payment_transactions')
        .select(`
          id, order_id, razorpay_payment_id, razorpay_order_id, student_id, amount_paise, currency, status, method, created_at, verified_at,
          order:order_id(id, item_id, item_type, metadata, status, created_at, student_id)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('teacher_earnings')
        .select('*'),
      supabase
        .from('profiles')
        .select('id, name, email, phone, photo_url, role, status'),
      supabase
        .from('channels')
        .select('id, name, teacher_id'),
    ]);

    if (txError) console.warn('[AdminFinanceService] Transactions error:', txError);
    if (earnError) console.warn('[AdminFinanceService] Earnings error:', earnError);

    // Profile lookup map
    const profileMap: Record<string, Profile> = {};
    (profiles || []).forEach((p) => {
      profileMap[p.id] = p as Profile;
    });

    // Channel lookup map
    const channelMap: Record<string, { id: string; name: string; teacher_id: string }> = {};
    (channels || []).forEach((c) => {
      channelMap[c.id] = c;
    });

    // Earnings lookup map by transaction_id
    const earningsByTx: Record<string, any> = {};
    (earnings || []).forEach((e) => {
      if (e.transaction_id) {
        earningsByTx[e.transaction_id] = e;
      }
    });

    // Payout settings lookup map (with safe fallback if table not yet created)
    let payoutSettingsMap: Record<string, TeacherPayoutSettings> = {};
    try {
      const { data: settings } = await supabase.from('teacher_payout_settings').select('*');
      (settings || []).forEach((s) => {
        payoutSettingsMap[s.teacher_id] = s;
      });
    } catch {
      // Table may not exist yet
    }

    // Payout disbursements records lookup (with safe fallback)
    let payoutRecords: any[] = [];
    try {
      const { data: payouts } = await supabase.from('teacher_payouts').select('*');
      if (payouts) payoutRecords = payouts;
    } catch {
      // Table may not exist yet
    }

    // 2. Compute 4 Main Financial Summary Cards
    // Card 1: Total successful payment amount received through the platform
    let totalIncomePaise = 0;
    // Card 2: Total platform fee earned (20% of eligible teacher-channel payment)
    let totalPlatformIncomePaise = 0;
    // Card 3: Total amount the platform still needs to pay teachers (Pending Money)
    let pendingMoneyPaise = 0;
    // Card 4: Total amount already successfully paid to teachers (Paid Teacher Cost)
    let paidTeacherCostPaise = 0;

    (transactions || []).forEach((t: any) => {
      if (t.status === 'captured') {
        const amt = Number(t.amount_paise) || 0;
        totalIncomePaise += amt;
      }
    });

    // Calculate Platform fee and Teacher payout totals from teacher_earnings
    (earnings || []).forEach((e: any) => {
      const platShare = Number(e.platform_commission_paise) || 0;
      const teachShare = Number(e.teacher_share_paise) || 0;

      totalPlatformIncomePaise += platShare;

      if (e.status === 'paid_out') {
        paidTeacherCostPaise += teachShare;
      } else if (e.status === 'cleared' || e.status === 'pending') {
        pendingMoneyPaise += teachShare;
      }
    });

    // If teacher_earnings had no records yet but there were captured transactions,
    // compute standard 20% platform / 80% pending teacher fee
    if (earnings?.length === 0 && totalIncomePaise > 0) {
      const dec = decomposeStudentPayment(totalIncomePaise);
      totalPlatformIncomePaise = dec.platformCommissionPaise;
      pendingMoneyPaise = dec.teacherSharePaise;
    }

    // 3. Build Full Transaction Ledger
    const allTransactionRows: AdminTransactionItem[] = [];

    (transactions || []).forEach((t: any) => {
      const ord = t.order;
      const meta = ord?.metadata || {};
      const amt = Number(t.amount_paise) || 0;

      // Teacher identification: check order metadata, channels table, or fallback
      let teacherId = meta.teacher_id;
      let channelName = meta.channel_name || meta.item_title;

      if (!teacherId && ord?.item_id && channelMap[ord.item_id]) {
        teacherId = channelMap[ord.item_id].teacher_id;
        channelName = channelMap[ord.item_id].name;
      }

      // Check earnings row if exists
      const earnRow = earningsByTx[t.id];
      if (!teacherId && earnRow?.teacher_id) {
        teacherId = earnRow.teacher_id;
      }

      const dec = decomposeStudentPayment(amt);
      const platformFeePaise = earnRow ? Number(earnRow.platform_commission_paise) : dec.platformCommissionPaise;
      const teacherEarningPaise = earnRow ? Number(earnRow.teacher_share_paise) : dec.teacherSharePaise;

      const payoutStatus = earnRow ? earnRow.status : 'pending';

      const student = profileMap[t.student_id];
      const teacher = teacherId ? profileMap[teacherId] : undefined;

      allTransactionRows.push({
        id: t.id,
        transactionId: t.id,
        orderId: ord?.id || t.order_id,
        razorpayPaymentId: t.razorpay_payment_id || null,
        razorpayOrderId: t.razorpay_order_id || null,
        studentId: t.student_id,
        studentName: student?.name || 'Student',
        studentEmail: student?.email,
        teacherId: teacherId || '',
        teacherName: teacher?.name || 'Educator',
        channelId: ord?.item_id,
        channelName: channelName || 'Channel Content',
        totalAmountPaise: amt,
        platformFeePaise,
        teacherEarningPaise,
        currency: t.currency || 'INR',
        paymentDate: t.verified_at || t.created_at,
        paymentStatus: t.status,
        teacherPayoutStatus: payoutStatus === 'paid_out' ? 'paid_out' : 'pending',
        method: t.method || null,
      });
    });

    // 4. Apply search filter to transactions
    let filteredTransactions = allTransactionRows;
    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim().toLowerCase();
      filteredTransactions = allTransactionRows.filter((tx) =>
        tx.studentName.toLowerCase().includes(q) ||
        (tx.studentEmail && tx.studentEmail.toLowerCase().includes(q)) ||
        tx.teacherName.toLowerCase().includes(q) ||
        tx.channelName.toLowerCase().includes(q) ||
        tx.transactionId.toLowerCase().includes(q) ||
        (tx.razorpayPaymentId && tx.razorpayPaymentId.toLowerCase().includes(q)) ||
        (tx.razorpayOrderId && tx.razorpayOrderId.toLowerCase().includes(q))
      );
    }

    // 5. Build Grouped Pending Payments by Teacher
    // Group all teacher earnings by teacherId
    const teacherEarningsMap: Record<
      string,
      {
        totalPaymentsCount: number;
        totalGrossPaise: number;
        totalEarningsPaise: number;
        alreadyPaidPaise: number;
        remainingPendingPaise: number;
        channelIds: Set<string>;
      }
    > = {};

    (earnings || []).forEach((e: any) => {
      const tid = e.teacher_id;
      if (!tid) return;

      if (!teacherEarningsMap[tid]) {
        teacherEarningsMap[tid] = {
          totalPaymentsCount: 0,
          totalGrossPaise: 0,
          totalEarningsPaise: 0,
          alreadyPaidPaise: 0,
          remainingPendingPaise: 0,
          channelIds: new Set<string>(),
        };
      }

      teacherEarningsMap[tid].totalPaymentsCount++;
      teacherEarningsMap[tid].totalGrossPaise += Number(e.gross_amount_paise) || 0;
      const share = Number(e.teacher_share_paise) || 0;
      teacherEarningsMap[tid].totalEarningsPaise += share;

      if (e.status === 'paid_out') {
        teacherEarningsMap[tid].alreadyPaidPaise += share;
      } else {
        teacherEarningsMap[tid].remainingPendingPaise += share;
      }
    });

    // Also link channels for each teacher
    (channels || []).forEach((c) => {
      if (c.teacher_id && teacherEarningsMap[c.teacher_id]) {
        teacherEarningsMap[c.teacher_id].channelIds.add(c.name);
      }
    });

    // Build pending payment list
    const pendingPayments: AdminTeacherPendingPayout[] = [];

    // Include teachers with earnings or all teachers with channels
    const teacherIdList = Object.keys(teacherEarningsMap);

    // If there are registered teachers with channels who have not yet received earnings,
    // also include them so admin sees zero pending balance
    (profiles || []).forEach((p) => {
      if (p.role === 'teacher' && !teacherEarningsMap[p.id]) {
        teacherIdList.push(p.id);
        teacherEarningsMap[p.id] = {
          totalPaymentsCount: 0,
          totalGrossPaise: 0,
          totalEarningsPaise: 0,
          alreadyPaidPaise: 0,
          remainingPendingPaise: 0,
          channelIds: new Set<string>(),
        };
        (channels || []).forEach((c) => {
          if (c.teacher_id === p.id) {
            teacherEarningsMap[p.id].channelIds.add(c.name);
          }
        });
      }
    });

    teacherIdList.forEach((tid) => {
      const tProf = profileMap[tid];
      const tData = teacherEarningsMap[tid];
      const bank = payoutSettingsMap[tid] || {};
      const channelNames = Array.from(tData.channelIds);

      pendingPayments.push({
        teacherId: tid,
        teacherName: tProf?.name || 'Educator',
        teacherEmail: tProf?.email || '',
        teacherPhone: tProf?.phone || null,
        teacherPhotoUrl: tProf?.photo_url || null,
        channelName: channelNames.length > 0 ? channelNames.join(', ') : 'Direct Channel',
        totalSuccessfulPaymentsCount: tData.totalPaymentsCount,
        totalTeacherEarningsPaise: tData.totalEarningsPaise,
        alreadyPaidAmountPaise: tData.alreadyPaidPaise,
        remainingPendingAmountPaise: tData.remainingPendingPaise,
        bankDetails: {
          accountHolderName: bank.account_holder_name || tProf?.name || null,
          bankName: bank.bank_name || null,
          accountNumber: bank.account_number || null,
          ifscCode: bank.ifsc_code || null,
          upiId: bank.upi_id || null,
          accountType: bank.account_type || 'savings',
        },
      });
    });

    // Sort pending payments: teachers with highest remaining pending amount first
    pendingPayments.sort((a, b) => b.remainingPendingAmountPaise - a.remainingPendingAmountPaise);

    return {
      totalIncomePaise,
      totalPlatformIncomePaise,
      pendingMoneyPaise,
      paidTeacherCostPaise,
      transactions: filteredTransactions,
      pendingPayments,
    };
  },

  /**
   * Action: Mark as Paid / Complete Payment
   * Admin executes external transfer (NEFT/RTGS/IMPS/UPI) and records UTR reference.
   * Updates teacher's earnings to 'paid_out', inserts teacher_payouts record,
   * updates Card 4 and reduces Card 3 automatically.
   */
  async recordTeacherPayout(params: {
    teacherId: string;
    amountPaise?: number;
    utrReference: string;
    paymentMethod?: string;
    adminId?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    paidAmountPaise: number;
    remainingPendingPaise: number;
    message: string;
  }> {
    if (!params.utrReference || !params.utrReference.trim()) {
      throw new Error('UTR Reference or Transaction ID is required to mark payment as completed.');
    }

    const supabase = getAdminClient();

    // 1. Fetch teacher's pending/cleared earnings
    const { data: pendingEarnings, error: earnError } = await supabase
      .from('teacher_earnings')
      .select('*')
      .eq('teacher_id', params.teacherId)
      .in('status', ['cleared', 'pending']);

    if (earnError) {
      throw new Error(`Failed to fetch pending earnings: ${earnError.message}`);
    }

    let totalPendingPaise = 0;
    (pendingEarnings || []).forEach((e) => {
      totalPendingPaise += Number(e.teacher_share_paise) || 0;
    });

    if (totalPendingPaise <= 0) {
      return {
        success: true,
        paidAmountPaise: 0,
        remainingPendingPaise: 0,
        message: 'No pending earnings found for this teacher.',
      };
    }

    const amountToPayPaise = params.amountPaise && params.amountPaise > 0
      ? Math.min(params.amountPaise, totalPendingPaise)
      : totalPendingPaise;

    // 2. Mark matching teacher earnings as 'paid_out'
    const earningIdsToUpdate = (pendingEarnings || []).map((e) => e.id);

    if (earningIdsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('teacher_earnings')
        .update({
          status: 'paid_out',
          updated_at: new Date().toISOString(),
        })
        .in('id', earningIdsToUpdate);

      if (updateError) {
        throw new Error(`Failed to update earnings status: ${updateError.message}`);
      }
    }

    // 3. Record payout in teacher_payouts table (with graceful fallback if table not yet created)
    try {
      await supabase.from('teacher_payouts').insert({
        teacher_id: params.teacherId,
        amount_paise: amountToPayPaise,
        currency: 'INR',
        status: 'completed',
        utr_reference: params.utrReference.trim(),
        payment_method: params.paymentMethod || 'bank_transfer',
        admin_id: params.adminId || null,
        notes: params.notes || null,
        completed_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('[AdminFinanceService] teacher_payouts insert fallback:', e.message);
    }

    return {
      success: true,
      paidAmountPaise: amountToPayPaise,
      remainingPendingPaise: totalPendingPaise - amountToPayPaise,
      message: `Successfully recorded disbursement of ₹${(amountToPayPaise / 100).toFixed(2)} with UTR ${params.utrReference.trim()}.`,
    };
  },

  /**
   * Save or update teacher bank/UPI payout settings
   */
  async saveTeacherPayoutSettings(settings: TeacherPayoutSettings): Promise<{ success: boolean }> {
    const supabase = getAdminClient();

    try {
      const { error } = await supabase.from('teacher_payout_settings').upsert(
        {
          teacher_id: settings.teacher_id,
          account_holder_name: settings.account_holder_name || null,
          bank_name: settings.bank_name || null,
          account_number: settings.account_number || null,
          ifsc_code: settings.ifsc_code || null,
          upi_id: settings.upi_id || null,
          account_type: settings.account_type || 'savings',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'teacher_id' }
      );

      if (error) console.warn('[AdminFinanceService] saveTeacherPayoutSettings error:', error.message);
    } catch (e: any) {
      console.warn('[AdminFinanceService] Payout settings table warning:', e.message);
    }

    return { success: true };
  },

  /**
   * Tab 2: Payment Analytics
   * Provides master filtering across date range, teacher, student, channel, payment status, payout status, and method.
   * Computes real time-series charts, distribution visuals, and revenue metrics.
   */
  async getPaymentAnalytics(filters?: PaymentAnalyticsFilters): Promise<PaymentAnalyticsReport> {
    const supabase = getAdminClient();

    // 1. Fetch authoritative datasets
    const [
      { data: transactions },
      { data: earnings },
      { data: profiles },
      { data: channels },
    ] = await Promise.all([
      supabase
        .from('payment_transactions')
        .select(`
          id, order_id, razorpay_payment_id, student_id, amount_paise, currency, status, method, created_at, verified_at,
          order:order_id(id, item_id, item_type, metadata, status, created_at, student_id)
        `)
        .order('created_at', { ascending: true }),
      supabase.from('teacher_earnings').select('*'),
      supabase.from('profiles').select('id, name, email, role'),
      supabase.from('channels').select('id, name, teacher_id'),
    ]);

    const profileMap: Record<string, Profile> = {};
    (profiles || []).forEach((p) => {
      profileMap[p.id] = p as Profile;
    });

    const channelMap: Record<string, { id: string; name: string; teacher_id: string }> = {};
    (channels || []).forEach((c) => {
      channelMap[c.id] = c;
    });

    const earningsByTx: Record<string, any> = {};
    (earnings || []).forEach((e) => {
      if (e.transaction_id) earningsByTx[e.transaction_id] = e;
    });

    // 2. Date Filtering Logic
    const now = new Date();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const range = filters?.dateRange || 'all';

    if (range === 'today') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'this_month') {
      minDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'last_month') {
      minDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      maxDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (range === 'custom') {
      if (filters?.startDate) minDate = new Date(filters.startDate);
      if (filters?.endDate) maxDate = new Date(filters.endDate);
    }

    // 3. Filter Transactions
    const filteredTx = (transactions || []).filter((t: any) => {
      const txDate = new Date(t.created_at);

      if (minDate && txDate < minDate) return false;
      if (maxDate && txDate > maxDate) return false;

      // Status filter
      if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
        if (t.status !== filters.paymentStatus) return false;
      }

      // Method filter
      if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
        if ((t.method || '').toLowerCase() !== filters.paymentMethod.toLowerCase()) return false;
      }

      // Student filter
      if (filters?.studentId && t.student_id !== filters.studentId) return false;

      // Teacher filter
      const ord = t.order;
      const meta = ord?.metadata || {};
      let tid = meta.teacher_id;
      if (!tid && ord?.item_id && channelMap[ord.item_id]) {
        tid = channelMap[ord.item_id].teacher_id;
      }
      if (!tid && earningsByTx[t.id]) {
        tid = earningsByTx[t.id].teacher_id;
      }
      if (filters?.teacherId && tid !== filters.teacherId) return false;

      // Channel filter
      if (filters?.channelId && ord?.item_id !== filters.channelId) return false;

      // Payout status filter
      if (filters?.payoutStatus && filters.payoutStatus !== 'all') {
        const e = earningsByTx[t.id];
        const isCompleted = e?.status === 'paid_out';
        if (filters.payoutStatus === 'completed' && !isCompleted) return false;
        if (filters.payoutStatus === 'pending' && isCompleted) return false;
      }

      return true;
    });

    // 4. Aggregate Analytics Metrics
    let totalRevenuePaise = 0;
    let platformIncomePaise = 0;
    let teacherEarningsPaise = 0;
    let successfulTransactionsCount = 0;
    let failedTransactionsCount = 0;

    const dailyMap: Record<
      string,
      { revenuePaise: number; platformFeePaise: number; teacherSharePaise: number }
    > = {};

    const teacherRevenueMap: Record<string, { revenuePaise: number; students: Set<string> }> = {};
    const channelRevenueMap: Record<string, { revenuePaise: number; students: Set<string>; teacherId: string }> = {};

    filteredTx.forEach((t: any) => {
      const isSuccess = t.status === 'captured';
      const amt = Number(t.amount_paise) || 0;

      if (isSuccess) {
        successfulTransactionsCount++;
        totalRevenuePaise += amt;

        const { teacherSharePaise: teach, platformCommissionPaise: fee } = decomposeStudentPayment(amt);
        platformIncomePaise += fee;
        teacherEarningsPaise += teach;

        // Group by day (YYYY-MM-DD)
        const dateStr = t.created_at.slice(0, 10);
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { revenuePaise: 0, platformFeePaise: 0, teacherSharePaise: 0 };
        }
        dailyMap[dateStr].revenuePaise += amt;
        dailyMap[dateStr].platformFeePaise += fee;
        dailyMap[dateStr].teacherSharePaise += teach;

        // Teacher attribution
        const ord = t.order;
        const meta = ord?.metadata || {};
        let tid = meta.teacher_id;
        let cid = ord?.item_id;

        if (!tid && cid && channelMap[cid]) {
          tid = channelMap[cid].teacher_id;
        }
        if (!tid && earningsByTx[t.id]) {
          tid = earningsByTx[t.id].teacher_id;
        }

        if (tid) {
          if (!teacherRevenueMap[tid]) {
            teacherRevenueMap[tid] = { revenuePaise: 0, students: new Set<string>() };
          }
          teacherRevenueMap[tid].revenuePaise += amt;
          if (t.student_id) teacherRevenueMap[tid].students.add(t.student_id);
        }

        if (cid) {
          if (!channelRevenueMap[cid]) {
            channelRevenueMap[cid] = { revenuePaise: 0, students: new Set<string>(), teacherId: tid || '' };
          }
          channelRevenueMap[cid].revenuePaise += amt;
          if (t.student_id) channelRevenueMap[cid].students.add(t.student_id);
        }
      } else if (t.status === 'failed') {
        failedTransactionsCount++;
      }
    });

    const totalTransactionsCount = filteredTx.length;
    const successRatePercent = totalTransactionsCount > 0
      ? Math.round((successfulTransactionsCount / totalTransactionsCount) * 100)
      : 100;
    const averageTransactionValuePaise = successfulTransactionsCount > 0
      ? Math.round(totalRevenuePaise / successfulTransactionsCount)
      : 0;

    // Payout breakdown
    let completedPayoutsPaise = 0;
    let pendingPayoutsPaise = 0;
    (earnings || []).forEach((e: any) => {
      const share = Number(e.teacher_share_paise) || 0;
      if (e.status === 'paid_out') {
        completedPayoutsPaise += share;
      } else if (e.status === 'cleared' || e.status === 'pending') {
        pendingPayoutsPaise += share;
      }
    });

    // Sort time-series chart chronologically
    const revenueOverTime = Object.entries(dailyMap)
      .map(([date, d]) => ({
        date,
        revenuePaise: d.revenuePaise,
        platformFeePaise: d.platformFeePaise,
        teacherSharePaise: d.teacherSharePaise,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top Teachers ranked by revenue
    const topTeachers = Object.entries(teacherRevenueMap)
      .map(([teacherId, d]) => ({
        teacherId,
        teacherName: profileMap[teacherId]?.name || 'Educator',
        revenuePaise: d.revenuePaise,
        studentCount: d.students.size,
      }))
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 10);

    // Top Channels ranked by revenue
    const topChannels = Object.entries(channelRevenueMap)
      .map(([channelId, d]) => ({
        channelId,
        channelName: channelMap[channelId]?.name || 'Channel Content',
        teacherName: profileMap[d.teacherId]?.name || 'Educator',
        revenuePaise: d.revenuePaise,
        subscriberCount: d.students.size,
      }))
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 10);

    return {
      summary: {
        totalRevenuePaise,
        platformIncomePaise,
        teacherEarningsPaise,
        completedPayoutsPaise,
        pendingPayoutsPaise,
        totalTransactionsCount,
        successfulTransactionsCount,
        failedTransactionsCount,
        successRatePercent,
        averageTransactionValuePaise,
      },
      charts: {
        revenueOverTime,
        payoutStatusBreakdown: {
          pendingPaise: pendingPayoutsPaise,
          completedPaise: completedPayoutsPaise,
        },
        paymentStatusBreakdown: {
          success: successfulTransactionsCount,
          failed: failedTransactionsCount,
        },
        topTeachers,
        topChannels,
      },
    };
  },

  /**
   * Tab 3: Users Overview & Management
   * Provides real counts for Students, Teachers, Parents, and detailed role-based listings.
   */
  async getUsersDashboardData(params: {
    role: 'student' | 'teacher' | 'parent';
    search?: string;
    statusFilter?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    stats: AdminUsersStats;
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const supabase = getAdminClient();
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Fetch live counts for all 3 categories
    const [
      { count: studentCount },
      { count: teacherCount },
      { count: parentCount },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
    ]);

    const stats: AdminUsersStats = {
      totalStudents: studentCount || 0,
      totalTeachers: teacherCount || 0,
      totalParents: parentCount || 0,
    };

    // 2. Query users for current selected role
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', params.role)
      .order('created_at', { ascending: false });

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,id.eq.${q}`);
    }

    if (params.statusFilter && params.statusFilter !== 'all') {
      query = query.eq('status', params.statusFilter);
    }

    query = query.range(from, to);

    const { data: users, count, error } = await query;
    if (error) {
      console.warn('[AdminFinanceService] getUsers error:', error.message);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // 3. Enrich user details based on role
    const userIds = (users || []).map((u) => u.id);
    const enrichedUsers: any[] = [];

    if (params.role === 'student' && userIds.length > 0) {
      // Find subscriptions and payments
      const { data: subs } = await supabase
        .from('channel_subscriptions')
        .select('student_id, channel_id, expires_at, channels(name)')
        .in('student_id', userIds);

      const { data: txs } = await supabase
        .from('payment_transactions')
        .select('student_id, amount_paise, status')
        .eq('status', 'captured')
        .in('student_id', userIds);

      const subMap: Record<string, any[]> = {};
      (subs || []).forEach((s: any) => {
        if (!subMap[s.student_id]) subMap[s.student_id] = [];
        subMap[s.student_id].push(s);
      });

      const spendMap: Record<string, number> = {};
      (txs || []).forEach((t: any) => {
        spendMap[t.student_id] = (spendMap[t.student_id] || 0) + (Number(t.amount_paise) || 0);
      });

      (users || []).forEach((u) => {
        enrichedUsers.push({
          ...u,
          subscriptions: subMap[u.id] || [],
          totalSpentPaise: spendMap[u.id] || 0,
        });
      });
    } else if (params.role === 'teacher' && userIds.length > 0) {
      // Find teacher channels and earnings
      const { data: teacherChannels } = await supabase
        .from('channels')
        .select('id, name, teacher_id')
        .in('teacher_id', userIds);

      const { data: teacherEarnings } = await supabase
        .from('teacher_earnings')
        .select('teacher_id, teacher_share_paise, status')
        .in('teacher_id', userIds);

      const chMap: Record<string, any[]> = {};
      (teacherChannels || []).forEach((c) => {
        if (!chMap[c.teacher_id]) chMap[c.teacher_id] = [];
        chMap[c.teacher_id].push(c);
      });

      const earnMap: Record<string, { totalEarnings: number; pendingEarnings: number; paidEarnings: number }> = {};
      (teacherEarnings || []).forEach((e: any) => {
        if (!earnMap[e.teacher_id]) {
          earnMap[e.teacher_id] = { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0 };
        }
        const s = Number(e.teacher_share_paise) || 0;
        earnMap[e.teacher_id].totalEarnings += s;
        if (e.status === 'paid_out') {
          earnMap[e.teacher_id].paidEarnings += s;
        } else {
          earnMap[e.teacher_id].pendingEarnings += s;
        }
      });

      (users || []).forEach((u) => {
        enrichedUsers.push({
          ...u,
          channels: chMap[u.id] || [],
          earnings: earnMap[u.id] || { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0 },
        });
      });
    } else if (params.role === 'parent' && userIds.length > 0) {
      // Find linked students
      let parentStudents: any[] = [];
      try {
        const { data: ps } = await supabase
          .from('parent_students')
          .select('parent_id, student_id, student:profiles!student_id(id, name, email)')
          .in('parent_id', userIds);
        if (ps) parentStudents = ps;
      } catch {
        // Table may vary
      }

      const psMap: Record<string, any[]> = {};
      parentStudents.forEach((p: any) => {
        if (!psMap[p.parent_id]) psMap[p.parent_id] = [];
        if (p.student) psMap[p.parent_id].push(p.student);
      });

      (users || []).forEach((u) => {
        enrichedUsers.push({
          ...u,
          linkedStudents: psMap[u.id] || [],
        });
      });
    } else {
      enrichedUsers.push(...(users || []));
    }

    return {
      stats,
      users: enrichedUsers,
      total,
      page,
      totalPages,
    };
  },
};


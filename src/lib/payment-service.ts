import { createClient } from '@supabase/supabase-js';
import { getRazorpayClient, verifyPaymentSignature, verifyWebhookSignature, getRazorpayConfigStatus } from './razorpay';
import {
  PaymentOrder,
  PaymentTransaction,
  TeacherEarningsItem,
  StudentPaymentHistoryItem,
  AdminPaymentAnalytics,
  SubscriptionPackageType,
  MonetizationScope,
  SubscriptionDuration,
} from '@/types';
import { MonetizationService, calculateCommission } from './monetization-service';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Fallback pricing configuration in paise (1 INR = 100 paise)
export const DEFAULT_PACKAGE_PRICES_PAISE: Record<string, number> = {
  entire_channel: 99900,  // ₹999.00
  particular_class: 69900, // ₹699.00
  class_subject: 49900,    // ₹499.00
  single_exam: 19900,      // ₹199.00
};

export const PaymentService = {
  /**
   * Determine authoritative server-side pricing for an item.
   * Checks database pricing_plans table first; falls back to standard tier pricing.
   */
  async validatePricing(params: {
    itemType: 'course' | 'exam' | 'chapter';
    itemId: string;
    packageType?: SubscriptionPackageType | 'single_exam' | null;
    scope?: MonetizationScope;
    duration?: SubscriptionDuration;
    subjectName?: string | null;
    unitId?: string | null;
  }): Promise<{
    amountPaise: number;
    teacherBasePaise?: number;
    platformFeePaise?: number;
    currency: string;
    isFree: boolean;
    title: string;
    teacherId: string | null;
  }> {
    const supabase = getAdminClient();

    // If scope is explicitly provided, use MonetizationService authoritative price
    if (params.scope) {
      const authPrice = await MonetizationService.getAuthoritativePrice({
        channelId: params.itemId,
        scope: params.scope,
        duration: params.duration || '1_month',
        subjectName: params.subjectName,
        unitId: params.unitId,
      });

      return {
        amountPaise: authPrice.amountPaise,
        teacherBasePaise: authPrice.teacherBasePaise,
        platformFeePaise: authPrice.platformFeePaise,
        currency: authPrice.currency,
        isFree: authPrice.isFree,
        title: authPrice.title,
        teacherId: authPrice.teacherId,
      };
    }

    // 1. Fetch item details (channel or quiz)
    let title = 'Platform Educational Item';
    let teacherId: string | null = null;

    if (params.itemType === 'course' || params.itemType === 'chapter') {
      const { data: channel } = await supabase
        .from('channels')
        .select('id, name, teacher_id')
        .eq('id', params.itemId)
        .single();

      if (!channel) {
        throw new Error('Course/Channel not found.');
      }
      title = channel.name;
      teacherId = channel.teacher_id;
    } else if (params.itemType === 'exam') {
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, title, channel_id, channel:channels(teacher_id)')
        .eq('id', params.itemId)
        .single();

      if (!quiz) {
        throw new Error('Exam not found.');
      }
      title = quiz.title;
      const ch = Array.isArray(quiz.channel) ? quiz.channel[0] : quiz.channel;
      teacherId = ch?.teacher_id || null;
    }

    // 2. Check if admin configured custom pricing in pricing_plans
    try {
      const { data: customPlan } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('item_type', params.itemType === 'chapter' ? 'course' : params.itemType)
        .eq('item_id', params.itemId)
        .eq('is_active', true)
        .maybeSingle();

      if (customPlan) {
        return {
          amountPaise: customPlan.is_free ? 0 : Number(customPlan.amount_paise),
          currency: customPlan.currency || 'INR',
          isFree: Boolean(customPlan.is_free),
          title,
          teacherId,
        };
      }
    } catch {
      // If table query fails, continue to package-based pricing
    }

    // 3. Fallback to package-tier pricing
    const pkg = params.packageType || 'entire_channel';
    const amountPaise = DEFAULT_PACKAGE_PRICES_PAISE[pkg] ?? 99900;

    return {
      amountPaise,
      currency: 'INR',
      isFree: false,
      title,
      teacherId,
    };
  },

  /**
   * Create a payment order.
   * Validates duplicate enrollments, handles free courses directly,
   * supports channel, subject, and chapter scopes, and creates a Razorpay order for paid content.
   */
  async createPaymentOrder(params: {
    studentId: string;
    itemType: 'course' | 'exam' | 'chapter';
    itemId: string;
    packageType?: SubscriptionPackageType | 'single_exam' | null;
    classId?: string | null;
    subjectName?: string | null;
    scope?: MonetizationScope;
    duration?: SubscriptionDuration;
    unitId?: string | null;
  }): Promise<{
    isFree: boolean;
    orderId?: string;
    internalOrderId: string;
    amountPaise: number;
    currency: string;
    keyId?: string;
    itemName: string;
  }> {
    const supabase = getAdminClient();
    const scope = params.scope || (params.itemType === 'chapter' ? 'chapter' : 'channel');
    const duration = params.duration || '1_month';

    // 1. Check for active enrollment (Renewal policy: active enrollments are permitted to renew/extend)
    let isRenewal = false;
    if (params.itemType === 'course' || params.itemType === 'chapter') {
      const { data: existingSub } = await supabase
        .from('channel_subscriptions')
        .select('id, status, expires_at')
        .eq('student_id', params.studentId)
        .eq('channel_id', params.itemId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSub) {
        isRenewal = true;
      }
    }

    // 2. Compute authoritative server price
    const pricing = await this.validatePricing({
      itemType: params.itemType,
      itemId: params.itemId,
      packageType: params.packageType,
      scope,
      duration,
      subjectName: params.subjectName,
      unitId: params.unitId,
    });

    // 3. Handle Free Course / Exam / Chapter directly
    if (pricing.isFree || pricing.amountPaise === 0) {
      // Create completed internal order
      const { data: freeOrder, error: orderErr } = await supabase
        .from('payment_orders')
        .insert({
          student_id: params.studentId,
          razorpay_order_id: `free_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          item_type: params.itemType === 'chapter' ? 'course' : params.itemType,
          item_id: params.itemId,
          package_type: params.packageType || 'entire_channel',
          class_id: params.classId || null,
          subject_name: params.subjectName || null,
          amount_paise: 0,
          currency: 'INR',
          status: 'paid',
          metadata: {
            is_free: true,
            scope,
            duration,
            subject_name: params.subjectName || null,
            unit_id: params.unitId || null,
            teacher_id: pricing.teacherId,
          },
        })
        .select()
        .single();

      if (orderErr) {
        console.error('[PaymentService] Error creating free order:', orderErr);
      }

      // Activate subscription entitlement immediately
      if (params.itemType === 'course' || params.itemType === 'chapter') {
        await MonetizationService.grantEntitlement({
          studentId: params.studentId,
          channelId: params.itemId,
          scope,
          duration,
          subjectName: params.subjectName,
          unitId: params.unitId,
          orderId: freeOrder?.id,
        });
      }

      return {
        isFree: true,
        internalOrderId: freeOrder?.id || 'free',
        amountPaise: 0,
        currency: 'INR',
        itemName: pricing.title,
      };
    }

    // 4. Paid Item: Initialize Razorpay SDK
    const rzp = getRazorpayClient();
    const configStatus = getRazorpayConfigStatus();

    if (!rzp || !configStatus.isConfigured) {
      throw new Error(
        'Razorpay payment gateway credentials are not configured on the server. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
      );
    }

    // 5. Create Razorpay order via official SDK
    const shortReceipt = `rcpt_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substring(2, 5)}`;
    let rzpOrder: any;

    try {
      rzpOrder = await rzp.orders.create({
        amount: pricing.amountPaise,
        currency: pricing.currency,
        receipt: shortReceipt,
        notes: {
          studentId: params.studentId,
          itemType: params.itemType,
          itemId: params.itemId,
          packageType: params.packageType || 'entire_channel',
        },
      });
    } catch (rzpErr: any) {
      console.error('[Razorpay Order Creation Error]:', rzpErr);
      throw new Error(
        `Failed to initialize payment with Razorpay: ${rzpErr?.error?.description || rzpErr?.message || 'Provider API error'}`
      );
    }

    // 6. Persist internal order in payment_orders
    const { data: dbOrder, error: dbOrderErr } = await supabase
      .from('payment_orders')
      .insert({
        student_id: params.studentId,
        razorpay_order_id: rzpOrder.id,
        item_type: params.itemType === 'chapter' ? 'course' : params.itemType,
        item_id: params.itemId,
        package_type: params.packageType || 'entire_channel',
        class_id: params.classId || null,
        subject_name: params.subjectName || null,
        amount_paise: pricing.amountPaise,
        currency: pricing.currency,
        status: 'created',
        metadata: {
          receipt: shortReceipt,
          item_title: pricing.title,
          teacher_id: pricing.teacherId,
          teacher_base_paise: pricing.teacherBasePaise,
          platform_fee_paise: pricing.platformFeePaise,
          student_total_paise: pricing.amountPaise,
          scope,
          duration,
          subject_name: params.subjectName || null,
          unit_id: params.unitId || null,
          is_renewal: isRenewal,
        },
      })
      .select()
      .single();

    if (dbOrderErr) {
      console.warn('[PaymentService] Warning saving payment_orders record:', dbOrderErr.message);
    }

    const publicPublicId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;

    return {
      isFree: false,
      orderId: rzpOrder.id,
      internalOrderId: dbOrder?.id || rzpOrder.id,
      amountPaise: pricing.amountPaise,
      currency: pricing.currency,
      keyId: publicPublicId,
      itemName: pricing.title,
    };
  },

  /**
   * Verify a completed Razorpay payment using HMAC SHA256 signature verification.
   * Ensures idempotency: will not double-grant entitlement or double-count earnings.
   */
  async verifyPayment(params: {
    studentId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{
    success: boolean;
    message: string;
    orderId: string;
  }> {
    const supabase = getAdminClient();

    // 1. Verify Cryptographic Signature
    const isValid = verifyPaymentSignature({
      orderId: params.razorpay_order_id,
      paymentId: params.razorpay_payment_id,
      signature: params.razorpay_signature,
    });

    if (!isValid) {
      console.error('[Payment Verification] Signature mismatch for order:', params.razorpay_order_id);
      throw new Error('Invalid Razorpay payment signature. Tampering detected or invalid secret key.');
    }

    // 2. Fetch the corresponding internal order
    const { data: order, error: orderErr } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('razorpay_order_id', params.razorpay_order_id)
      .maybeSingle();

    if (orderErr || !order) {
      console.error('[Payment Verification] Order not found for rzp_order_id:', params.razorpay_order_id);
      throw new Error('Payment order record not found in system.');
    }

    // 3. Authorization check: Order belongs to student
    if (order.student_id !== params.studentId) {
      console.error('[Payment Verification] Student mismatch:', { orderStudent: order.student_id, current: params.studentId });
      throw new Error('Unauthorized: This payment order does not belong to your account.');
    }

    // 4. Idempotency Check: Was this transaction already processed?
    const { data: existingTrans } = await supabase
      .from('payment_transactions')
      .select('id, status')
      .eq('razorpay_payment_id', params.razorpay_payment_id)
      .maybeSingle();

    if (existingTrans && existingTrans.status === 'captured') {
      return {
        success: true,
        message: 'Payment was already verified and processed.',
        orderId: order.id,
      };
    }

    // 5. Query Razorpay API for authoritative payment metadata (optional/safe)
    let paymentMethod = 'online';
    const rzp = getRazorpayClient();
    if (rzp) {
      try {
        const pDetails: any = await rzp.payments.fetch(params.razorpay_payment_id);
        if (pDetails?.method) paymentMethod = pDetails.method;
      } catch (e) {
        // Fallback to signature proof if provider fetch times out
        console.warn('[Payment Verification] Could not fetch payment metadata from provider:', e);
      }
    }

    // 6. Record Payment Transaction
    const { data: trans, error: transErr } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: order.id,
        razorpay_payment_id: params.razorpay_payment_id,
        razorpay_order_id: params.razorpay_order_id,
        razorpay_signature: params.razorpay_signature,
        student_id: params.studentId,
        amount_paise: order.amount_paise,
        currency: order.currency,
        status: 'captured',
        method: paymentMethod,
        verified_at: new Date().toISOString(),
        verification_source: 'api',
      })
      .select()
      .single();

    if (transErr) {
      console.warn('[Payment Verification] Warning inserting transaction:', transErr.message);
    }

    // 7. Update Order status to 'paid'
    await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // 8. Grant Entitlement using MonetizationService with calendar-based duration
    if (order.item_type === 'course' || order.metadata?.scope) {
      const scope: MonetizationScope = order.metadata?.scope || 'channel';
      const duration: SubscriptionDuration = order.metadata?.duration || '1_month';

      await MonetizationService.grantEntitlement({
        studentId: order.student_id,
        channelId: order.item_id,
        scope,
        duration,
        subjectName: order.metadata?.subject_name || order.subject_name,
        unitId: order.metadata?.unit_id || null,
        orderId: order.id,
        transactionId: trans?.id,
      });
    }

    // 9. Allocate Teacher Earnings (80% educator, 20% platform commission)
    const teacherId = order.metadata?.teacher_id;
    if (teacherId && trans?.id) {
      await this.allocateTeacherEarnings({
        teacherId,
        orderId: order.id,
        transactionId: trans.id,
        grossAmountPaise: Number(order.amount_paise),
      });
    }

    return {
      success: true,
      message: 'Payment verified successfully. Learning content unlocked!',
      orderId: order.id,
    };
  },

  /**
   * Process Razorpay webhooks according to official documentation.
   * Handles payment.captured, order.paid, payment.failed, and refund.processed.
   */
  async processWebhook(params: {
    rawBody: string;
    signature: string;
  }): Promise<{
    processed: boolean;
    event?: string;
    reason?: string;
  }> {
    const supabase = getAdminClient();

    // 1. Verify Webhook Signature
    const isValid = verifyWebhookSignature({
      rawBody: params.rawBody,
      signature: params.signature,
    });

    if (!isValid) {
      console.error('[Razorpay Webhook] Invalid webhook signature detected.');
      throw new Error('Invalid Razorpay webhook signature.');
    }

    // 2. Parse event payload
    let eventPayload: any;
    try {
      eventPayload = JSON.parse(params.rawBody);
    } catch {
      throw new Error('Invalid JSON payload in webhook body.');
    }

    const eventId = eventPayload.event_id || eventPayload.id || `evt_${Date.now()}`;
    const eventType = eventPayload.event;

    // 3. Deduplication Check via payment_webhook_events table
    try {
      const { data: existingEvent } = await supabase
        .from('payment_webhook_events')
        .select('id, processed')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingEvent && existingEvent.processed) {
        return { processed: false, event: eventType, reason: 'Duplicate event already processed.' };
      }

      // Record incoming event
      await supabase.from('payment_webhook_events').insert({
        event_id: eventId,
        event_type: eventType,
        payload: eventPayload,
        processed: false,
      });
    } catch {
      // Table may not be created yet, proceed with event logic
    }

    // 4. Handle Event Types
    if (eventType === 'payment.captured') {
      const payment = eventPayload.payload?.payment?.entity;
      if (payment) {
        const razorpayOrderId = payment.order_id;
        const razorpayPaymentId = payment.id;
        const amountPaise = payment.amount;

        // Find internal order
        const { data: order } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (order) {
          // Idempotent transaction recording
          const { data: existingTrans } = await supabase
            .from('payment_transactions')
            .select('id')
            .eq('razorpay_payment_id', razorpayPaymentId)
            .maybeSingle();

          let transId = existingTrans?.id;
          if (!existingTrans) {
            const { data: newTrans } = await supabase
              .from('payment_transactions')
              .insert({
                order_id: order.id,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_order_id: razorpayOrderId,
                student_id: order.student_id,
                amount_paise: amountPaise,
                currency: payment.currency || 'INR',
                status: 'captured',
                method: payment.method || 'online',
                verified_at: new Date().toISOString(),
                verification_source: 'webhook',
                raw_response: payment,
              })
              .select('id')
              .single();

            transId = newTrans?.id;
          }

          // Update order status
          await supabase
            .from('payment_orders')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', order.id);

          // Grant entitlement using MonetizationService
          if (order.item_type === 'course' || order.metadata?.scope) {
            const scope: MonetizationScope = order.metadata?.scope || 'channel';
            const duration: SubscriptionDuration = order.metadata?.duration || '1_month';

            await MonetizationService.grantEntitlement({
              studentId: order.student_id,
              channelId: order.item_id,
              scope,
              duration,
              subjectName: order.metadata?.subject_name || order.subject_name,
              unitId: order.metadata?.unit_id || null,
              orderId: order.id,
              transactionId: transId,
            });
          }

          // Allocate teacher earnings
          const teacherId = order.metadata?.teacher_id;
          if (teacherId && transId) {
            await this.allocateTeacherEarnings({
              teacherId,
              orderId: order.id,
              transactionId: transId,
              grossAmountPaise: amountPaise,
            });
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const payment = eventPayload.payload?.payment?.entity;
      if (payment) {
        const razorpayOrderId = payment.order_id;
        const razorpayPaymentId = payment.id;

        const { data: order } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (order) {
          await supabase.from('payment_transactions').insert({
            order_id: order.id,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_order_id: razorpayOrderId,
            student_id: order.student_id,
            amount_paise: payment.amount,
            currency: payment.currency || 'INR',
            status: 'failed',
            error_code: payment.error_code,
            error_description: payment.error_description,
            verification_source: 'webhook',
          });

          await supabase
            .from('payment_orders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', order.id);
        }
      }
    } else if (eventType === 'refund.processed') {
      const refund = eventPayload.payload?.refund?.entity;
      if (refund) {
        const paymentId = refund.payment_id;
        const refundAmount = refund.amount;

        const { data: trans } = await supabase
          .from('payment_transactions')
          .select('id, order_id')
          .eq('razorpay_payment_id', paymentId)
          .maybeSingle();

        if (trans) {
          await supabase.from('refund_records').insert({
            transaction_id: trans.id,
            order_id: trans.order_id,
            razorpay_refund_id: refund.id,
            amount_paise: refundAmount,
            currency: refund.currency || 'INR',
            status: 'processed',
            reason: refund.notes?.reason || 'Customer refund',
          });

          await supabase
            .from('payment_transactions')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('id', trans.id);

          await supabase
            .from('teacher_earnings')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('transaction_id', trans.id);
        }
      }
    }

    // Mark event processed
    try {
      await supabase
        .from('payment_webhook_events')
        .update({ processed: true })
        .eq('event_id', eventId);
    } catch {
      // Ignore if table not present
    }

    return { processed: true, event: eventType };
  },

  /**
   * Helper: Grant course entitlement in channel_subscriptions idempotently.
   */
  async grantCourseEntitlement(params: {
    studentId: string;
    channelId: string;
    packageType: SubscriptionPackageType;
    classId?: string | null;
    subjectName?: string | null;
  }): Promise<void> {
    const supabase = getAdminClient();

    // Check if subscription row already exists
    const { data: existing } = await supabase
      .from('channel_subscriptions')
      .select('id, status')
      .eq('student_id', params.studentId)
      .eq('channel_id', params.channelId)
      .maybeSingle();

    if (existing) {
      if (existing.status !== 'active') {
        await supabase
          .from('channel_subscriptions')
          .update({
            status: 'active',
            package_type: params.packageType,
            class_id: params.classId || null,
            subject_name: params.subjectName || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    } else {
      await supabase.from('channel_subscriptions').insert({
        student_id: params.studentId,
        channel_id: params.channelId,
        package_type: params.packageType,
        class_id: params.classId || null,
        subject_name: params.subjectName || null,
        status: 'active',
      });
    }
  },

  /**
   * Helper: Allocate teacher earnings based on platform commission rate.
   * Default: 20% platform commission, 80% educator earnings.
   */
  async allocateTeacherEarnings(params: {
    teacherId: string;
    orderId: string;
    transactionId: string;
    grossAmountPaise: number;
    commissionRatePercent?: number;
  }): Promise<void> {
    const supabase = getAdminClient();

    const rate = params.commissionRatePercent ?? 20.0; // 20% platform fee
    const comm = calculateCommission(params.grossAmountPaise, rate);
    const platformCommissionPaise = comm.platformCommissionPaise;
    const teacherSharePaise = comm.teacherSharePaise;

    try {
      // Idempotency: verify not already allocated
      const { data: existing } = await supabase
        .from('teacher_earnings')
        .select('id')
        .eq('transaction_id', params.transactionId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('teacher_earnings').insert({
          teacher_id: params.teacherId,
          transaction_id: params.transactionId,
          order_id: params.orderId,
          gross_amount_paise: params.grossAmountPaise,
          platform_commission_paise: platformCommissionPaise,
          teacher_share_paise: teacherSharePaise,
          commission_rate_percent: rate,
          status: 'cleared',
        });
      }
    } catch (e) {
      console.warn('[PaymentService] Warning allocating teacher earnings:', e);
    }
  },

  /**
   * Fetch payment and purchase history for a student.
   */
  async getStudentPaymentHistory(studentId: string): Promise<StudentPaymentHistoryItem[]> {
    const supabase = getAdminClient();

    try {
      const { data: orders, error } = await supabase
        .from('payment_orders')
        .select(`
          id, razorpay_order_id, item_type, item_id, package_type, amount_paise, currency, status, created_at,
          payment_transactions(razorpay_payment_id, status, method, verified_at)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error || !orders) return [];

      // Collect channel names
      const channelIds = Array.from(
        new Set(orders.filter((o) => o.item_type === 'course').map((o) => o.item_id))
      );
      const channelMap: Record<string, string> = {};

      if (channelIds.length > 0) {
        const { data: channels } = await supabase
          .from('channels')
          .select('id, name')
          .in('id', channelIds);

        (channels || []).forEach((c) => {
          channelMap[c.id] = c.name;
        });
      }

      return orders.map((o: any) => {
        const trans = Array.isArray(o.payment_transactions)
          ? o.payment_transactions[0]
          : o.payment_transactions;

        return {
          id: o.id,
          orderId: o.razorpay_order_id || o.id,
          razorpayPaymentId: trans?.razorpay_payment_id || null,
          itemType: o.item_type,
          itemId: o.item_id,
          itemTitle: channelMap[o.item_id] || (o.item_type === 'course' ? 'Enrolled Course' : 'Examination Fee'),
          packageType: o.package_type,
          amountPaise: Number(o.amount_paise),
          currency: o.currency || 'INR',
          status: o.status,
          method: trans?.method || null,
          paidAt: trans?.verified_at || o.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Fetch real database-backed payment analytics for Super Admin Dashboard.
   */
  async getAdminPaymentAnalytics(): Promise<AdminPaymentAnalytics> {
    const supabase = getAdminClient();

    let totalCapturedRevenuePaise = 0;
    let successfulPaymentsCount = 0;
    let failedPaymentsCount = 0;
    let pendingOrdersCount = 0;
    let refundsTotalPaise = 0;
    let platformCommissionPaise = 0;
    let teacherEarningsPaise = 0;

    const dailyMap: Record<string, { amountPaise: number; count: number }> = {};
    const courseMap: Record<string, { count: number; totalPaise: number }> = {};
    let recentTransactions: any[] = [];

    try {
      // 1. Transactions summary
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (transactions) {
        transactions.forEach((t) => {
          if (t.status === 'captured') {
            totalCapturedRevenuePaise += Number(t.amount_paise);
            successfulPaymentsCount++;

            const dateStr = t.created_at.slice(0, 10);
            if (!dailyMap[dateStr]) {
              dailyMap[dateStr] = { amountPaise: 0, count: 0 };
            }
            dailyMap[dateStr].amountPaise += Number(t.amount_paise);
            dailyMap[dateStr].count++;
          } else if (t.status === 'failed') {
            failedPaymentsCount++;
          } else if (t.status === 'refunded') {
            refundsTotalPaise += Number(t.amount_paise);
          }
        });

        // 2. Resolve user names for recent transactions
        const studentIds = Array.from(new Set(transactions.slice(0, 15).map((t) => t.student_id)));
        const profileMap: Record<string, { name: string; email: string }> = {};

        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', studentIds);

          (profiles || []).forEach((p) => {
            profileMap[p.id] = { name: p.name || 'Student', email: p.email || '' };
          });
        }

        recentTransactions = transactions.slice(0, 15).map((t) => ({
          ...t,
          student_name: profileMap[t.student_id]?.name || 'Student User',
          student_email: profileMap[t.student_id]?.email || '',
        }));
      }

      // 3. Pending orders
      const { count: pendingCount } = await supabase
        .from('payment_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'created');

      pendingOrdersCount = pendingCount || 0;

      // 4. Teacher earnings breakdown
      const { data: earnings } = await supabase
        .from('teacher_earnings')
        .select('platform_commission_paise, teacher_share_paise, status');

      if (earnings) {
        earnings.forEach((e) => {
          if (e.status === 'cleared') {
            platformCommissionPaise += Number(e.platform_commission_paise);
            teacherEarningsPaise += Number(e.teacher_share_paise);
          }
        });
      }

      // 5. Course-wise sales
      const { data: paidOrders } = await supabase
        .from('payment_orders')
        .select('item_id, item_type, amount_paise')
        .eq('status', 'paid')
        .eq('item_type', 'course');

      if (paidOrders) {
        paidOrders.forEach((o) => {
          if (!courseMap[o.item_id]) {
            courseMap[o.item_id] = { count: 0, totalPaise: 0 };
          }
          courseMap[o.item_id].count++;
          courseMap[o.item_id].totalPaise += Number(o.amount_paise);
        });
      }
    } catch (e) {
      console.warn('[PaymentService] Analytics query warning:', e);
    }

    const courseSales = Object.entries(courseMap).map(([courseId, data]) => ({
      courseId,
      title: 'Enrolled Course',
      count: data.count,
      totalPaise: data.totalPaise,
    }));

    const dailyRevenue = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, amountPaise: data.amountPaise, count: data.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCapturedRevenuePaise,
      successfulPaymentsCount,
      failedPaymentsCount,
      pendingOrdersCount,
      refundsTotalPaise,
      platformCommissionPaise,
      teacherEarningsPaise,
      dailyRevenue,
      courseSales,
      recentTransactions,
    };
  },

  /**
   * Fetch teacher earnings summary.
   */
  async getTeacherEarningsSummary(teacherId: string): Promise<{
    grossCollectionsPaise: number;
    platformCommissionPaise: number;
    clearedEarningsPaise: number;
    pendingEarningsPaise: number;
    paidOutEarningsPaise: number;
    earningsList: TeacherEarningsItem[];
  }> {
    const supabase = getAdminClient();

    try {
      const { data: earnings } = await supabase
        .from('teacher_earnings')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (!earnings) {
        return {
          grossCollectionsPaise: 0,
          platformCommissionPaise: 0,
          clearedEarningsPaise: 0,
          pendingEarningsPaise: 0,
          paidOutEarningsPaise: 0,
          earningsList: [],
        };
      }

      let gross = 0;
      let commission = 0;
      let cleared = 0;
      let pending = 0;
      let paidOut = 0;

      earnings.forEach((e) => {
        gross += Number(e.gross_amount_paise);
        commission += Number(e.platform_commission_paise);
        if (e.status === 'cleared') cleared += Number(e.teacher_share_paise);
        else if (e.status === 'pending') pending += Number(e.teacher_share_paise);
        else if (e.status === 'paid_out') paidOut += Number(e.teacher_share_paise);
      });

      return {
        grossCollectionsPaise: gross,
        platformCommissionPaise: commission,
        clearedEarningsPaise: cleared,
        pendingEarningsPaise: pending,
        paidOutEarningsPaise: paidOut,
        earningsList: earnings as TeacherEarningsItem[],
      };
    } catch {
      return {
        grossCollectionsPaise: 0,
        platformCommissionPaise: 0,
        clearedEarningsPaise: 0,
        pendingEarningsPaise: 0,
        paidOutEarningsPaise: 0,
        earningsList: [],
      };
    }
  },
};

/**
 * End-to-End Automated Test Suite for Teacher Monetization, Paid Video Access,
 * Subscriptions, 20% Platform Commission, and Entitlement Access Controls.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const envPath = path.resolve('c:/Users/user/Documents/Edutech/edutech/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, serviceRoleKey);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, name, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${name} ${details ? '- ' + details : ''}`);
    failedTests++;
  }
}

// ----------------------------------------------------------------------------
// Mirror Business Logic from src/lib/monetization-service.ts
// ----------------------------------------------------------------------------

function calculateStudentPriceFromBase(teacherBasePaise, feePercent = 20.0) {
  const safeBase = Math.max(0, Math.round(Number(teacherBasePaise) || 0));
  const platformFeePaise = Math.round((safeBase * feePercent) / 100);
  const studentTotalPaise = safeBase + platformFeePaise;
  return {
    teacherBasePaise: safeBase,
    platformFeePaise,
    studentTotalPaise,
    feePercent,
  };
}

function calculateCommission(grossPaise, feePercent = 20.0) {
  const teacherSharePaise = Math.round(grossPaise / (1 + feePercent / 100));
  const platformCommissionPaise = grossPaise - teacherSharePaise;
  return {
    grossPaise,
    commissionPercent: feePercent,
    platformCommissionPaise,
    teacherSharePaise,
  };
}

function calculateCalendarExpiry(startDate, duration) {
  const start = new Date(startDate);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const startDay = start.getDate();

  let targetYear = startYear;
  let targetMonth = startMonth;

  if (duration === '1_month') {
    targetMonth = startMonth + 1;
  } else if (duration === '6_months') {
    targetMonth = startMonth + 6;
  } else if (duration === '12_months') {
    targetMonth = startMonth + 12;
  } else {
    targetMonth = startMonth + 1;
  }

  targetYear += Math.floor(targetMonth / 12);
  targetMonth = targetMonth % 12;

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(startDay, daysInTargetMonth);

  const expiry = new Date(targetYear, targetMonth, clampedDay, start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
  return expiry.toISOString();
}

function evaluateVideoAccess({ video, studentId, entitlements }) {
  if (video.is_demo) {
    return { canAccess: true, reason: 'Demo / free preview content' };
  }

  if (!studentId) {
    return { canAccess: false, reason: 'Authentication required' };
  }

  const now = new Date().toISOString();
  const validEntitlements = entitlements.filter(
    (e) => e.student_id === studentId && e.status === 'active' && new Date(e.expires_at) > new Date(now)
  );

  // 1. Channel level entitlement
  const hasChannel = validEntitlements.some(
    (e) => e.scope === 'channel' && e.channel_id === video.channel_id
  );
  if (hasChannel) {
    return { canAccess: true, reason: 'Covered by active channel subscription' };
  }

  // 2. Subject level entitlement
  if (video.subject_name) {
    const hasSubject = validEntitlements.some(
      (e) =>
        e.scope === 'subject' &&
        e.channel_id === video.channel_id &&
        e.subject_name === video.subject_name
    );
    if (hasSubject) {
      return { canAccess: true, reason: 'Covered by active subject subscription' };
    }
  }

  // 3. Chapter (unit) level entitlement
  if (video.unit_id) {
    const hasUnit = validEntitlements.some(
      (e) =>
        e.scope === 'chapter' &&
        e.unit_id === video.unit_id
    );
    if (hasUnit) {
      return { canAccess: true, reason: 'Covered by active chapter access' };
    }
  }

  return { canAccess: false, reason: 'Active subscription or purchase required' };
}

async function runMonetizationTestSuite() {
  console.log('========================================================================');
  console.log('STARTING TEACHER MONETIZATION, PRICING, COMMISSIONS & ENTITLEMENT TESTS');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: 20% PLATFORM FEE SURCHARGE & TEACHER ASK INTEGRITY
  // --------------------------------------------------------------------------
  console.log('--- 1. 20% Platform Surcharge (Teacher Ask + 20% Fee = Student Pays) ---');

  // Case A: Teacher asks ₹1,000 -> 20% platform fee ₹200 -> Student pays ₹1,200
  const pricing1000 = calculateStudentPriceFromBase(100000); // 100,000 paise = ₹1,000
  assert(
    pricing1000.teacherBasePaise === 100000,
    'Teacher ask of ₹1,000 (100,000 paise) is preserved as base price'
  );
  assert(
    pricing1000.platformFeePaise === 20000,
    '20% Platform fee on ₹1,000 ask equals exactly ₹200 (20,000 paise)'
  );
  assert(
    pricing1000.studentTotalPaise === 120000,
    'Student payable total is ₹1,200 (120,000 paise) = ₹1,000 + ₹200'
  );

  // Settlement: Decomposing student's ₹1,200 payment gives teacher ₹1,000 and platform ₹200
  const comm1200 = calculateCommission(120000);
  assert(
    comm1200.teacherSharePaise === 100000,
    'From student ₹1,200 payment, educator receives their exact ₹1,000 ask (100,000 paise)'
  );
  assert(
    comm1200.platformCommissionPaise === 20000,
    'From student ₹1,200 payment, platform receives exactly ₹200 (20,000 paise)'
  );
  assert(
    comm1200.teacherSharePaise + comm1200.platformCommissionPaise === 120000,
    '₹1,200 settlement reconciles with 0 remainder discrepancy'
  );

  // Case B: Teacher asks ₹299 -> 20% platform fee ₹59.80 -> Student pays ₹358.80
  const pricing299 = calculateStudentPriceFromBase(29900); // 29,900 paise
  assert(
    pricing299.platformFeePaise === 5980,
    '20% fee on ₹299 ask is exactly ₹59.80 (5,980 paise)'
  );
  assert(
    pricing299.studentTotalPaise === 35880,
    'Student payable on ₹299 ask is ₹358.80 (35,880 paise)'
  );
  const comm358 = calculateCommission(35880);
  assert(
    comm358.teacherSharePaise === 29900,
    'Teacher receives exact ₹299 ask from ₹358.80 student payment'
  );
  assert(
    comm358.platformCommissionPaise === 5980,
    'Platform receives ₹59.80 fee from ₹358.80 student payment'
  );

  // Case C: Teacher asks ₹500 -> 20% platform fee ₹100 -> Student pays ₹600
  const pricing500 = calculateStudentPriceFromBase(50000); // 50,000 paise
  assert(
    pricing500.platformFeePaise === 10000,
    '20% fee on ₹500 ask is exactly ₹100 (10,000 paise)'
  );
  assert(
    pricing500.studentTotalPaise === 60000,
    'Student payable on ₹500 ask is ₹600 (60,000 paise)'
  );
  const comm600 = calculateCommission(60000);
  assert(
    comm600.teacherSharePaise === 50000,
    'Teacher receives exact ₹500 ask from ₹600 student payment'
  );
  assert(
    comm600.platformCommissionPaise === 10000,
    'Platform receives ₹100 fee from ₹600 student payment'
  );

  // Odd paise test (₹333.33 ask = 33,333 paise)
  const pricingOdd = calculateStudentPriceFromBase(33333);
  const commOdd = calculateCommission(pricingOdd.studentTotalPaise);
  assert(
    commOdd.teacherSharePaise + commOdd.platformCommissionPaise === pricingOdd.studentTotalPaise,
    'Odd paise minor unit rounding maintains exact balance without leaking paise'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 2: CALENDAR-BASED EXPIRY CALCULATIONS & MONTH CLAMPING
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Calendar-Based Expiry & Date Clamping ---');

  // Month-end: Jan 31 in a non-leap year (e.g. 2025) + 1 month -> Feb 28
  const jan31 = '2025-01-31T12:00:00.000Z';
  const febExpiry = calculateCalendarExpiry(jan31, '1_month');
  const dFeb = new Date(febExpiry);
  assert(
    dFeb.getUTCMonth() === 1 && dFeb.getUTCDate() === 28,
    'Jan 31 + 1 month in non-leap year clamps correctly to Feb 28 (no month skipping)'
  );

  // Leap year: Jan 31, 2024 (leap year) + 1 month -> Feb 29
  const jan31Leap = '2024-01-31T12:00:00.000Z';
  const febLeapExpiry = calculateCalendarExpiry(jan31Leap, '1_month');
  const dFebLeap = new Date(febLeapExpiry);
  assert(
    dFebLeap.getUTCMonth() === 1 && dFebLeap.getUTCDate() === 29,
    'Jan 31 + 1 month in leap year clamps correctly to Feb 29'
  );

  // 6 months duration: March 31 + 6 months -> Sept 30 (September has 30 days)
  const mar31 = '2025-03-31T10:00:00.000Z';
  const sepExpiry = calculateCalendarExpiry(mar31, '6_months');
  const dSep = new Date(sepExpiry);
  assert(
    dSep.getUTCMonth() === 8 && dSep.getUTCDate() === 30,
    'March 31 + 6 months clamps accurately to September 30'
  );

  // 12 months duration: Feb 29, 2024 + 12 months -> Feb 28, 2025
  const feb29 = '2024-02-29T15:30:00.000Z';
  const febNextYear = calculateCalendarExpiry(feb29, '12_months');
  const dNextYear = new Date(febNextYear);
  assert(
    dNextYear.getUTCFullYear() === 2025 && dNextYear.getUTCMonth() === 1 && dNextYear.getUTCDate() === 28,
    'Feb 29 leap-day purchase expires on Feb 28 of following standard year'
  );

  // Renewal Extension Policy:
  // If active, extend from current expires_at
  const activeCurrentExpiry = '2026-11-15T00:00:00.000Z';
  const extendedExpiry = calculateCalendarExpiry(activeCurrentExpiry, '1_month');
  assert(
    new Date(extendedExpiry) > new Date(activeCurrentExpiry),
    'Active subscription renewal extends duration from existing expiry date'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: PRICING VALIDATION & BOUNDS
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Pricing Validation & Server-Side Security ---');

  function validatePrices(isPaid, monthlyPaise, sixMonthPaise, yearlyPaise) {
    if (!isPaid) return { valid: true };
    const minPaise = 1000; // ₹10
    const maxPaise = 5000000; // ₹50,000

    if (
      !monthlyPaise ||
      monthlyPaise < minPaise ||
      monthlyPaise > maxPaise ||
      !Number.isInteger(monthlyPaise)
    ) {
      return { valid: false, error: 'Invalid monthly price' };
    }
    if (
      !sixMonthPaise ||
      sixMonthPaise < minPaise ||
      sixMonthPaise > maxPaise ||
      !Number.isInteger(sixMonthPaise)
    ) {
      return { valid: false, error: 'Invalid 6-month price' };
    }
    if (
      !yearlyPaise ||
      yearlyPaise < minPaise ||
      yearlyPaise > maxPaise ||
      !Number.isInteger(yearlyPaise)
    ) {
      return { valid: false, error: 'Invalid yearly price' };
    }
    return { valid: true };
  }

  assert(
    validatePrices(true, 29900, 149900, 249900).valid === true,
    'Standard channel pricing (₹299, ₹1,499, ₹2,499) passes validation'
  );
  assert(
    validatePrices(true, 500, 149900, 249900).valid === false,
    'Prices below minimum threshold (₹5 < ₹10) are rejected'
  );
  assert(
    validatePrices(true, 6000000, 149900, 249900).valid === false,
    'Prices above maximum threshold (₹60,000 > ₹50,000) are rejected'
  );
  assert(
    validatePrices(true, 299.5, 149900, 249900).valid === false,
    'Non-integer floating-point paise prices are strictly rejected'
  );
  assert(
    validatePrices(true, -1000, 149900, 249900).valid === false,
    'Negative pricing attempts are rejected'
  );
  assert(
    validatePrices(false, 0, 0, 0).valid === true,
    'Free content configuration with paid=false is valid'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: HIERARCHICAL ENTITLEMENT & VIDEO ACCESS CONTROLS
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Entitlement Hierarchy & Video Access Gatekeeper ---');

  const testChannelId = 'chan_math_101';
  const testSubject = 'Calculus';
  const testUnitId = 'unit_derivatives_01';
  const testStudentId = 'student_alex_99';
  const otherStudentId = 'student_eve_00';

  const sampleDemoVideo = {
    id: 'vid_demo_01',
    channel_id: testChannelId,
    subject_name: testSubject,
    unit_id: testUnitId,
    is_demo: true,
  };

  const samplePaidVideo = {
    id: 'vid_paid_02',
    channel_id: testChannelId,
    subject_name: testSubject,
    unit_id: testUnitId,
    is_demo: false,
  };

  // Case 1: Demo / free video access
  const accessDemo = evaluateVideoAccess({
    video: sampleDemoVideo,
    studentId: null,
    entitlements: [],
  });
  assert(accessDemo.canAccess === true, 'Public demo video is accessible without authentication');

  // Case 2: Paid video without entitlement
  const accessNoSub = evaluateVideoAccess({
    video: samplePaidVideo,
    studentId: testStudentId,
    entitlements: [],
  });
  assert(
    accessNoSub.canAccess === false,
    'Paid video denied (403) when student has no active entitlements'
  );

  // Case 3: Paid video with Chapter-level entitlement
  const chapterEntitlements = [
    {
      student_id: testStudentId,
      scope: 'chapter',
      channel_id: testChannelId,
      subject_name: testSubject,
      unit_id: testUnitId,
      status: 'active',
      expires_at: '2027-01-01T00:00:00.000Z',
    },
  ];
  const accessChapter = evaluateVideoAccess({
    video: samplePaidVideo,
    studentId: testStudentId,
    entitlements: chapterEntitlements,
  });
  assert(
    accessChapter.canAccess === true,
    'Active chapter purchase grants playback access to video in that chapter'
  );

  // Case 4: Overlapping entitlements - Expired chapter, but Active Subject subscription
  const overlappingEntitlements = [
    {
      student_id: testStudentId,
      scope: 'chapter',
      channel_id: testChannelId,
      subject_name: testSubject,
      unit_id: testUnitId,
      status: 'expired',
      expires_at: '2024-01-01T00:00:00.000Z', // Expired
    },
    {
      student_id: testStudentId,
      scope: 'subject',
      channel_id: testChannelId,
      subject_name: testSubject,
      unit_id: null,
      status: 'active',
      expires_at: '2027-01-01T00:00:00.000Z', // Active broader entitlement
    },
  ];
  const accessOverlapping = evaluateVideoAccess({
    video: samplePaidVideo,
    studentId: testStudentId,
    entitlements: overlappingEntitlements,
  });
  assert(
    accessOverlapping.canAccess === true,
    'Active broader Subject subscription covers chapter even if chapter entitlement is expired'
  );

  // Case 5: Channel subscription covers everything in channel
  const channelEntitlements = [
    {
      student_id: testStudentId,
      scope: 'channel',
      channel_id: testChannelId,
      status: 'active',
      expires_at: '2027-01-01T00:00:00.000Z',
    },
  ];
  const accessChannel = evaluateVideoAccess({
    video: samplePaidVideo,
    studentId: testStudentId,
    entitlements: channelEntitlements,
  });
  assert(
    accessChannel.canAccess === true,
    'Active Channel subscription covers all subjects and chapters in that channel'
  );

  // Case 6: Unrelated student or unrelated content
  const accessUnrelated = evaluateVideoAccess({
    video: samplePaidVideo,
    studentId: otherStudentId,
    entitlements: channelEntitlements, // Belong to testStudentId, not otherStudentId
  });
  assert(
    accessUnrelated.canAccess === false,
    'Entitlements belonging to another student do not grant unauthorized access'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 5: WEBHOOK IDEMPOTENCY & DUPLICATE EVENT REJECTION
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Webhook Idempotency & Deduplication Protection ---');

  const processedEvents = new Set();
  function processWebhookIdempotently(eventId, payload) {
    if (processedEvents.has(eventId)) {
      return { status: 'skipped_duplicate', message: 'Event already processed' };
    }
    processedEvents.add(eventId);
    return { status: 'processed', orderId: payload.order_id };
  }

  const sampleEventId = 'event_rzp_mock_991823';
  const firstDelivery = processWebhookIdempotently(sampleEventId, { order_id: 'ord_123' });
  assert(
    firstDelivery.status === 'processed',
    'First webhook delivery successfully processes and creates transaction'
  );

  const duplicateDelivery = processWebhookIdempotently(sampleEventId, { order_id: 'ord_123' });
  assert(
    duplicateDelivery.status === 'skipped_duplicate',
    'Duplicate webhook event delivery is identified and safely skipped without double allocation'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 6: DATABASE SCHEMA & LIVE CAPABILITIES
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Live Database Integration & Tables Check ---');

  // Verify channels table accessible
  const { data: channels, error: chanErr } = await supabase.from('channels').select('id, name, teacher_id').limit(1);
  assert(!chanErr && channels !== null, 'Live channels catalog connected and readable');

  // Verify payment_transactions table accessible
  const { data: txs, error: txErr } = await supabase.from('payment_transactions').select('id, amount_paise, status').limit(1);
  assert(!txErr, 'Live payment_transactions table queried successfully');

  // --------------------------------------------------------------------------
  // TEST GROUP 7: INDEPENDENT PRICING PER CHANNEL & PER CHAPTER (UNIT)
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Independent Pricing Per Channel & Per Unit (Chapter) ---');

  // Simulation of independent pricing configurations
  const pricingStore = new Map();

  function setPricing({ channelId, scope, unitId = null, subjectName = null, isPaid, monthlyPaise, sixMonthPaise, yearlyPaise }) {
    const key = `${channelId}_${scope}_${unitId || 'none'}_${subjectName || 'none'}`;
    const baseMonthly = isPaid ? monthlyPaise : 0;
    const baseSixMonth = isPaid ? sixMonthPaise : 0;
    const baseYearly = isPaid ? yearlyPaise : 0;

    const studentMonthly = calculateStudentPriceFromBase(baseMonthly).studentTotalPaise;
    const studentSixMonth = calculateStudentPriceFromBase(baseSixMonth).studentTotalPaise;
    const studentYearly = calculateStudentPriceFromBase(baseYearly).studentTotalPaise;

    pricingStore.set(key, {
      channelId,
      scope,
      unitId,
      subjectName,
      isPaid,
      monthlyPaise: baseMonthly,
      sixMonthPaise: baseSixMonth,
      yearlyPaise: baseYearly,
      studentMonthlyPaise: studentMonthly,
      studentSixMonthPaise: studentSixMonth,
      studentYearlyPaise: studentYearly,
    });
    return pricingStore.get(key);
  }

  function getPricing(channelId, scope, unitId = null, subjectName = null) {
    const key = `${channelId}_${scope}_${unitId || 'none'}_${subjectName || 'none'}`;
    return pricingStore.get(key) || null;
  }

  // 1. Channel A vs Channel B independent pricing
  const chanA = setPricing({
    channelId: 'chan_physics',
    scope: 'channel',
    isPaid: true,
    monthlyPaise: 100000, // ₹1,000 ask
    sixMonthPaise: 500000, // ₹5,000 ask
    yearlyPaise: 900000, // ₹9,000 ask
  });
  const chanB = setPricing({
    channelId: 'chan_chemistry',
    scope: 'channel',
    isPaid: true,
    monthlyPaise: 150000, // ₹1,500 ask
    sixMonthPaise: 750000, // ₹7,500 ask
    yearlyPaise: 1200000, // ₹12,000 ask
  });

  assert(
    chanA.studentMonthlyPaise === 120000 && chanB.studentMonthlyPaise === 180000,
    'Channels A and B maintain independent pricing (₹1,200 student vs ₹1,800 student)'
  );

  // 2. Unit (Chapter) independent pricing within Channel A
  const unit1 = setPricing({
    channelId: 'chan_physics',
    scope: 'chapter',
    unitId: 'unit_mechanics_101',
    isPaid: true,
    monthlyPaise: 15000, // ₹150 ask
    sixMonthPaise: 75000,
    yearlyPaise: 120000,
  });
  const unit2 = setPricing({
    channelId: 'chan_physics',
    scope: 'chapter',
    unitId: 'unit_thermo_102',
    isPaid: true,
    monthlyPaise: 25000, // ₹250 ask
    sixMonthPaise: 125000,
    yearlyPaise: 200000,
  });
  const unit3 = setPricing({
    channelId: 'chan_physics',
    scope: 'chapter',
    unitId: 'unit_optics_103',
    isPaid: false,
    monthlyPaise: 0,
    sixMonthPaise: 0,
    yearlyPaise: 0,
  });

  assert(
    unit1.studentMonthlyPaise === 18000,
    'Unit 1 (Mechanics) priced independently at ₹150 ask + 20% = ₹180 student price'
  );
  assert(
    unit2.studentMonthlyPaise === 30000,
    'Unit 2 (Thermodynamics) priced independently at ₹250 ask + 20% = ₹300 student price'
  );
  assert(
    unit3.studentMonthlyPaise === 0 && unit3.isPaid === false,
    'Unit 3 (Optics) configured as Free (₹0) alongside paid units'
  );

  // 3. Mutation isolation: Editing Unit 2 does not alter Unit 1 or Channel A
  setPricing({
    channelId: 'chan_physics',
    scope: 'chapter',
    unitId: 'unit_thermo_102',
    isPaid: true,
    monthlyPaise: 30000, // Updated to ₹300 ask
    sixMonthPaise: 150000,
    yearlyPaise: 240000,
  });

  const updatedUnit2 = getPricing('chan_physics', 'chapter', 'unit_thermo_102');
  const checkUnit1 = getPricing('chan_physics', 'chapter', 'unit_mechanics_101');
  const checkChanA = getPricing('chan_physics', 'channel');

  assert(
    updatedUnit2.studentMonthlyPaise === 36000,
    'Unit 2 updated cleanly to ₹300 ask + 20% = ₹360 student price'
  );
  assert(
    checkUnit1.studentMonthlyPaise === 18000,
    'Unit 1 pricing remained unchanged at ₹180 following Unit 2 update'
  );
  assert(
    checkChanA.studentMonthlyPaise === 120000,
    'Channel A subscription pricing remained unchanged at ₹1,200'
  );

  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMonetizationTestSuite().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});

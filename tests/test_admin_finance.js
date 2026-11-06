const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach((line) => {
  const parts = line.trim().split('=');
  if (parts.length >= 2 && !line.startsWith('#')) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAdminFinance() {
  console.log('====================================================');
  console.log('EDUTECH ADMIN FINANCE & PAYOUT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Database Connectivity & Table Check
  console.log('--- 1. Testing Core Tables ---');
  const { data: profs, error: pErr } = await supabase.from('profiles').select('id, role').limit(10);
  assert(!pErr && profs && profs.length > 0, 'Profiles table accessible');

  const { data: txs, error: txErr } = await supabase.from('payment_transactions').select('*');
  assert(!txErr && txs, 'Payment transactions accessible');

  const { data: earnings, error: earnErr } = await supabase.from('teacher_earnings').select('*');
  assert(!earnErr && earnings, 'Teacher earnings accessible');

  // 2. Financial Rule Math Verification (Student Payment = Teacher Base + 20% Platform Fee)
  console.log('\n--- 2. Verifying Platform & Teacher Split (Student Payment = Teacher Base + 20% Fee) ---');
  let totalCaptured = 0;
  let totalPlatformCommission = 0;
  let totalTeacherShare = 0;

  (earnings || []).forEach((e) => {
    totalCaptured += Number(e.gross_amount_paise);
    totalPlatformCommission += Number(e.platform_commission_paise);
    totalTeacherShare += Number(e.teacher_share_paise);

    // Formula: Teacher Base = round(Gross / 1.20), Platform Fee = Gross - Teacher Base
    const expectedTeach = Math.round(Number(e.gross_amount_paise) / 1.20);
    const expectedPlat = Number(e.gross_amount_paise) - expectedTeach;
    assert(
      Math.abs(Number(e.teacher_share_paise) - expectedTeach) <= 1,
      `Transaction ${e.transaction_id} teacher share matches base ask exactly (${e.teacher_share_paise} paise)`
    );
    assert(
      Math.abs(Number(e.platform_commission_paise) - expectedPlat) <= 1,
      `Transaction ${e.transaction_id} platform fee matches 20% surcharge exactly (${e.platform_commission_paise} paise)`
    );
    assert(
      Number(e.teacher_share_paise) + Number(e.platform_commission_paise) === Number(e.gross_amount_paise),
      `Transaction ${e.transaction_id} split sums perfectly to gross amount (${e.gross_amount_paise} paise)`
    );
  });

  // 3. Payout Simulation & Status Transition
  console.log('\n--- 3. Testing Payout Flow & Ledger Integrity ---');
  const teacherWithPending = earnings.find((e) => e.status === 'cleared' || e.status === 'pending');
  if (teacherWithPending) {
    const tid = teacherWithPending.teacher_id;
    console.log(`Testing payout for teacher: ${tid}`);

    // Mark as paid
    const testUtr = 'UTR_TEST_' + Date.now();
    const { error: updErr } = await supabase
      .from('teacher_earnings')
      .update({ status: 'paid_out', updated_at: new Date().toISOString() })
      .eq('id', teacherWithPending.id);

    assert(!updErr, 'Successfully updated teacher_earnings status to paid_out');

    // Verify after update
    const { data: updatedRow } = await supabase
      .from('teacher_earnings')
      .select('status')
      .eq('id', teacherWithPending.id)
      .single();
    assert(updatedRow.status === 'paid_out', 'Earning row status is now paid_out');

    // Restore back to original status for cleanliness
    const { error: restErr } = await supabase
      .from('teacher_earnings')
      .update({ status: 'cleared', updated_at: new Date().toISOString() })
      .eq('id', teacherWithPending.id);
    assert(!restErr, 'Cleanly restored teacher_earnings row back to cleared');
  }

  // 4. Verification of Users counts
  console.log('\n--- 4. Testing User Categorization ---');
  const [
    { count: sCount },
    { count: tCount },
    { count: parCount },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
  ]);

  assert(typeof sCount === 'number' && sCount >= 0, `Student count resolved (${sCount})`);
  assert(typeof tCount === 'number' && tCount >= 0, `Teacher count resolved (${tCount})`);
  assert(typeof parCount === 'number' && parCount >= 0, `Parent count resolved (${parCount})`);

  console.log(`\n====================================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
}

testAdminFinance().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});


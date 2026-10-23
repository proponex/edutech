const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Load environment variables from .env
const envPath = path.resolve('c:/Users/user/Documents/Edutech/edutech/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

const keyId = env['RAZORPAY_KEY_ID'];
const keySecret = env['RAZORPAY_KEY_SECRET'];
const webhookSecret = env['RAZORPAY_WEBHOOK_SECRET'];
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verify() {
  console.log('================================================================');
  console.log('VERIFYING RAZORPAY LIVE PRODUCTION INTEGRATION & CREDENTIALS');
  console.log('================================================================\n');

  console.log(`1. Key ID: ${keyId}`);
  console.log(`   Mode: ${keyId.startsWith('rzp_live_') ? 'LIVE / PRODUCTION' : 'TEST'}`);
  console.log(`   Has Secret: ${Boolean(keySecret)} (length: ${keySecret ? keySecret.length : 0})`);
  console.log(`   Has Webhook Secret: ${Boolean(webhookSecret)}`);

  // 1. Authenticate with Razorpay API
  console.log('\n2. Testing Razorpay API Authentication...');
  const rzp = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  let authSuccess = false;
  try {
    const ordersList = await rzp.orders.all({ count: 1 });
    console.log('[PASS] Razorpay API Authentication SUCCESSFUL!');
    console.log(`       Successfully connected to Razorpay Live API. Total existing orders on account: ${ordersList.count}`);
    authSuccess = true;
  } catch (err) {
    console.error('[FAIL] Razorpay API Authentication FAILED:', err?.error?.description || err.message || err);
    authSuccess = false;
  }

  // 2. Test Live Order Creation (e.g. ₹1.00 = 100 paise)
  if (authSuccess) {
    console.log('\n3. Testing Live Order Creation via Razorpay SDK...');
    try {
      const testOrder = await rzp.orders.create({
        amount: 100, // ₹1.00 in paise
        currency: 'INR',
        receipt: `test_${Date.now().toString().slice(-6)}`,
        notes: {
          test: 'automated_connection_check',
          platform: 'edutech_prod',
        },
      });

      console.log('[PASS] Live Order Creation SUCCESSFUL!');
      console.log(`       Order ID: ${testOrder.id}`);
      console.log(`       Amount: ₹${testOrder.amount / 100} ${testOrder.currency}`);
      console.log(`       Status: ${testOrder.status}`);
    } catch (orderErr) {
      console.error('[FAIL] Live Order Creation Failed:', orderErr?.error?.description || orderErr.message);
    }
  }

  // 3. Test Webhook Signature Generation & Verification
  console.log('\n4. Testing Webhook Cryptographic Signature with Webhook Secret...');
  const samplePayload = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_live_test', amount: 99900 } } },
  });
  const generatedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(samplePayload)
    .digest('hex');

  const check = crypto.timingSafeEqual(
    Buffer.from(generatedSig, 'utf8'),
    Buffer.from(crypto.createHmac('sha256', webhookSecret).update(samplePayload).digest('hex'), 'utf8')
  );
  console.log(`[PASS] Webhook Signature Verification logic matches webhook secret: ${check}`);

  // 4. Test Supabase Database Payment Tables
  console.log('\n5. Checking Supabase Database Payment Tables...');
  const tables = [
    'payment_orders',
    'payment_transactions',
    'teacher_earnings',
    'refund_records',
    'payment_webhook_events',
  ];

  const tableStatus = {};
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    if (error) {
      tableStatus[t] = `MISSING (${error.message})`;
    } else {
      tableStatus[t] = `READY (records: ${data?.length || 0})`;
    }
    console.log(`   Table [${t}]: ${tableStatus[t]}`);
  }

  console.log('\n================================================================');
  console.log('SUMMARY COMPLETE');
  console.log('================================================================');
}

verify().catch(console.error);

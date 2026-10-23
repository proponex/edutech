const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
  const tables = [
    'channels',
    'units',
    'videos',
    'pricing_plans',
    'pricing_history',
    'channel_subscriptions',
    'payment_orders',
    'payment_transactions',
    'teacher_earnings',
    'refund_records',
    'payment_webhook_events'
  ];

  for (const t of tables) {
    const { data, error, count } = await supabase.from(t).select('*', { count: 'exact' }).limit(1);
    if (error) {
      console.log(`[TABLE] ${t}: ERROR -> ${error.message}`);
    } else {
      console.log(`[TABLE] ${t}: count = ${count}`);
      if (data && data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        console.log(`   Sample: ${JSON.stringify(data[0])}`);
      }
    }
  }
}

run().catch(console.error);

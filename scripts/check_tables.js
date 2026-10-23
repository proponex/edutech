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

async function check() {
  const tables = [
    'profiles', 'admins', 'teachers', 'students', 'parents', 'classes', 'boards',
    'channels', 'channel_classes', 'channel_boards', 'channel_specializations', 'channel_languages',
    'units', 'topics', 'sub_topics', 'videos', 'quizzes', 'homework',
    'channel_subscriptions', 'student_content_progress', 'teacher_messages',
    'pricing_plans', 'pricing_history', 'payment_orders', 'payment_transactions',
    'teacher_earnings', 'refund_records', 'payment_webhook_events', 'audit_logs', 'activity_logs',
    'teacher_content_pricing', 'content_entitlements'
  ];

  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table [${t}]: ${error ? 'NOT FOUND / ERROR (' + error.message + ')' : 'EXISTS'}`);
  }
}

check().catch(console.error);

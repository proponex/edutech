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
  const { error: insErr } = await supabase.from('parent_students').insert({});
  console.log('parent_students error:', insErr);

  // Check pg_stat or RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('exec_sql', {
    sql: "SELECT 1"
  });
  console.log('rpc exec_sql test:', rpcRes, rpcErr?.message);
}

run();

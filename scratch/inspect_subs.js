const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const envVars = {};
env.split('\n').forEach(l => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: teachers } = await supabase.from('profiles').select('id, name, email, role').eq('role', 'teacher');
  console.log('--- Teachers ---');
  console.log(teachers);

  for (const t of teachers || []) {
    const { data: chs } = await supabase.from('channels').select('id, name').eq('teacher_id', t.id);
    console.log(`\nTeacher: ${t.name} (${t.id}) Channels:`, chs);
    const chIds = (chs || []).map(c => c.id);
    if (chIds.length > 0) {
      const { data: allSubs } = await supabase.from('channel_subscriptions').select('*').in('channel_id', chIds);
      console.log(`All Subscriptions (${allSubs ? allSubs.length : 0}):`);
      console.log(allSubs);

      const now = new Date();
      const activeSubs = (allSubs || []).filter(s => s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > now));
      const uniqueActive = new Set(activeSubs.map(s => s.student_id));
      console.log(`\nFiltered Active Subscriptions (${activeSubs.length}), Unique Active Students (${uniqueActive.size}):`);
      console.log(Array.from(uniqueActive));

      // Check how page.tsx was querying:
      const nowIso = now.toISOString();
      const { data: pageQuerySubs } = await supabase
        .from('channel_subscriptions')
        .select('student_id, expires_at, status')
        .in('channel_id', chIds)
        .eq('status', 'active')
        .gt('expires_at', nowIso);
      console.log(`\nQuery from page.tsx with .gt('expires_at', nowIso):`, pageQuerySubs?.length);
    }
  }
}
inspect();


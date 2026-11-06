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

async function testCount() {
  const teacherId = '6670b737-514b-4850-a324-b6fef0066243';
  const { data: channels } = await supabase.from('channels').select('id').eq('teacher_id', teacherId);
  const channelIds = (channels || []).map(c => c.id);

  const { data: subs } = await supabase
    .from('channel_subscriptions')
    .select('student_id, expires_at, status')
    .in('channel_id', channelIds)
    .eq('status', 'active');

  const now = new Date();
  const activeSubs = (subs || []).filter(s => !s.expires_at || new Date(s.expires_at) > now);
  const uniqueStudents = new Set(activeSubs.map(s => s.student_id));

  console.log('Channel IDs:', channelIds);
  console.log('Raw Active Subs:', subs?.length);
  console.log('Filtered Active Subs:', activeSubs.length);
  console.log('Unique Active Student Count:', uniqueStudents.size);
}
testCount();


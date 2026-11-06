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

async function inspectData() {
  const { data: earnings } = await supabase.from('teacher_earnings').select('*').limit(5);
  console.log('Sample teacher_earnings:', earnings);

  const { data: progress } = await supabase.from('student_content_progress').select('*').limit(5);
  console.log('Sample student_content_progress:', progress);

  const { data: units } = await supabase.from('units').select('id, channel_id, subject_name, title');
  console.log('Sample units count:', units?.length);

  const { data: videos } = await supabase.from('videos').select('id, channel_id, subject_name, title');
  console.log('Sample videos count:', videos?.length);
}
inspectData();


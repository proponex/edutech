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

async function checkBanners() {
  const { data, error } = await supabase.from('banners').select('*').order('display_order', { ascending: true });
  console.log('Banners in DB:', JSON.stringify(data, null, 2), error);
}
checkBanners();


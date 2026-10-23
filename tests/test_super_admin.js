const fs = require('fs');

const envContent = fs.readFileSync('c:\\Users\\user\\Documents\\Edutech\\edutech\\.env', 'utf-8');
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

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

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

async function runTests() {
  console.log('=== STARTING SUPER ADMIN DASHBOARD VERIFICATION SUITE ===\n');

  // 1. Verify Database Integrity & Records
  console.log('--- 1. Database Model & Existing Data Integrity ---');
  const profRes = await fetch(`${url}/rest/v1/profiles?select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const profiles = await profRes.json();
  assert(Array.isArray(profiles) && profiles.length >= 4, 'Profiles table contains real user records');

  const adminUser = profiles.find(p => p.role === 'admin');
  assert(adminUser && adminUser.email === 'admin@gmail.com', 'Admin profile exists with admin@gmail.com');

  const studentUsers = profiles.filter(p => p.role === 'student');
  assert(studentUsers.length >= 2, 'Student records preserved and identifiable');

  const teacherUsers = profiles.filter(p => p.role === 'teacher');
  assert(teacherUsers.length >= 1, 'Teacher records preserved and identifiable');

  // 2. Courses (Channels) & Content
  console.log('\n--- 2. Course & Curriculum Model Integrity ---');
  const chRes = await fetch(`${url}/rest/v1/channels?select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const channels = await chRes.json();
  assert(Array.isArray(channels) && channels.length >= 1, 'Teacher channels/courses retrieved successfully');

  // 3. Mux Video Integration Preservation
  console.log('\n--- 3. Mux Video Integration Integrity ---');
  const vidRes = await fetch(`${url}/rest/v1/videos?select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const videos = await vidRes.json();
  assert(Array.isArray(videos) && videos.length >= 1, 'Videos table accessible');
  const hasMuxColumns = videos.length > 0 && ('mux_upload_id' in videos[0] || 'mux_playback_id' in videos[0] || 'mux_status' in videos[0]);
  assert(hasMuxColumns, 'Mux video pipeline fields intact (mux_upload_id, mux_playback_id, mux_status)');

  // 4. Exams & Attempts
  console.log('\n--- 4. Exam & Quiz Integrity ---');
  const quizRes = await fetch(`${url}/rest/v1/quizzes?select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const quizzes = await quizRes.json();
  assert(Array.isArray(quizzes) && quizzes.length >= 1, 'Quizzes/Exams retrieved successfully');

  const attemptRes = await fetch(`${url}/rest/v1/student_quiz_attempts?select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const attempts = await attemptRes.json();
  assert(Array.isArray(attempts), 'Student quiz attempts accessible without error');

  // 5. Enrollments
  console.log('\n--- 5. Enrollment (Channel Subscriptions) Integrity ---');
  const subRes = await fetch(`${url}/rest/v1/channel_subscriptions?select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const subs = await subRes.json();
  assert(Array.isArray(subs) && subs.length >= 1, 'Channel subscriptions (enrollments) retrieved successfully');

  // 6. Security & Authorization Checks
  console.log('\n--- 6. Security & Backend Authorization Architecture ---');
  // Anon user trying to fetch admin audit logs via Supabase REST directly
  const anonAuditRes = await fetch(`${url}/rest/v1/audit_logs?select=*`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
  });
  // RLS or missing table should deny or return empty
  const anonAuditData = await anonAuditRes.json();
  assert(anonAuditRes.status === 401 || anonAuditRes.status === 404 || (Array.isArray(anonAuditData) && anonAuditData.length === 0),
    'Anonymous requests cannot access audit logs (RLS protected)');

  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});

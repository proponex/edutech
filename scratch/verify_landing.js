const http = require('http');

function fetchPage() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

async function runVerification() {
  console.log('--- Starting EduTech Landing Page Full Reference Verification ---');
  const { status, html } = await fetchPage();
  console.log(`HTTP Status: ${status}`);

  if (status !== 200) {
    throw new Error(`Unexpected status ${status}`);
  }

  const checks = [
    { name: 'Header: EDUTECH Brand & Digital Classroom', pattern: /EDUTECH/ },
    { name: 'Header: Nav pill container', pattern: /bg-white\/80 py-2 px-6 rounded-full/ },
    { name: 'Hero: 3D Stacked Books Floating asset (Transparent PNG)', pattern: /hero_books_transparent\.png/ },
    { name: 'Hero: 3D Education Laptop Centerpiece (Transparent PNG)', pattern: /hero_laptop_transparent\.png/ },
    { name: 'Hero: Class 12 Comprehensive Prep Card', pattern: /Class 12 Comprehensive Prep/ },
    { name: 'Hero: 94% syllabus complete bar', pattern: /94% syllabus complete/ },
    { name: 'Hero: 320+ HD Lessons', pattern: /320\+.*HD Lessons/s },
    { name: 'Hero: 1,400+ Practices', pattern: /1,400\+.*Practices/s },
    { name: 'Hero: 4.9★ Faculty Rating', pattern: /4\.9★.*Faculty Rating/s },
    { name: 'Hero: Active wave animation on bottom divider', pattern: /animate-wave-flow/ },
    { name: 'Login: Role switcher (Student, Parent, Teacher)', pattern: /Student.*Parent.*Teacher/s },
    { name: 'Login: Email & Password Inputs', pattern: /id="hero-email".*id="hero-password"/s },
    { name: 'Narrative Banner: Designed from the Ground Up', pattern: /Designed from the Ground Up for Real Academic Mastery/ },
    { name: 'Narrative Banner: 3D Floating Laptop (Transparent PNG)', pattern: /centerpiece_narrative_transparent\.png/ },
    { name: 'How It Works: 3D Educational Stepping Stones Journey texture', pattern: /AB6AXuDw7EVrhLkDo/ },
    { name: 'How It Works: Animated Constellation dash flow', pattern: /animate-dash-flow/ },
    { name: 'How It Works: Animated Constellation glowing nodes', pattern: /animate-node-glow/ },
    { name: 'How It Works: Flowing wave divider', pattern: /animate-wave-flow-slow/ },
    { name: 'How It Works: 4 Elevated Glass Cards', pattern: /bg-white\/95 backdrop-blur-xl border border-violet-300\/40/ },
    { name: 'Student Experiences: 3D Pastel Study Desk (Transparent PNG)', pattern: /study_desk_transparent\.png/ },
    { name: 'Student Experiences: Flowing wave divider', pattern: /animate-wave-flow-reverse/ },
    { name: 'Features: Organic Lilac Topographical Pattern', pattern: /pattern-topographic/ },
    { name: 'Features: HD Video Lessons with 3D Study Desk (Transparent PNG)', pattern: /Crystal-Clear HD Video Lessons/ },
    { name: 'Features: Dedicated Parent Dashboard', pattern: /Dedicated Parent Dashboard/ },
    { name: 'Features: Curriculum Coverage with 3D Books Accent', pattern: /Full School Curriculum Coverage/ },
    { name: 'Features: Flowing wave divider into dark footer', pattern: /animate-wave-flow/ },
    { name: 'Footer: 8k Fluid Waves Luxury Texture', pattern: /AB6AXuDuUU5e1L/ },
    { name: 'Footer: Dark Violet Background (#130924)', pattern: /bg-\[#130924\]/ },
    { name: 'Clean Content: No Mux branding', pattern: /^(?!.*Mux).*$/s },
  ];

  let passed = 0;
  for (const check of checks) {
    if (check.pattern.test(html)) {
      console.log(`[PASS] ${check.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${check.name}`);
    }
  }

  console.log(`\nVerification Result: ${passed}/${checks.length} checks passed.`);
  if (passed !== checks.length) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});

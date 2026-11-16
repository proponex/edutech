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
  console.log('--- Starting EduTech Landing Page Requirements Verification ---');
  const { status, html } = await fetchPage();
  console.log(`HTTP Status: ${status}`);

  if (status !== 200) {
    throw new Error(`Unexpected status ${status}`);
  }

  const checks = [
    // 1. Role switcher removal
    {
      name: 'Login Card: Role switcher pills (student/parent/teacher) removed',
      test: () => !html.includes('capitalize px-3 py-1 rounded-lg transition-all cursor-pointer')
    },
    // 2. Banner cleanup
    {
      name: 'Banner: CBSE • ICSE • State Boards removed',
      test: () => !html.includes('CBSE • ICSE • State Boards')
    },
    {
      name: 'Banner: 4.9 / 5 Rating chip removed',
      test: () => !html.includes('4.9 / 5 Rating')
    },
    {
      name: 'Banner: Comprehensive K–12 Digital Learning chip removed',
      test: () => !html.includes('Comprehensive K–12 Digital Learning')
    },
    // 3. Review page removal
    {
      name: 'Review Section: Hear from the Families We Serve completely removed',
      test: () => !html.includes('Hear from the Families We Serve') && !html.includes('STUDENT &amp; PARENT STORIES')
    },
    {
      name: 'Header & Footer: Student Experiences nav links removed',
      test: () => !html.includes('href="/#experiences"') && !html.includes('href="#experiences"')
    },
    // 4. How It Works light theme & multiple dark violet waves
    {
      name: 'How It Works: Light theme background applied',
      test: () => html.includes('bg-gradient-to-b from-[#F8F6FF] via-[#FAF8FF] to-[#F8F6FF]')
    },
    {
      name: 'How It Works: Multiple dark violet waves beside the cards',
      test: () => html.includes('MULTIPLE DARK VIOLET WAVES BESIDE THE CARDS') || (html.includes('fill="#1E1035"') && html.includes('fill="#2A174E"') && html.includes('fill="#3D1E6D"'))
    },
    {
      name: 'How It Works: Bottom wording with tick logo removed from cards',
      test: () => !html.includes('Quick Role-Based Setup') && !html.includes('Real-Time Progress Insights')
    },
    // 5. HD Video Lessons image
    {
      name: 'HD Video Lessons: Related theme image (hd_video_lesson_transparent.png) rendered',
      test: () => html.includes('hd_video_lesson_transparent.png')
    },
    {
      name: 'HD Video Lessons: Old study desk image removed from features card',
      test: () => !html.includes('study_desk_transparent.png')
    },
    // 6. Core functionality intact
    {
      name: 'Header: Brand & Navigation intact',
      test: () => html.includes('EDUTECH') && html.includes('How It Works') && html.includes('Features')
    },
    {
      name: 'Hero: Login email & password inputs working',
      test: () => html.includes('id="hero-email"') && html.includes('id="hero-password"')
    },
    {
      name: 'Hero: 3D Centerpiece Laptop preserved',
      test: () => html.includes('hero_laptop_transparent.png')
    },
    {
      name: 'Hero: Class 12 Comprehensive Prep Card preserved',
      test: () => html.includes('Class 12 Comprehensive Prep')
    },
    {
      name: 'Footer: Dark luxury violet footer preserved',
      test: () => html.includes('bg-[#130924]')
    }
  ];

  let passed = 0;
  for (const check of checks) {
    if (check.test()) {
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

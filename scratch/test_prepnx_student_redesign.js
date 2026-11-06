const fs = require('fs');
const path = require('path');

const studentPagePath = path.join(__dirname, '..', 'src', 'app', 'student', 'page.tsx');
const prepnxHomePath = path.join(__dirname, '..', 'src', 'components', 'student', 'PrepnxStudentHome.tsx');
const headerPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'header.tsx');
const paymentsPath = path.join(__dirname, '..', 'src', 'app', 'student', 'payments', 'page.tsx');
const analysisPath = path.join(__dirname, '..', 'src', 'components', 'student', 'channel-analysis-section.tsx');
const globalsPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const studentLayoutPath = path.join(__dirname, '..', 'src', 'app', 'student', 'layout.tsx');
const footerPath = path.join(__dirname, '..', 'src', 'components', 'student', 'PrepnxFooter.tsx');

const studentPage = fs.readFileSync(studentPagePath, 'utf8');
const prepnxHome = fs.readFileSync(prepnxHomePath, 'utf8');
const header = fs.readFileSync(headerPath, 'utf8');
const payments = fs.readFileSync(paymentsPath, 'utf8');
const analysis = fs.readFileSync(analysisPath, 'utf8');
const globals = fs.readFileSync(globalsPath, 'utf8');
const studentLayout = fs.existsSync(studentLayoutPath) ? fs.readFileSync(studentLayoutPath, 'utf8') : '';
const footer = fs.existsSync(footerPath) ? fs.readFileSync(footerPath, 'utf8') : '';

let passed = 0;
let total = 0;

function assert(condition, description) {
  total++;
  if (condition) {
    console.log(`[PASS] ${description}`);
    passed++;
  } else {
    console.error(`[FAIL] ${description}`);
  }
}

console.log('================================================================');
console.log('RUNNING PREPNX STUDENT DASHBOARD & HOMEPAGE REDESIGN TEST SUITE');
console.log('================================================================');

// 1. Mandatory Theme and branding tokens in globals.css
assert(globals.includes('--color-brand-500'), 'globals.css defines Prepnx brand color tokens');
assert(globals.includes('--color-navy-900'), 'globals.css defines Prepnx navy color tokens');
assert(globals.includes('--color-prepnx-bg: #FAF9FF'), 'globals.css defines --color-prepnx-bg (#FAF9FF)');
assert(globals.includes('--color-prepnx-primary: #9333EA'), 'globals.css defines --color-prepnx-primary (#9333EA)');
assert(globals.includes('--color-prepnx-primary-hover: #7E22CE'), 'globals.css defines --color-prepnx-primary-hover (#7E22CE)');
assert(globals.includes('--color-prepnx-lavender: #F3E8FF'), 'globals.css defines --color-prepnx-lavender (#F3E8FF)');
assert(globals.includes('--color-prepnx-border: #E9DDF8'), 'globals.css defines --color-prepnx-border (#E9DDF8)');
assert(globals.includes('--color-prepnx-text-main: #17133A'), 'globals.css defines --color-prepnx-text-main (#17133A)');
assert(globals.includes('--color-prepnx-text-muted: #68647D'), 'globals.css defines --color-prepnx-text-muted (#68647D)');
assert(globals.includes('.prepnx-student-theme'), 'globals.css defines .prepnx-student-theme isolation class');

// 2. Global Centered Content Container
const containerClass = 'w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto';
assert(header.includes(containerClass), 'Header uses centered container width');
assert(prepnxHome.includes(containerClass), 'PrepnxStudentHome uses centered container width');
assert(studentPage.includes(containerClass), 'Student page non-home tabs use centered container width');
assert(payments.includes(containerClass), 'Student payments page uses centered container width');
assert(footer.includes(containerClass), 'PrepnxFooter uses centered container width');

// 3. Header Top Navigation
assert(header.includes('Prepnx'), 'Header displays "Prepnx" branding for students');
assert(header.includes("name: 'Home', href: '/student'"), 'Header nav contains Home');
assert(header.includes("name: 'Channels', href: '/student?tab=channels'"), 'Header nav contains Channels');
assert(header.includes("name: 'Analysis', href: '/student?tab=analysis'"), 'Header nav contains Analysis');
assert(header.includes("name: 'Subscription', href: '/student/payments'"), 'Header nav contains Subscription');
assert(header.includes('<Bell'), 'Header student section contains notification Bell icon');
assert(header.includes('ChevronDown'), 'Header student section contains ChevronDown dropdown arrow next to avatar');
assert(header.includes('studentMenuOpen'), 'Header student section contains student avatar dropdown menu');
assert(header.includes('My Profile'), 'Student dropdown menu contains "My Profile"');
assert(header.includes('Account Settings'), 'Student dropdown menu contains "Account Settings"');
assert(header.includes('My Subscriptions'), 'Student dropdown menu contains "My Subscriptions"');
assert(header.includes('Sign Out'), 'Student dropdown menu contains "Sign Out"');

// 4. Hero Banner Carousel & Database Connection
assert(prepnxHome.includes("from('banners')"), 'Hero Carousel queries Supabase banners table');
assert(prepnxHome.includes("eq('is_active', true)"), 'Hero Carousel queries active banners (is_active = true)');
assert(prepnxHome.includes('Learn • Practice • Achieve'), 'Hero Carousel includes "Learn • Practice • Achieve" title');
assert(prepnxHome.includes('Ace Your Exams'), 'Hero Carousel includes floating "Ace Your Exams" badge');
assert(prepnxHome.includes('Explore Channels'), 'Hero Carousel includes "Explore Channels" CTA button');
assert(prepnxHome.includes('heroSlideIdx'), 'Hero Carousel maintains active index state');
assert(prepnxHome.includes('slides.length > 1'), 'Hero Carousel auto-rotates only when more than 1 banner exists');
assert(prepnxHome.includes('setIsHeroPaused(true)'), 'Hero Carousel pauses on hover');

// 5. Popular Classes Overlapping Hero
assert(prepnxHome.includes('Popular Classes'), 'Section 3 renders "Popular Classes" container');
assert(prepnxHome.includes('-mt-10 sm:-mt-14 md:-mt-16 relative z-20'), 'Popular Classes overlaps bottom of Hero banner');
assert(prepnxHome.includes('Class 12') && prepnxHome.includes('#F3E8FF'), 'Popular Classes contains Class 12 with lavender card (#F3E8FF)');
assert(prepnxHome.includes('Class 11') && prepnxHome.includes('#E5F0FF'), 'Popular Classes contains Class 11 with light blue card (#E5F0FF)');
assert(prepnxHome.includes('Class 10') && prepnxHome.includes('#FCE7F3'), 'Popular Classes contains Class 10 with soft rose card (#FCE7F3)');
assert(prepnxHome.includes('handleClassSelect'), 'Popular class cards navigate/scroll to explore courses with class selected');

// 6. Explore Courses (LKG - Class 12)
assert(prepnxHome.includes('Explore Courses') && prepnxHome.includes('LKG – Class 12'), 'Section 4 renders "Explore Courses (LKG – Class 12)"');
assert(prepnxHome.includes('LKG – UKG'), 'Filter pills include "LKG – UKG"');
assert(prepnxHome.includes('Class 1 – 5'), 'Filter pills include "Class 1 – 5"');
assert(prepnxHome.includes('Class 6'), 'Filter pills include "Class 6"');
assert(prepnxHome.includes('Class 9'), 'Filter pills include "Class 9"');
assert(prepnxHome.includes('scrollCourses'), 'Course cards section provides left/right horizontal scroll buttons');
assert(prepnxHome.includes('View') && prepnxHome.includes('ArrowRight'), 'Course cards provide active View button with arrow linking to channels/classes');
assert(prepnxHome.includes('STATIC_COURSE_CARDS'), 'Educational illustration course cards mapped');

// 7. Student Testimonials Carousel
assert(prepnxHome.includes('What Our Students Say'), 'Section 6 renders "What Our Students Say"');
assert(prepnxHome.includes('Aanya Sharma'), 'Testimonials include Aanya Sharma');
assert(prepnxHome.includes('Rohan Mehta'), 'Testimonials include Rohan Mehta');
assert(prepnxHome.includes('Diya Nair'), 'Testimonials include Diya Nair');
assert(prepnxHome.includes('testimonialIdx'), 'Testimonials maintain carousel state');

// 8. Learning CTA Banner
assert(prepnxHome.includes('Start Your Learning Journey'), 'Section 7 renders "Start Your Learning Journey" CTA banner');
assert(prepnxHome.includes('Explore Courses') && prepnxHome.includes('ArrowRight'), 'Learning CTA includes "Explore Courses" button');

// 9. Prepnx Footer
assert(footer.includes('A complete learning platform'), 'PrepnxFooter includes Prepnx brand description');
assert(footer.includes('Quick Links'), 'PrepnxFooter includes Quick Links column');
assert(footer.includes('Courses'), 'PrepnxFooter includes Courses column');
assert(footer.includes('Support'), 'PrepnxFooter includes Support column');
assert(footer.includes('Prepnx Inc. All rights reserved'), 'PrepnxFooter includes Prepnx copyright');
assert(studentPage.includes('<PrepnxFooter />'), 'Student page includes PrepnxFooter');
assert(payments.includes('<PrepnxFooter />'), 'Payments page includes PrepnxFooter');

// 10. Unified Light Lavender Theme Across All Student Tabs
assert(studentLayout.includes('prepnx-student-theme'), 'Student layout enforces prepnx-student-theme class');
assert(studentPage.includes('bg-[#FAF9FF]'), 'Student page root uses light background #FAF9FF');
assert(studentPage.includes('<PrepnxStudentHome'), 'Mounts PrepnxStudentHome on currentTab === "home"');
assert(payments.includes('bg-[#FAF9FF]'), 'Student payments page uses light background #FAF9FF');
assert(payments.includes('#9333EA'), 'Student payments page uses primary lavender #9333EA');
assert(payments.includes('28-Day Cycle'), 'Student payments page shows 28-day billing cycle information');
assert(payments.includes('Active Subscriptions'), 'Student payments page shows Active Subscriptions section');
assert(payments.includes('Purchases &amp; Invoices') || payments.includes('Purchases & Invoices'), 'Student payments page shows Purchases & Invoices table');
assert(analysis.includes('#9333EA'), 'Channel analysis section uses primary lavender #9333EA');
assert(analysis.includes('#F3E8FF'), 'Channel analysis section uses lavender accent #F3E8FF');

// 11. Profile Modal Theme & Fields
assert(studentPage.includes('Student Profile'), 'Student profile modal present');
assert(studentPage.includes('Permanent Student ID'), 'Student permanent ID block present');
assert(studentPage.includes('bg-[#9333EA] hover:bg-[#7E22CE] text-white'), 'Modal save button uses purple theme (#9333EA hover #7E22CE)');

// 12. Channels Tab Locked vs Subscribed
assert(studentPage.includes('Subscribe to Unlock'), 'Channels tab differentiates locked channels with "Subscribe to Unlock"');
assert(studentPage.includes('Enter Classroom'), 'Channels tab provides "Enter Classroom" for subscribed channels');

console.log('================================================================');
console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log('================================================================');

if (passed === total) {
  console.log('ALL PREPNX STUDENT REDESIGN TESTS PASSED SUCCESSFULLY! ✓');
  process.exit(0);
} else {
  console.error('SOME TESTS FAILED! ✗');
  process.exit(1);
}

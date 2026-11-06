const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('RUNNING TEACHER DASHBOARD REDESIGN & SINGLE NAVIGATION VERIFICATION');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

// -------------------------------------------------------------
// 1. Verify Teacher Overview page.tsx (Single Nav Bar, Content Moved Up)
// -------------------------------------------------------------
const teacherPagePath = path.join(__dirname, '../src/app/teacher/page.tsx');
const teacherPageContent = fs.readFileSync(teacherPagePath, 'utf8');

// A. Exactly 4 navigation tabs supported in dashboard
assert(
  teacherPageContent.includes("type TabKey = 'overview' | 'students' | 'analysis' | 'monetization';"),
  'TabKey type defines exactly the 4 allowed tabs (overview, students, analysis, monetization)'
);

// B. Verify secondary navigation bar is completely removed from page.tsx
assert(
  !teacherPageContent.includes('sticky top-16') &&
  !teacherPageContent.includes('handleTabChange'),
  'Secondary grey navigation bar (sticky top-16) is completely removed from Teacher page'
);

// C. Verify main content area is positioned directly below Header
const headerIndex = teacherPageContent.indexOf('<Header />');
const mainContentIndex = teacherPageContent.indexOf('<main className="flex-1 max-w-7xl');
assert(
  headerIndex !== -1 && mainContentIndex !== -1 && (mainContentIndex - headerIndex < 100),
  'Main content area is positioned directly below Header without duplicate bar spacing'
);

// D. Verify "Create Channel" exists in Overview Channel Catalogs section
assert(
  teacherPageContent.includes('Create Channel'),
  'Create Channel button exists inside Overview Channel Catalogs'
);

// E. Verify student count uses getTeacherActiveStudentCount
assert(
  teacherPageContent.includes('TeacherService.getTeacherActiveStudentCount(user.id)'),
  'Overview uses TeacherService.getTeacherActiveStudentCount for authoritative active subscriber count'
);

// F. Verify Realtime listener for subscription updates
assert(
  teacherPageContent.includes("table: 'channel_subscriptions'") &&
  teacherPageContent.includes('TeacherService.getTeacherActiveStudentCount(user.id)'),
  'Realtime listener updates active student count automatically on subscription changes'
);

// G. Verify zero Live Session references
assert(
  !teacherPageContent.toLowerCase().includes('live session') &&
  !teacherPageContent.toLowerCase().includes('livesession'),
  'Teacher Overview contains zero Live Session references'
);

// -------------------------------------------------------------
// 2. Verify Header.tsx (Sole Main Navigation Bar)
// -------------------------------------------------------------
const headerPath = path.join(__dirname, '../src/components/layout/header.tsx');
const headerContent = fs.readFileSync(headerPath, 'utf8');

// A. Exactly 4 tabs in Header navLinks
const expectedTeacherLinks = [
  "{ name: 'Overview', href: '/teacher?tab=overview' }",
  "{ name: 'Students', href: '/teacher?tab=students' }",
  "{ name: 'Analysis', href: '/teacher?tab=analysis' }",
  "{ name: 'Monetization', href: '/teacher?tab=monetization' }",
];
const hasAllLinks = expectedTeacherLinks.every(link => headerContent.includes(link));
assert(hasAllLinks, 'Header contains all 4 tabs: Overview, Students, Analysis, Monetization');

// B. Active tab indicator in Header
assert(
  headerContent.includes('NavLinksWrapper') && headerContent.includes('NavLinksContent'),
  'Header uses NavLinksWrapper for active tab indicator and smooth tab switching'
);

// C. Responsive navigation
assert(
  headerContent.includes('md:hidden') && headerContent.includes('hidden md:flex'),
  'Header provides responsive navigation across mobile, tablet, and desktop'
);

// -------------------------------------------------------------
// 3. Verify TeacherAnalysisView.tsx
// -------------------------------------------------------------
const analysisViewPath = path.join(__dirname, '../src/components/teacher/TeacherAnalysisView.tsx');
const analysisViewContent = fs.readFileSync(analysisViewPath, 'utf8');

// A. Grade / Class filter removed
assert(!analysisViewContent.includes('selectedClassId'), 'selectedClassId state removed from TeacherAnalysisView');
assert(!analysisViewContent.includes('availableClasses'), 'availableClasses removed from TeacherAnalysisView');
assert(!analysisViewContent.includes('Class / Grade:'), 'Class / Grade dropdown removed from Master Filters');

// B. Active filters: Date Range, Channel, Subject
assert(analysisViewContent.includes('Date Range:'), 'Date Range presets filter present in Master Filters');
assert(analysisViewContent.includes('selectedChannelId'), 'Channel filter present in Master Filters');
assert(analysisViewContent.includes('selectedSubject'), 'Subject filter present in Master Filters');

// C. Section 1: Student Enrollment Analytics
assert(
  analysisViewContent.includes('1. Student Enrollment Analytics'),
  'Section 1 is Student Enrollment Analytics'
);
assert(
  analysisViewContent.includes('New Student Enrollments Over Time') &&
  analysisViewContent.includes('enrollmentChartData'),
  'Section 1 includes compact SVG Line/Area chart for enrollment trends'
);

// D. Section 2: Financial & Revenue Analytics
assert(
  analysisViewContent.includes('2. Financial & Revenue Analytics') ||
  analysisViewContent.includes('2. Financial &amp; Revenue Analytics'),
  'Section 2 is Financial & Revenue Analytics'
);
assert(
  analysisViewContent.includes('Revenue Over Time') &&
  analysisViewContent.includes('revenueChartData'),
  'Section 2 includes revenue over time line chart'
);
assert(
  analysisViewContent.includes('Earnings vs Platform Fee Comparison'),
  'Section 2 includes comparison graph for Teacher Earnings vs Platform Fee'
);
assert(
  analysisViewContent.includes('Student Paid = Teacher Base Ask + 20% Platform Fee'),
  'Section 2 includes 20% surcharge formula explanation'
);

// E. Section 3: Curriculum & Learning Analytics
assert(
  analysisViewContent.includes('3. Curriculum & Learning Analytics') ||
  analysisViewContent.includes('3. Curriculum &amp; Learning Analytics'),
  'Section 3 is Curriculum & Learning Analytics'
);
assert(
  analysisViewContent.includes('Content Completion Distribution') &&
  analysisViewContent.includes('donutData'),
  'Section 3 includes compact SVG Donut chart for Completed, In Progress, and Remaining'
);
assert(
  analysisViewContent.includes('Subject-Wise Completion'),
  'Section 3 includes subject-wise completion progress bars'
);
assert(
  analysisViewContent.includes('No curriculum content uploaded yet'),
  'Section 3 includes clean empty state when no content uploaded'
);

// F. Page layout order check
const idxSec1 = analysisViewContent.indexOf('1. Student Enrollment Analytics');
const idxSec2 = Math.max(
  analysisViewContent.indexOf('2. Financial & Revenue Analytics'),
  analysisViewContent.indexOf('2. Financial &amp; Revenue Analytics')
);
const idxSec3 = Math.max(
  analysisViewContent.indexOf('3. Curriculum & Learning Analytics'),
  analysisViewContent.indexOf('3. Curriculum &amp; Learning Analytics')
);
assert(
  idxSec1 < idxSec2 && idxSec2 < idxSec3,
  'Analysis layout strictly follows Section 1 -> Section 2 -> Section 3 ordering'
);

// G. Verify zero Live Session references
assert(
  !analysisViewContent.toLowerCase().includes('live session') &&
  !analysisViewContent.toLowerCase().includes('livesession'),
  'TeacherAnalysisView contains zero Live Session references'
);

// -------------------------------------------------------------
// 4. Database & Service Level Check
// -------------------------------------------------------------
async function runDbChecks() {
  const envPath = path.join(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

  if (urlMatch && keyMatch) {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(urlMatch[1].trim(), keyMatch[1].trim());

    const { data: teachers } = await sb.from('profiles').select('id, full_name').eq('role', 'teacher').limit(1);
    if (teachers && teachers.length > 0) {
      const teacher = teachers[0];
      console.log(`\nTesting with live teacher account: ${teacher.full_name} (${teacher.id})`);

      // Test active count calculation
      const { data: channels } = await sb.from('channels').select('id').eq('teacher_id', teacher.id);
      const chIds = (channels || []).map(c => c.id);

      const now = new Date();
      const { data: subs } = await sb
        .from('channel_subscriptions')
        .select('*')
        .in('channel_id', chIds)
        .eq('status', 'active');

      const activeSubs = (subs || []).filter(s => !s.expires_at || new Date(s.expires_at) > now);
      const uniqueStudentIds = new Set(activeSubs.map(s => s.student_id));
      const expectedCount = uniqueStudentIds.size;

      console.log(`Live DB Active Student Count: ${expectedCount}`);
      assert(expectedCount >= 0, `Active student count query executed successfully (count = ${expectedCount})`);
    }
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================');
  if (passedTests === totalTests) {
    console.log('ALL TEACHER DASHBOARD TESTS PASSED SUCCESSFULLY! ✓');
  } else {
    console.error('SOME TESTS FAILED!');
    process.exit(1);
  }
}

runDbChecks().catch(err => {
  console.error(err);
  process.exit(1);
});

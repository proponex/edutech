const fs = require('fs');
const path = require('path');

// 1. src/app/admin/page.tsx
const adminFile = path.join(__dirname, '../src/app/admin/page.tsx');
let adminCode = fs.readFileSync(adminFile, 'utf8');
adminCode = adminCode.replace(
  'handleCopy(item.payment_address, item.id)',
  'handleCopy(item.payment_address || item.upi_id || item.gpay_number || "", item.id)'
);
fs.writeFileSync(adminFile, adminCode, 'utf8');
console.log('1. Fixed admin/page.tsx handleCopy');

// 2. src/components/teacher/TeacherSubjectMonetization.tsx
const monFile = path.join(__dirname, '../src/components/teacher/TeacherSubjectMonetization.tsx');
let monCode = fs.readFileSync(monFile, 'utf8');
monCode = monCode.replace(
  '{formatRupees(req.requested_amount_paise)}',
  '{formatRupees(req.amount_paise || req.requested_amount_paise || 0)}'
);
monCode = monCode.replace(
  '{new Date(req.created_at).toLocaleDateString(',
  '{new Date(req.created_at || req.requested_at || Date.now()).toLocaleDateString('
);
fs.writeFileSync(monFile, monCode, 'utf8');
console.log('2. Fixed TeacherSubjectMonetization.tsx date & amount');

// 3. src/lib/withdrawal-service.ts
const withFile = path.join(__dirname, '../src/lib/withdrawal-service.ts');
let withCode = fs.readFileSync(withFile, 'utf8');
withCode = withCode.replace(
  'requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());',
  'requests.sort((a, b) => new Date(b.created_at || b.requested_at || 0).getTime() - new Date(a.created_at || a.requested_at || 0).getTime());'
);
fs.writeFileSync(withFile, withCode, 'utf8');
console.log('3. Fixed withdrawal-service.ts date sorting');

// 4. Update TeacherStudentsView group heading to exact requested format
const studFile = path.join(__dirname, '../src/components/teacher/TeacherStudentsView.tsx');
let studCode = fs.readFileSync(studFile, 'utf8');
studCode = studCode.replace(
  '{group.classLabel} &ndash; {group.channel.name}',
  'Class {group.classLabel} – {group.channel.name} ({group.activeStudents.length} active students)'
);
fs.writeFileSync(studFile, studCode, 'utf8');
console.log('4. Updated TeacherStudentsView group heading format');

console.log('All 4 files updated successfully.');


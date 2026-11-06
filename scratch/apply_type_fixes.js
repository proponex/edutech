const fs = require('fs');
const path = require('path');

// 1. Fix src/types/index.ts
const typesPath = path.join(__dirname, '../src/types/index.ts');
let typesCode = fs.readFileSync(typesPath, 'utf8');

// Add subjects?: string[] to ChannelItem
if (!typesCode.includes('subjects?: string[];')) {
  typesCode = typesCode.replace(
    'specializations?: string[];',
    'specializations?: string[];\n  subjects?: string[];'
  );
  console.log('1a. Added subjects to ChannelItem in types');
}

// Update WithdrawalStatus, WithdrawalPaymentMethod, TeacherWithdrawalRequest
const oldWithdrawalDef = `export type WithdrawalStatus = 'requested' | 'processing' | 'completed' | 'rejected';
export type WithdrawalPaymentMethod = 'upi' | 'gpay' | 'bank_transfer';

export interface TeacherWithdrawalRequest {
  id: string;
  teacher_id: string;
  requested_amount_paise: number;
  currency: string;
  payment_method: WithdrawalPaymentMethod;
  upi_id?: string | null;
  gpay_number?: string | null;
  qr_image_url?: string | null;
  notes?: string | null;
  status: WithdrawalStatus;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  payout_reference?: string | null;
  processed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  teacher_name?: string;
  teacher_email?: string;
  teacher_phone?: string | null;
  teacher_photo_url?: string | null;
  channel_name?: string | null;
  available_earnings_paise?: number;
}`;

const newWithdrawalDef = `export type WithdrawalStatus = 'pending' | 'requested' | 'processing' | 'completed' | 'rejected';
export type WithdrawalPaymentMethod = 'upi' | 'gpay' | 'gpay_number' | 'upi_id' | 'bank_transfer';

export interface TeacherWithdrawalRequest {
  id: string;
  teacher_id: string;
  amount_paise: number;
  amount_rupees?: number;
  requested_amount_paise?: number;
  currency?: string;
  payment_method: WithdrawalPaymentMethod;
  payment_address?: string;
  upi_id?: string | null;
  gpay_number?: string | null;
  qr_code_url?: string | null;
  qr_image_url?: string | null;
  notes?: string | null;
  payment_notes?: string | null;
  status: WithdrawalStatus;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  utr_reference?: string | null;
  payout_reference?: string | null;
  processed_by?: string | null;
  requested_at: string;
  processed_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields for display
  teacher?: {
    name?: string;
    email?: string;
    phone?: string | null;
    photo_url?: string | null;
  };
  channel?: {
    name?: string;
  };
  teacher_name?: string;
  teacher_email?: string;
  teacher_phone?: string | null;
  teacher_photo_url?: string | null;
  channel_name?: string | null;
  teacher_available_balance_rupees?: number;
  available_earnings_paise?: number;
}`;

if (typesCode.includes("export type WithdrawalStatus = 'requested'")) {
  typesCode = typesCode.replace(oldWithdrawalDef, newWithdrawalDef);
  console.log('1b. Updated Withdrawal types in src/types/index.ts');
}
fs.writeFileSync(typesPath, typesCode, 'utf8');

// 2. Fix src/app/channels/[channelId]/page.tsx subscriptionStatus type definition
const channelPagePath = path.join(__dirname, '../src/app/channels/[channelId]/page.tsx');
let channelCode = fs.readFileSync(channelPagePath, 'utf8');

const oldSubStatusState = `  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasActiveSubscription: boolean;
    isExpired: boolean;
    subscription: ChannelSubscription | null;
    expiresAt?: string;
    startsAt?: string;
    daysRemaining?: number;
  } | null>(null);`;

const newSubStatusState = `  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasActiveSubscription: boolean;
    isExpired: boolean;
    subscription: ChannelSubscription | null;
    subscriptions?: ChannelSubscription[];
    activeSubjectNames?: string[];
    hasChannelWideSubscription?: boolean;
    expiresAt?: string;
    startsAt?: string;
    daysRemaining?: number;
  } | null>(null);`;

if (channelCode.includes(oldSubStatusState)) {
  channelCode = channelCode.replace(oldSubStatusState, newSubStatusState);
  fs.writeFileSync(channelPagePath, channelCode, 'utf8');
  console.log('2. Fixed subscriptionStatus state type in channels/[channelId]/page.tsx');
} else {
  // Try normalized replacement
  const cNorm = channelCode.replace(/\r\n/g, '\n');
  const oldNorm = oldSubStatusState.replace(/\r\n/g, '\n');
  const newNorm = newSubStatusState.replace(/\r\n/g, '\n');
  if (cNorm.includes(oldNorm)) {
    const fixed = cNorm.replace(oldNorm, newNorm);
    fs.writeFileSync(channelPagePath, channelCode.includes('\r\n') ? fixed.replace(/\n/g, '\r\n') : fixed, 'utf8');
    console.log('2. Fixed subscriptionStatus state type (normalized)');
  }
}

// 3. Fix src/components/teacher/TeacherStudentsView.tsx videosCompleted / quizzesCompleted
const studViewPath = path.join(__dirname, '../src/components/teacher/TeacherStudentsView.tsx');
let studCode = fs.readFileSync(studViewPath, 'utf8');

const oldStudTarget = `            const pctTotal = totalChannelContentCount > 0
              ? Math.round((completedItems.length / totalChannelContentCount) * 100)
              : 0;

            chStudentsMap.set(sid, {`;

const newStudTarget = `            const videosCompleted = completedItems.filter((c) => c.content_type === 'video').length;
            const quizzesCompleted = completedItems.filter((c) => c.content_type === 'quiz').length;

            const pctTotal = totalChannelContentCount > 0
              ? Math.round((completedItems.length / totalChannelContentCount) * 100)
              : 0;

            chStudentsMap.set(sid, {`;

if (studCode.includes(oldStudTarget)) {
  studCode = studCode.replace(oldStudTarget, newStudTarget);
  fs.writeFileSync(studViewPath, studCode, 'utf8');
  console.log('3. Fixed videosCompleted and quizzesCompleted in TeacherStudentsView');
} else {
  const sNorm = studCode.replace(/\r\n/g, '\n');
  const oldNorm = oldStudTarget.replace(/\r\n/g, '\n');
  const newNorm = newStudTarget.replace(/\r\n/g, '\n');
  if (sNorm.includes(oldNorm)) {
    const fixed = sNorm.replace(oldNorm, newNorm);
    fs.writeFileSync(studViewPath, studCode.includes('\r\n') ? fixed.replace(/\n/g, '\r\n') : fixed, 'utf8');
    console.log('3. Fixed videosCompleted in TeacherStudentsView (normalized)');
  }
}

// 4. Fix src/components/teacher/TeacherAnalysisView.tsx lines with channel.subjects
const anaViewPath = path.join(__dirname, '../src/components/teacher/TeacherAnalysisView.tsx');
let anaCode = fs.readFileSync(anaViewPath, 'utf8');
anaCode = anaCode.replace(
  '(ch.specializations || ch.subjects || []).forEach((s: any) => {',
  '(ch.specializations || (ch as any).subjects || []).forEach((s: any) => {'
);
anaCode = anaCode.replace(
  '(ch.specializations || ch.subjects || []).forEach((s) => {',
  '(ch.specializations || (ch as any).subjects || []).forEach((s: any) => {'
);
fs.writeFileSync(anaViewPath, anaCode, 'utf8');
console.log('4. Fixed subject iteration in TeacherAnalysisView');

// 5. Fix src/components/teacher/TeacherSubjectMonetization.tsx lines with channel.subjects
const monViewPath = path.join(__dirname, '../src/components/teacher/TeacherSubjectMonetization.tsx');
let monCode = fs.readFileSync(monViewPath, 'utf8');
monCode = monCode.replace(
  '(ch.specializations || ch.subjects || []).forEach((s) => {',
  '(ch.specializations || (ch as any).subjects || []).forEach((s: any) => {'
);
monCode = monCode.replace(
  'const chSubjects = selectedChannel.specializations || selectedChannel.subjects || [];',
  'const chSubjects = selectedChannel.specializations || (selectedChannel as any).subjects || [];'
);
fs.writeFileSync(monViewPath, monCode, 'utf8');
console.log('5. Fixed subject iteration in TeacherSubjectMonetization');

// 6. Fix duplicate success in src/app/api/admin/withdrawals/route.ts
const adminApiWith = path.join(__dirname, '../src/app/api/admin/withdrawals/route.ts');
let adminApiCode = fs.readFileSync(adminApiWith, 'utf8');
adminApiCode = adminApiCode.replace(
  'return NextResponse.json({\n      success: true,\n      ...result,\n    });',
  'return NextResponse.json(result);'
);
fs.writeFileSync(adminApiWith, adminApiCode, 'utf8');
console.log('6. Fixed duplicate success in api/admin/withdrawals');

// 7. Fix src/app/teacher/page.tsx subcomponent props
const teacherPagePath = path.join(__dirname, '../src/app/teacher/page.tsx');
let teacherCode = fs.readFileSync(teacherPagePath, 'utf8');
teacherCode = teacherCode.replace(
  `<TeacherStudentsView />`,
  `<TeacherStudentsView teacherId={profile?.id || ''} />`
);
teacherCode = teacherCode.replace(
  `<TeacherAnalysisView />`,
  `<TeacherAnalysisView teacherId={profile?.id || ''} channels={channels} />`
);
teacherCode = teacherCode.replace(
  `<TeacherSubjectMonetization />`,
  `<TeacherSubjectMonetization channels={channels} />`
);
fs.writeFileSync(teacherPagePath, teacherCode, 'utf8');
console.log('7. Fixed subcomponent props in src/app/teacher/page.tsx');

console.log('All type fixes applied successfully!');


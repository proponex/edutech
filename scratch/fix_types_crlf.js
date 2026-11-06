const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '../src/types/index.ts');
let code = fs.readFileSync(typesPath, 'utf8');

const isCRLF = code.includes('\r\n');
let norm = code.replace(/\r\n/g, '\n');

// 1. Add subjects?: string[] to ChannelItem
if (!norm.includes('subjects?: string[];')) {
  norm = norm.replace(
    'specializations?: string[];',
    'specializations?: string[];\n  subjects?: string[];'
  );
  console.log('Added subjects to ChannelItem');
}

// 2. Replace Withdrawal types
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

if (norm.includes(oldWithdrawalDef)) {
  norm = norm.replace(oldWithdrawalDef, newWithdrawalDef);
  console.log('Replaced TeacherWithdrawalRequest definition in types');
} else {
  console.log('Could not find oldWithdrawalDef in norm');
}

const finalCode = isCRLF ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(typesPath, finalCode, 'utf8');
console.log('Finished fixing src/types/index.ts');


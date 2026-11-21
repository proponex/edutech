import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { sendOtpEmail } from '@/lib/email-service';

export interface OtpPayload {
  name?: string;
  role?: string;
  password?: string;
  phone?: string;
  parentPhone?: string;
  classId?: string;
  boardId?: string;
  subjects?: string[];
  preferredLanguage?: string;
  photoUrl?: string | null;
  [key: string]: unknown;
}

export interface StoredOtp {
  id: string;
  email: string;
  otpHash: string;
  purpose: 'signup' | 'password_reset' | 'email_verification';
  payload: OtpPayload;
  attempts: number;
  maxAttempts: number;
  resendAvailableAt: number; // timestamp ms
  expiresAt: number; // timestamp ms
  verifiedAt: number | null;
  createdAt: number;
}

export interface StoredResetToken {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: number;
  usedAt: number | null;
}

// Global In-Memory Fallback Store (singleton across Next.js reloads)
interface GlobalOtpStore {
  otps: Map<string, StoredOtp>;
  resetTokens: Map<string, StoredResetToken>;
}

declare global {
  // eslint-disable-next-line no-var
  var __prepnx_otp_store: GlobalOtpStore | undefined;
}

if (!globalThis.__prepnx_otp_store) {
  globalThis.__prepnx_otp_store = {
    otps: new Map<string, StoredOtp>(),
    resetTokens: new Map<string, StoredResetToken>(),
  };
}

const memoryStore = globalThis.__prepnx_otp_store;

const OTP_SECRET = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'prepnx-auth-secret-key-2026';
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

export function generateSecureOtp(): string {
  // 6 digit cryptographically secure random number
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashValue(value: string): string {
  return crypto.createHmac('sha256', OTP_SECRET).update(value).digest('hex');
}

function timingSafeMatch(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function getMemoryKey(email: string, purpose: string): string {
  return `${email.toLowerCase().trim()}:${purpose}`;
}

export async function createAndSendOtp({
  email,
  purpose,
  payload = {},
}: {
  email: string;
  purpose: 'signup' | 'password_reset' | 'email_verification';
  payload?: OtpPayload;
}): Promise<{
  success: boolean;
  resendAvailableIn: number;
  message?: string;
  error?: string;
  simulated?: boolean;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const memKey = getMemoryKey(normalizedEmail, purpose);

  // 1. Check rate limit cooldown from memory store
  const existing = memoryStore.otps.get(memKey);
  if (existing && existing.resendAvailableAt > now && !existing.verifiedAt) {
    const remainingSecs = Math.ceil((existing.resendAvailableAt - now) / 1000);
    return {
      success: false,
      resendAvailableIn: remainingSecs,
      error: `Please wait ${remainingSecs} seconds before requesting a new code.`,
    };
  }

  // 2. Generate cryptographically secure OTP
  const rawOtp = generateSecureOtp();
  const otpHash = hashValue(`${normalizedEmail}:${rawOtp}`);
  const expiresAt = now + OTP_EXPIRY_MS;
  const resendAvailableAt = now + RESEND_COOLDOWN_MS;

  const otpRecord: StoredOtp = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    otpHash,
    purpose,
    payload,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    resendAvailableAt,
    expiresAt,
    verifiedAt: null,
    createdAt: now,
  };

  // Always update memory store
  memoryStore.otps.set(memKey, otpRecord);

  // 3. Attempt database persistence if email_otps table exists
  try {
    const supabase = createServiceClient();
    await supabase.from('email_otps').insert({
      id: otpRecord.id,
      email: normalizedEmail,
      otp_hash: otpHash,
      purpose,
      payload,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      resend_available_at: new Date(resendAvailableAt).toISOString(),
      expires_at: new Date(expiresAt).toISOString(),
    });
  } catch (dbErr) {
    // Graceful fallback to memory store if migration hasn't been applied yet
    console.warn('[OtpService] Database write skipped, memory fallback used:', (dbErr as Error)?.message);
  }

  // 4. Send email via SMTP
  const emailResult = await sendOtpEmail({
    to: normalizedEmail,
    name: payload.name,
    otp: rawOtp,
    purpose,
  });

  return {
    success: true,
    resendAvailableIn: 60,
    message: 'Verification code sent to your email.',
    simulated: emailResult.simulated,
  };
}

export async function verifyOtp({
  email,
  otp,
  purpose,
}: {
  email: string;
  otp: string;
  purpose: 'signup' | 'password_reset' | 'email_verification';
}): Promise<{
  valid: boolean;
  payload?: OtpPayload;
  error?: string;
  remainingAttempts?: number;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanOtp = otp.trim();
  const now = Date.now();
  const memKey = getMemoryKey(normalizedEmail, purpose);

  // Retrieve from memory store first
  let record = memoryStore.otps.get(memKey);

  // If not found in memory or expired in memory, try DB
  if (!record) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from('email_otps')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('purpose', purpose)
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        record = {
          id: data.id,
          email: data.email,
          otpHash: data.otp_hash,
          purpose: data.purpose,
          payload: (data.payload as OtpPayload) || {},
          attempts: data.attempts || 0,
          maxAttempts: data.max_attempts || MAX_ATTEMPTS,
          resendAvailableAt: new Date(data.resend_available_at).getTime(),
          expiresAt: new Date(data.expires_at).getTime(),
          verifiedAt: data.verified_at ? new Date(data.verified_at).getTime() : null,
          createdAt: new Date(data.created_at).getTime(),
        };
        memoryStore.otps.set(memKey, record);
      }
    } catch {
      // ignore
    }
  }

  if (!record) {
    return {
      valid: false,
      error: 'No active verification code found. Please request a new code.',
    };
  }

  if (record.verifiedAt) {
    return {
      valid: false,
      error: 'This code has already been used. Please request a new code.',
    };
  }

  if (now > record.expiresAt) {
    memoryStore.otps.delete(memKey);
    return {
      valid: false,
      error: 'This verification code has expired. Please request a new code.',
    };
  }

  if (record.attempts >= record.maxAttempts) {
    memoryStore.otps.delete(memKey);
    return {
      valid: false,
      error: 'Too many incorrect attempts. For security, please request a new code.',
      remainingAttempts: 0,
    };
  }

  // Calculate expected hash
  const expectedHash = hashValue(`${normalizedEmail}:${cleanOtp}`);
  const isMatch = timingSafeMatch(expectedHash, record.otpHash);

  if (!isMatch) {
    record.attempts += 1;
    const remaining = record.maxAttempts - record.attempts;

    // Update attempts in DB
    try {
      const supabase = createServiceClient();
      await supabase.from('email_otps').update({ attempts: record.attempts }).eq('id', record.id);
    } catch {
      // ignore
    }

    if (remaining <= 0) {
      memoryStore.otps.delete(memKey);
      return {
        valid: false,
        error: 'Too many incorrect attempts. Please request a new code.',
        remainingAttempts: 0,
      };
    }

    return {
      valid: false,
      error: `Incorrect verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
      remainingAttempts: remaining,
    };
  }

  // SUCCESS: Mark as verified & single-use consumption
  record.verifiedAt = now;
  memoryStore.otps.delete(memKey);

  try {
    const supabase = createServiceClient();
    await supabase.from('email_otps').update({ verified_at: new Date().toISOString() }).eq('id', record.id);
  } catch {
    // ignore
  }

  return {
    valid: true,
    payload: record.payload,
  };
}

export function createPasswordResetToken(userId: string, email: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashValue(rawToken);
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 mins

  const resetRecord: StoredResetToken = {
    id: crypto.randomUUID(),
    userId,
    email: email.toLowerCase().trim(),
    tokenHash,
    expiresAt,
    usedAt: null,
  };

  memoryStore.resetTokens.set(tokenHash, resetRecord);

  // Optional DB write
  try {
    const supabase = createServiceClient();
    supabase.from('password_reset_tokens').insert({
      id: resetRecord.id,
      user_id: userId,
      email: resetRecord.email,
      token_hash: tokenHash,
      expires_at: new Date(expiresAt).toISOString(),
    });
  } catch {
    // ignore
  }

  return rawToken;
}

export async function verifyPasswordResetToken(
  email: string,
  rawToken: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const tokenHash = hashValue(rawToken);
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  let record = memoryStore.resetTokens.get(tokenHash);

  if (!record) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('used_at', null)
        .limit(1)
        .maybeSingle();

      if (data) {
        record = {
          id: data.id,
          userId: data.user_id,
          email: data.email,
          tokenHash: data.token_hash,
          expiresAt: new Date(data.expires_at).getTime(),
          usedAt: data.used_at ? new Date(data.used_at).getTime() : null,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!record) {
    return { valid: false, error: 'Invalid or expired password reset session.' };
  }

  if (record.email !== normalizedEmail) {
    return { valid: false, error: 'Reset token does not match the provided email.' };
  }

  if (record.usedAt || now > record.expiresAt) {
    memoryStore.resetTokens.delete(tokenHash);
    return { valid: false, error: 'Reset token has expired. Please initiate a new password reset.' };
  }

  // Invalidate
  record.usedAt = now;
  memoryStore.resetTokens.delete(tokenHash);

  try {
    const supabase = createServiceClient();
    await supabase.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('id', record.id);
  } catch {
    // ignore
  }

  return { valid: true, userId: record.userId };
}

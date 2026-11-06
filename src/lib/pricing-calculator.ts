/**
 * ==============================================================================
 * AUTHORITATIVE CENTRALIZED FINANCIAL CALCULATION UTILITY
 * ==============================================================================
 *
 * EduTech Pricing Rule:
 * The teacher's price is the base amount. The platform adds 20 paise for every ?1 of teacher earnings.
 *
 * For every ?1.00 earned by the teacher:
 *   - Teacher receives: ?1.00 (100 paise)
 *   - Platform receives: ?0.20 (20 paise)
 *   - Student pays: ?1.20 (120 paise)
 *
 * Formulas:
 * 1. Given Teacher Base Amount (B):
 *    Student Payment = Teacher Base Amount + 20% of Teacher Base Amount
 *    Platform Fee = Math.round(B * 0.20)
 *    Student Payable = B + Platform Fee
 *
 * 2. Given Student Payment (G):
 *    Teacher Earnings = Math.round(G / 1.20)
 *    Platform Fee = G - Teacher Earnings
 *
 * Integer Paise Precision:
 * 1 INR = 100 paise. Floating-point arithmetic is strictly avoided.
 * ==============================================================================
 */

export interface PricingBreakdownFromBase {
  teacherBasePaise: number;
  platformFeePaise: number;
  studentPayablePaise: number;
}

export interface DecomposedPaymentBreakdown {
  grossPaise: number;
  teacherSharePaise: number;
  platformCommissionPaise: number;
  commissionRatePercent: number;
}

/**
 * Given teacher's desired net base earnings in paise, calculates the 20% platform surcharge
 * and the final student payable amount in paise.
 *
 * Examples:
 *   - ?1 base (100 paise)   -> platform fee ?0.20 (20 paise)   -> student pays ?1.20 (120 paise)
 *   - ?10 base (1,000 paise) -> platform fee ?2.00 (200 paise)  -> student pays ?12.00 (1,200 paise)
 *   - ?100 base (10,000 paise)-> platform fee ?20.00 (2,000 paise)-> student pays ?120.00 (12,000 paise)
 *   - ?1,000 base (100,000 paise) -> platform fee ?200.00 (20,000 paise) -> student pays ?1,200.00 (120,000 paise)
 */
export function calculatePricingFromTeacherBase(teacherBasePaise: number): PricingBreakdownFromBase {
  if (!teacherBasePaise || teacherBasePaise <= 0) {
    return {
      teacherBasePaise: 0,
      platformFeePaise: 0,
      studentPayablePaise: 0,
    };
  }

  const base = Math.round(teacherBasePaise);
  const platformFeePaise = Math.round(base * 0.20);
  const studentPayablePaise = base + platformFeePaise;

  return {
    teacherBasePaise: base,
    platformFeePaise,
    studentPayablePaise,
  };
}

/**
 * Given the total amount paid by the student (gross payment including 20% surcharge),
 * decomposes it into teacher earnings (gross / 1.20) and platform fee (gross - teacher earnings).
 *
 * Examples:
 *   - Student pays ?1.20 (120 paise)   -> Teacher ?1.00 (100 paise), Platform ?0.20 (20 paise)
 *   - Student pays ?12.00 (1,200 paise) -> Teacher ?10.00 (1,000 paise), Platform ?2.00 (200 paise)
 *   - Student pays ?120.00 (12,000 paise) -> Teacher ?100.00 (10,000 paise), Platform ?20.00 (2,000 paise)
 *   - Student pays ?1,200.00 (120,000 paise) -> Teacher ?1,000.00 (100,000 paise), Platform ?200.00 (20,000 paise)
 */
export function decomposeStudentPayment(grossPaise: number): DecomposedPaymentBreakdown {
  if (!grossPaise || grossPaise <= 0) {
    return {
      grossPaise: 0,
      teacherSharePaise: 0,
      platformCommissionPaise: 0,
      commissionRatePercent: 20.0,
    };
  }

  const gross = Math.round(grossPaise);
  // Teacher Earnings = Student Payment / 1.20
  const teacherSharePaise = Math.round(gross / 1.20);
  // Platform Fee = Student Payment - Teacher Earnings
  const platformCommissionPaise = gross - teacherSharePaise;

  return {
    grossPaise: gross,
    teacherSharePaise,
    platformCommissionPaise,
    commissionRatePercent: 20.0,
  };
}

/**
 * Backward compatibility alias for calculateCommission
 */
export function calculateCommission(grossPaise: number): DecomposedPaymentBreakdown {
  return decomposeStudentPayment(grossPaise);
}


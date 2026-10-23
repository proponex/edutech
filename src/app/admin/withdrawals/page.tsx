'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowDownToLine,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';

export default function AdminWithdrawalsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Future Disbursement Workflow
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Withdrawal Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Teacher payout request review, banking verification, and disbursement approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/earnings">
            <Button size="sm" variant="outline" className="flex items-center gap-1.5">
              <span>Teacher Earnings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Notice Card */}
      <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Payout Approval Workflow Prepared for Phase 2
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              When RazorpayX or banking transfer APIs are connected, teachers can request withdrawals from their cleared earnings. Administrators will review bank details, approve or reject requests with audit logging, and initiate automated transfers.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Workflow Stages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Request Filed</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Teacher submits withdrawal request for eligible balance above the minimum threshold.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Admin Review</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Super Admin verifies banking IFSC/UPI credentials and validates balance clearance.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Disbursement</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            RazorpayX automated transfer or manual NEFT/RTGS batch transfer initiated.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
              4
            </span>
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Reconciliation</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Bank reference number stored in audit ledger and teacher balance marked settled.
          </p>
        </div>
      </div>
    </div>
  );
}

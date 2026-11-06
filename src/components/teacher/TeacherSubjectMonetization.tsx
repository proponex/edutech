'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  Search,
  ArrowRight,
  BookOpen,
  Tv,
  ArrowLeft,
  Edit,
  Save,
  X,
  AlertCircle,
  Upload,
  Check,
  Eye,
  DollarSign,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChannelItem, TeacherWithdrawalRequest, WithdrawalPaymentMethod } from '@/types';

interface SubjectPriceRow {
  subjectName: string;
  teacherBasePaise: number;
  platformFeePaise: number;
  studentPricePaise: number;
  isEditing?: boolean;
  tempBaseRupees?: string;
  saving?: boolean;
}

export function TeacherSubjectMonetization({ channels }: { channels: ChannelItem[] }) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [subjectRows, setSubjectRows] = useState<SubjectPriceRow[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingSuccess, setPricingSuccess] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Withdrawal States
  const [summary, setSummary] = useState<{
    totalEarnedPaise: number;
    paidOutPaise: number;
    unpaidPaise: number;
    inFlightReservedPaise: number;
    availableForWithdrawalPaise: number;
    requests: TeacherWithdrawalRequest[];
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Withdrawal Modal State
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'confirm'>('form');
  const [withdrawAmountRupees, setWithdrawAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<WithdrawalPaymentMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [gpayNumber, setGpayNumber] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [notes, setNotes] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string | null>(null);

  // QR Preview Modal
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);

  // Fetch Teacher Financial / Withdrawal Summary
  const loadWithdrawalSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/teacher/withdrawals');
      const data = await res.json();
      if (res.ok && data.success) {
        setSummary({
          totalEarnedPaise: data.totalEarnedPaise || 0,
          paidOutPaise: data.paidOutPaise || 0,
          unpaidPaise: data.unpaidPaise || 0,
          inFlightReservedPaise: data.inFlightReservedPaise || 0,
          availableForWithdrawalPaise: data.availableForWithdrawalPaise || 0,
          requests: data.requests || [],
        });
      }
    } catch (err) {
      console.error('[TeacherSubjectMonetization] Error loading summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadWithdrawalSummary();
  }, [loadWithdrawalSummary]);

  // Load Subject Pricing for selected channel
  const loadSubjectPricing = useCallback(async (channel: ChannelItem) => {
    setLoadingPricing(true);
    setPricingError(null);
    setPricingSuccess(null);

    try {
      // 1. Gather all subjects belonging to this channel
      const rawSubjects = new Set<string>();
      (channel.specializations || []).forEach((s) => rawSubjects.add(s));
      (channel.subjects || []).forEach((s) => rawSubjects.add(s));

      // Also fetch units to discover subjects with uploaded content
      try {
        const uRes = await fetch(`/api/monetization/pricing?channelId=${channel.id}`);
        const uData = await uRes.json();
        if (uData.subjectsPricing) {
          uData.subjectsPricing.forEach((sp: any) => {
            if (sp.subject_name) rawSubjects.add(sp.subject_name);
          });
        }
      } catch {
        // Ignored
      }

      if (rawSubjects.size === 0) {
        rawSubjects.add('General Subject');
      }

      // 2. Fetch authoritative pricing from API
      const pRes = await fetch(`/api/monetization/pricing?channelId=${channel.id}`);
      const pData = await pRes.json();
      const existingSubjectPricing: any[] = pData.subjectsPricing || [];

      const rows: SubjectPriceRow[] = Array.from(rawSubjects).map((subjName) => {
        const match = existingSubjectPricing.find((p) => p.subject_name === subjName);
        const basePaise = match ? Number(match.monthly_paise || 100000) : 100000; // Default ₹1,000 (100,000 paise)
        const feePaise = Math.round(basePaise * 0.20);
        const studentPaise = basePaise + feePaise;

        return {
          subjectName: subjName,
          teacherBasePaise: basePaise,
          platformFeePaise: feePaise,
          studentPricePaise: studentPaise,
          isEditing: false,
          tempBaseRupees: (basePaise / 100).toString(),
        };
      });

      setSubjectRows(rows);
    } catch (err: any) {
      setPricingError(err?.message || 'Failed to load subject pricing.');
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  const handleSelectChannel = (channel: ChannelItem) => {
    setSelectedChannel(channel);
    loadSubjectPricing(channel);
  };

  const handleStartEdit = (index: number) => {
    setSubjectRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, isEditing: true, tempBaseRupees: (r.teacherBasePaise / 100).toString() }
          : r
      )
    );
  };

  const handleCancelEdit = (index: number) => {
    setSubjectRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, isEditing: false } : r))
    );
  };

  const handleSavePrice = async (index: number) => {
    if (!selectedChannel) return;
    const row = subjectRows[index];
    const rupees = parseFloat(row.tempBaseRupees || '0');

    if (isNaN(rupees) || rupees < 1) {
      setPricingError('Minimum teacher price is ₹1.00.');
      return;
    }

    const basePaise = Math.round(rupees * 100);
    const feePaise = Math.round(basePaise * 0.20);
    const studentPaise = basePaise + feePaise;

    setSubjectRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, saving: true } : r))
    );
    setPricingError(null);
    setPricingSuccess(null);

    try {
      const res = await fetch('/api/monetization/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: selectedChannel.id,
          scope: 'subject',
          subject_name: row.subjectName,
          is_paid: true,
          monthly_paise: basePaise,
          six_month_paise: basePaise * 5,
          yearly_paise: basePaise * 10,
          reason: `Teacher updated price for ${row.subjectName}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save subject price.');
      }

      setSubjectRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                teacherBasePaise: basePaise,
                platformFeePaise: feePaise,
                studentPricePaise: studentPaise,
                isEditing: false,
                saving: false,
              }
            : r
        )
      );

      setPricingSuccess(`Price for ${row.subjectName} updated: Teacher receives ₹${rupees.toLocaleString('en-IN')}, Student pays ₹${(studentPaise / 100).toLocaleString('en-IN')}.`);
      setTimeout(() => setPricingSuccess(null), 4000);
    } catch (err: any) {
      setPricingError(err?.message || 'Error saving price.');
      setSubjectRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, saving: false } : r))
      );
    }
  };

  // Upload QR image
  const handleUploadQrFile = async (file: File) => {
    setUploadingQr(true);
    setWithdrawalError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/teacher/withdrawals/upload-qr', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload QR scanner image.');
      }

      setQrImageUrl(data.url);
      setQrFile(file);
    } catch (err: any) {
      setWithdrawalError(err.message || 'QR upload failed.');
    } finally {
      setUploadingQr(false);
    }
  };

  // Submit Withdrawal Request
  const handleSubmitWithdrawal = async () => {
    setSubmittingWithdrawal(true);
    setWithdrawalError(null);

    try {
      const amtRupees = parseFloat(withdrawAmountRupees);
      if (isNaN(amtRupees) || amtRupees < 1) {
        throw new Error('Minimum withdrawal amount is ₹1.00.');
      }

      const res = await fetch('/api/teacher/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaise: Math.round(amtRupees * 100),
          paymentMethod,
          upiId: upiId.trim() || null,
          gpayNumber: gpayNumber.trim() || null,
          qrImageUrl: qrImageUrl || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit withdrawal request.');
      }

      setWithdrawalSuccess('Withdrawal request submitted successfully! Admin will process your payout.');
      setWithdrawModalOpen(false);
      setWithdrawStep('form');
      setWithdrawAmountRupees('');
      setUpiId('');
      setGpayNumber('');
      setQrImageUrl(null);
      setQrFile(null);
      setNotes('');

      await loadWithdrawalSummary();
      setTimeout(() => setWithdrawalSuccess(null), 5000);
    } catch (err: any) {
      setWithdrawalError(err.message || 'Failed to submit withdrawal.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-8 font-sans">
      {/* ========================================================================= */}
      {/* TOP HEADER: MONETIZATION & WITHDRAWAL REQUEST ACTION */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              <Percent className="w-3.5 h-3.5 text-primary-600" />
              Tab 4 &bull; Monetization &amp; Subject Pricing
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Subject-Wise Pricing &amp; Teacher Payouts
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure independent pricing per subject and request payment of your accumulated earnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setWithdrawModalOpen(true);
              setWithdrawStep('form');
              setWithdrawalError(null);
            }}
            disabled={!summary || summary.availableForWithdrawalPaise < 100}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 font-bold text-xs sm:text-sm h-10 px-5 rounded-xl cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Request Withdrawal</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {withdrawalSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{withdrawalSuccess}</span>
        </div>
      )}

      {pricingSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{pricingSuccess}</span>
        </div>
      )}

      {pricingError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{pricingError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEACHER EARNINGS BALANCE CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available for Withdrawal */}
        <Card className="border border-primary-200 dark:border-primary-800/80 bg-primary-50/20 dark:bg-primary-950/20 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              Available to Withdraw
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {loadingSummary ? '...' : formatRupees(summary?.availableForWithdrawalPaise || 0)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Ready for immediate payout request
            </p>
          </div>
        </Card>

        {/* Card 2: Reserved / In-Flight */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              In-Flight Requests
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {loadingSummary ? '...' : formatRupees(summary?.inFlightReservedPaise || 0)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Reserved in pending requests
            </p>
          </div>
        </Card>

        {/* Card 3: Total Withdrawn / Paid Out */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Total Withdrawn
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {loadingSummary ? '...' : formatRupees(summary?.paidOutPaise || 0)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Successfully received in bank/UPI
            </p>
          </div>
        </Card>

        {/* Card 4: Total Lifetime Earned */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Lifetime Earnings
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {loadingSummary ? '...' : formatRupees(summary?.totalEarnedPaise || 0)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Total 80% teacher base share earned
            </p>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A & B: CHANNEL SELECTION & SUBJECT-WISE PRICING */}
      {/* ========================================================================= */}
      {!selectedChannel ? (
        /* CHANNEL SELECTION VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Select Channel to Manage Subject Pricing
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose a channel to set base earnings per subject. Student prices and platform fees are calculated automatically.
              </p>
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl bg-white dark:bg-neutral-900 text-neutral-400">
              No channels created yet. Create a channel in the Overview tab first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {channels.map((ch) => {
                const classLabel = ch.classes?.map((c) => c.name).join(', ') || 'Classroom';
                const subCount = (ch.specializations?.length || 0) + (ch.subjects?.length || 0);

                return (
                  <Card
                    key={ch.id}
                    className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-800 dark:text-primary-300 font-bold flex items-center justify-center text-lg shrink-0">
                          {ch.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Badge variant="secondary" className="text-[10px] mb-1 font-semibold">
                            {classLabel}
                          </Badge>
                          <h3 className="font-extrabold text-base text-neutral-900 dark:text-white line-clamp-1">
                            {ch.name}
                          </h3>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-2">
                        {ch.description || 'Independent creator channel.'}
                      </p>
                      <div className="text-[11px] font-medium text-neutral-400 pt-1">
                        Subjects: {subCount > 0 ? `${subCount} configured` : 'Default'}
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                      <Button
                        onClick={() => handleSelectChannel(ch)}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs cursor-pointer"
                      >
                        <span>View / Manage Pricing</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* SUBJECT-WISE PRICING MANAGEMENT FOR SELECTED CHANNEL */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Channel Selection</span>
              </button>
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                {selectedChannel.classes?.map((c) => c.name).join(', ') || 'Class'} &ndash; {selectedChannel.name}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Set the price you want to earn per subject. Platform fee (20%) and student total are calculated automatically.
              </p>
            </div>
          </div>

          {/* Pricing Rule Info Box */}
          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-900 dark:text-white block font-bold">
                Pricing Rule: Teacher Price + 20% Platform Fee = Student Payable
              </strong>
              <span>
                Enter the exact amount you wish to earn per 28-day cycle. For example, setting ₹1,000 adds ₹200 (20%) platform fee, resulting in ₹1,200 charged to students.
              </span>
            </div>
          </div>

          {/* SUBJECT PRICING TABLE */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">Subject</th>
                    <th className="py-3.5 px-5 text-right">Teacher Price (Base)</th>
                    <th className="py-3.5 px-5 text-right">Platform Fee (20%)</th>
                    <th className="py-3.5 px-5 text-right">Student Price (Total)</th>
                    <th className="py-3.5 px-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {loadingPricing ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        Loading subject pricing...
                      </td>
                    </tr>
                  ) : subjectRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        No subjects found in this channel. Add subjects in the channel editor.
                      </td>
                    </tr>
                  ) : (
                    subjectRows.map((row, idx) => (
                      <tr
                        key={row.subjectName}
                        className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        {/* Subject */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/80 text-primary-800 dark:text-primary-300 font-bold flex items-center justify-center text-xs shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-extrabold text-sm text-neutral-900 dark:text-white block">
                                {row.subjectName}
                              </span>
                              <span className="text-[10px] text-neutral-400">Standard 28-day cycle</span>
                            </div>
                          </div>
                        </td>

                        {/* Teacher Price */}
                        <td className="py-4 px-5 text-right">
                          {row.isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs font-bold text-neutral-400">₹</span>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={row.tempBaseRupees}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = parseFloat(val || '0');
                                  const baseP = Math.round(num * 100);
                                  const feeP = Math.round(baseP * 0.20);
                                  setSubjectRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx
                                        ? {
                                            ...r,
                                            tempBaseRupees: val,
                                            platformFeePaise: feeP,
                                            studentPricePaise: baseP + feeP,
                                          }
                                        : r
                                    )
                                  );
                                }}
                                className="w-28 h-8 text-right font-bold text-xs rounded-lg"
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-sm text-neutral-900 dark:text-white">
                              {formatRupees(row.teacherBasePaise)}
                            </span>
                          )}
                        </td>

                        {/* Platform Fee (20%) */}
                        <td className="py-4 px-5 text-right font-medium text-neutral-500 dark:text-neutral-400">
                          {formatRupees(row.platformFeePaise)}
                        </td>

                        {/* Student Price */}
                        <td className="py-4 px-5 text-right">
                          <span className="font-black text-sm text-primary-700 dark:text-primary-400">
                            {formatRupees(row.studentPricePaise)}
                          </span>
                        </td>

                        {/* Action: Edit / Save / Cancel */}
                        <td className="py-4 px-5 text-center">
                          {row.isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSavePrice(idx)}
                                disabled={row.saving}
                                className="h-7 px-2.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-1 font-bold cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                                <span>{row.saving ? 'Saving...' : 'Save'}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelEdit(idx)}
                                disabled={row.saving}
                                className="h-7 px-2 text-xs rounded-lg cursor-pointer"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(idx)}
                              className="h-7 px-3 text-xs rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: TEACHER WITHDRAWAL HISTORY TABLE */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Withdrawal Request History
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Track the status of your payment requests and bank transfer reference numbers.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadWithdrawalSummary}
            disabled={loadingSummary}
            className="text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Request Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Payment Reference (UTR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {!summary || summary.requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      No withdrawal requests submitted yet. Use &ldquo;Request Withdrawal&rdquo; above to withdraw your balance.
                    </td>
                  </tr>
                ) : (
                  summary.requests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Request ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-neutral-900 dark:text-white">
                        {req.id.slice(0, 12)}...
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-black text-sm text-neutral-900 dark:text-white">
                        {formatRupees(req.amount_paise || req.requested_amount_paise || 0)}
                      </td>

                      {/* Destination */}
                      <td className="py-3.5 px-4 text-xs">
                        {req.gpay_number && (
                          <span className="block font-medium">GPay: {req.gpay_number}</span>
                        )}
                        {req.upi_id && (
                          <span className="block font-medium text-neutral-600 dark:text-neutral-400">UPI: {req.upi_id}</span>
                        )}
                        {req.qr_image_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewQrUrl(req.qr_image_url || null)}
                            className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline mt-0.5 cursor-pointer font-bold"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>View QR Code</span>
                          </button>
                        )}
                      </td>

                      {/* Request Date */}
                      <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                        {new Date(req.created_at || req.requested_at || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {req.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {req.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            Processing
                          </span>
                        )}
                        {req.status === 'requested' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                            <Clock className="w-3 h-3" />
                            Requested
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                            <X className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Payment Reference */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                        {req.payout_reference ? (
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {req.payout_reference}
                          </span>
                        ) : req.rejection_reason ? (
                          <span className="text-rose-600 dark:text-rose-400 text-xs font-normal">
                            Reason: {req.rejection_reason}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">Pending Admin Transfer</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WITHDRAWAL REQUEST FORM / CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400 block">
                  Educator Payout Disbursal
                </span>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
                  Request Earnings Withdrawal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawModalOpen(false)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{withdrawalError}</span>
              </div>
            )}

            {withdrawStep === 'form' ? (
              /* STEP 1: FORM INPUTS */
              <div className="space-y-4">
                {/* Available balance highlight */}
                <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary-700 dark:text-primary-400 block">
                      Available to Withdraw
                    </span>
                    <span className="text-2xl font-black text-neutral-900 dark:text-white">
                      {formatRupees(summary?.availableForWithdrawalPaise || 0)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (summary) {
                        setWithdrawAmountRupees((summary.availableForWithdrawalPaise / 100).toString());
                      }
                    }}
                    className="text-xs h-7 px-2.5 font-bold cursor-pointer"
                  >
                    Max Amount
                  </Button>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Withdrawal Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 500"
                      value={withdrawAmountRupees}
                      onChange={(e) => setWithdrawAmountRupees(e.target.value)}
                      className="pl-8 h-10 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Payment Destination Options */}
                <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Payout Destination (Provide at least one) <span className="text-rose-500">*</span>
                  </span>

                  {/* GPay Number */}
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Google Pay-Linked Mobile Number:
                    </label>
                    <Input
                      placeholder="e.g. 9876543210"
                      value={gpayNumber}
                      onChange={(e) => setGpayNumber(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  {/* UPI ID */}
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      UPI ID (VPA):
                    </label>
                    <Input
                      placeholder="e.g. educator@oksbi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  {/* QR Code Upload */}
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Optional QR Code / Scanner Image:
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer text-xs text-neutral-600 dark:text-neutral-400">
                        <Upload className="w-4 h-4 text-primary-600" />
                        <span>{qrFile ? qrFile.name : uploadingQr ? 'Uploading QR...' : 'Upload GPay/PhonePe QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadQrFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {qrImageUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewQrUrl(qrImageUrl)}
                          className="px-2.5 py-2 rounded-xl text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Additional Instructions */}
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Additional Notes / Instructions:
                    </label>
                    <Input
                      placeholder="e.g. Preferred bank transfer if UPI fails"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWithdrawModalOpen(false)}
                    className="rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const amt = parseFloat(withdrawAmountRupees);
                      if (isNaN(amt) || amt < 1) {
                        setWithdrawalError('Please enter a valid withdrawal amount of at least ₹1.00.');
                        return;
                      }
                      if (!upiId.trim() && !gpayNumber.trim() && !qrImageUrl) {
                        setWithdrawalError('Please provide a Google Pay number, UPI ID, or upload a QR scanner.');
                        return;
                      }
                      setWithdrawalError(null);
                      setWithdrawStep('confirm');
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Proceed to Confirm
                  </Button>
                </div>
              </div>
            ) : (
              /* STEP 2: CONFIRMATION SCREEN */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Available Withdrawable Earnings:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {formatRupees(summary?.availableForWithdrawalPaise || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200/60 dark:border-neutral-700/60 pt-2">
                    <span className="text-neutral-400 font-bold">Requested Withdrawal Amount:</span>
                    <span className="font-black text-base text-primary-700 dark:text-primary-400">
                      ₹{parseFloat(withdrawAmountRupees || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200/60 dark:border-neutral-700/60 pt-2">
                    <span className="text-neutral-400">Payment Destination:</span>
                    <span className="font-bold text-neutral-900 dark:text-white text-right">
                      {gpayNumber ? `GPay: ${gpayNumber}` : ''}
                      {gpayNumber && upiId ? ' | ' : ''}
                      {upiId ? `UPI: ${upiId}` : ''}
                      {qrImageUrl ? ' | QR Code Provided' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200/60 dark:border-neutral-700/60 pt-2">
                    <span className="text-neutral-400">Request Date:</span>
                    <span className="font-mono text-neutral-900 dark:text-white">
                      {new Date().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {notes && (
                    <div className="flex justify-between border-t border-neutral-200/60 dark:border-neutral-700/60 pt-2">
                      <span className="text-neutral-400">Notes:</span>
                      <span className="italic text-neutral-700 dark:text-neutral-300">{notes}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-neutral-400 text-center">
                  Upon confirmation, this amount will be reserved and forwarded to platform administration for bank/UPI transfer.
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWithdrawStep('form')}
                    disabled={submittingWithdrawal}
                    className="rounded-xl text-xs cursor-pointer"
                  >
                    Back to Edit
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSubmitWithdrawal}
                    disabled={submittingWithdrawal}
                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submittingWithdrawal ? 'Submitting...' : 'Confirm & Request Payout'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR PREVIEW MODAL */}
      {previewQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white">QR Code Scanner</h4>
              <button
                type="button"
                onClick={() => setPreviewQrUrl(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewQrUrl}
              alt="QR Code"
              className="max-h-72 w-auto mx-auto rounded-xl object-contain border border-neutral-200 dark:border-neutral-700 shadow-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewQrUrl(null)}
              className="w-full text-xs rounded-xl cursor-pointer"
            >
              Close Preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

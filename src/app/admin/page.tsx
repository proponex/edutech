'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Building,
  CreditCard,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit,
} from 'lucide-react';
import {
  AdminIncomeOverview,
  AdminTransactionItem,
  AdminTeacherPendingPayout,
  TeacherWithdrawalRequest,
} from '@/types';
import { ArrowDownCircle, QrCode } from 'lucide-react';

export default function AdminIncomeDashboard() {
  const [data, setData] = useState<AdminIncomeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'pending' | 'withdrawals'>('transactions');
  const [withdrawals, setWithdrawals] = useState<TeacherWithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<TeacherWithdrawalRequest | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [withdrawalActionModal, setWithdrawalActionModal] = useState<{
    type: 'processing' | 'completed' | 'rejected';
    request: TeacherWithdrawalRequest;
  } | null>(null);
  const [withdrawalUtr, setWithdrawalUtr] = useState('');
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState('');
  const [withdrawalAdminNotes, setWithdrawalAdminNotes] = useState('');
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalActionError, setWithdrawalActionError] = useState<string | null>(null);
  const [withdrawalFilterStatus, setWithdrawalFilterStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'rejected'>('all');

  // Transactions Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 10;

  // Selected Transaction for Modal
  const [selectedTx, setSelectedTx] = useState<AdminTransactionItem | null>(null);

  // Copy to clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Masked account numbers toggle by teacherId
  const [unmaskedTeachers, setUnmaskedTeachers] = useState<Record<string, boolean>>({});

  // Payout Confirmation Modal State
  const [payoutModalTeacher, setPayoutModalTeacher] = useState<AdminTeacherPendingPayout | null>(null);
  const [payoutUtr, setPayoutUtr] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // Edit Bank Details Modal State
  const [editBankTeacher, setEditBankTeacher] = useState<AdminTeacherPendingPayout | null>(null);
  const [bankHolderName, setBankHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNum, setBankAccountNum] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankUpiId, setBankUpiId] = useState('');
  const [bankSubmitting, setBankSubmitting] = useState(false);

  // Load Income Data
  const loadIncomeData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [incomeRes, withRes] = await Promise.all([
        fetch('/api/admin/income'),
        fetch('/api/admin/withdrawals').catch(() => null),
      ]);
      const json = await incomeRes.json();
      if (incomeRes.ok && json.success) {
        setData(json.data);
      }
      if (withRes && withRes.ok) {
        const withJson = await withRes.json();
        if (withJson.success && Array.isArray(withJson.requests)) {
          setWithdrawals(withJson.requests);
        }
      }
    } catch (err) {
      console.error('Failed to load income data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIncomeData();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleAccountMask = (teacherId: string) => {
    setUnmaskedTeachers((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId],
    }));
  };

  const handleWithdrawalAction = async (requestId: string, action: 'processing' | 'completed' | 'rejected') => {
    setWithdrawalSubmitting(true);
    setWithdrawalActionError(null);
    try {
      const payload: any = {
        requestId,
        action,
        adminNotes: withdrawalAdminNotes.trim() || undefined,
      };
      if (action === 'completed') {
        if (!withdrawalUtr.trim()) {
          setWithdrawalActionError('UTR / Payment Reference number is required to mark as completed.');
          setWithdrawalSubmitting(false);
          return;
        }
        payload.utrReference = withdrawalUtr.trim();
      } else if (action === 'rejected') {
        if (!withdrawalRejectReason.trim()) {
          setWithdrawalActionError('Rejection reason is required.');
          setWithdrawalSubmitting(false);
          return;
        }
        payload.rejectionReason = withdrawalRejectReason.trim();
      }

      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to update withdrawal request.');
      }

      setWithdrawalActionModal(null);
      setWithdrawalUtr('');
      setWithdrawalRejectReason('');
      setWithdrawalAdminNotes('');
      await loadIncomeData(true);
    } catch (err: any) {
      setWithdrawalActionError(err?.message || 'Failed to process withdrawal action.');
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  // Filtered & Paginated Transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (!searchQuery.trim()) return data.transactions;

    const q = searchQuery.toLowerCase().trim();
    return data.transactions.filter(
      (tx) =>
        tx.studentName.toLowerCase().includes(q) ||
        (tx.studentEmail && tx.studentEmail.toLowerCase().includes(q)) ||
        tx.teacherName.toLowerCase().includes(q) ||
        tx.channelName.toLowerCase().includes(q) ||
        tx.transactionId.toLowerCase().includes(q) ||
        (tx.razorpayPaymentId && tx.razorpayPaymentId.toLowerCase().includes(q)) ||
        (tx.razorpayOrderId && tx.razorpayOrderId.toLowerCase().includes(q))
    );
  }, [data?.transactions, searchQuery]);

  const totalTxPages = Math.ceil(filteredTransactions.length / txPerPage) || 1;
  const currentTransactions = useMemo(() => {
    const start = (txPage - 1) * txPerPage;
    return filteredTransactions.slice(start, start + txPerPage);
  }, [filteredTransactions, txPage]);

  // Open Payout Modal
  const openPayoutModal = (teacher: AdminTeacherPendingPayout) => {
    setPayoutModalTeacher(teacher);
    setPayoutUtr('');
    setPayoutMethod('bank_transfer');
    setPayoutNotes('');
    setPayoutError(null);
  };

  // Submit Payout
  const handleConfirmPayout = async () => {
    if (!payoutModalTeacher) return;
    if (!payoutUtr.trim()) {
      setPayoutError('Please enter the external bank UTR or payment reference number.');
      return;
    }

    setPayoutSubmitting(true);
    setPayoutError(null);

    try {
      const res = await fetch('/api/admin/income/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: payoutModalTeacher.teacherId,
          amountPaise: payoutModalTeacher.remainingPendingAmountPaise,
          utrReference: payoutUtr.trim(),
          paymentMethod: payoutMethod,
          notes: payoutNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete payout.');
      }

      setPayoutSuccessMsg(json.result?.message || 'Payout successfully confirmed!');
      setPayoutModalTeacher(null);
      // Reload financial cards and lists
      await loadIncomeData(true);
      setTimeout(() => setPayoutSuccessMsg(null), 5000);
    } catch (err: any) {
      setPayoutError(err.message || 'An error occurred while confirming payout.');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  // Open Edit Bank Details Modal
  const openEditBankModal = (teacher: AdminTeacherPendingPayout) => {
    setEditBankTeacher(teacher);
    setBankHolderName(teacher.bankDetails.accountHolderName || teacher.teacherName);
    setBankName(teacher.bankDetails.bankName || '');
    setBankAccountNum(teacher.bankDetails.accountNumber || '');
    setBankIfsc(teacher.bankDetails.ifscCode || '');
    setBankUpiId(teacher.bankDetails.upiId || '');
  };

  // Save Bank Details
  const handleSaveBankDetails = async () => {
    if (!editBankTeacher) return;
    setBankSubmitting(true);

    try {
      const res = await fetch('/api/admin/income/payout-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: editBankTeacher.teacherId,
          account_holder_name: bankHolderName.trim() || null,
          bank_name: bankName.trim() || null,
          account_number: bankAccountNum.trim() || null,
          ifsc_code: bankIfsc.trim() || null,
          upi_id: bankUpiId.trim() || null,
        }),
      });

      if (res.ok) {
        setEditBankTeacher(null);
        await loadIncomeData(true);
      }
    } catch (err) {
      console.error('Failed to save bank details:', err);
    } finally {
      setBankSubmitting(false);
    }
  };

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const maskAccountNumber = (acc?: string | null, isUnmasked = false) => {
    if (!acc) return 'Not Provided';
    if (isUnmasked) return acc;
    if (acc.length <= 4) return '••••' + acc;
    return '••••••••' + acc.slice(-4);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
              Tab 1 &bull; Financial Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            Income & Financial Ledger
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Authoritative overview of total platform revenue, 20% platform earnings, and educator payout disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadIncomeData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs shadow-sm hover:border-primary-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Financials'}</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {payoutSuccessMsg && (
        <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-primary-900 dark:text-primary-200 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
            <span className="text-sm font-semibold">{payoutSuccessMsg}</span>
          </div>
          <button
            onClick={() => setPayoutSuccessMsg(null)}
            className="text-primary-600 hover:text-primary-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 MAIN FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Income */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl overflow-hidden hover:border-neutral-300 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Card 1 &bull; Total Income
              </span>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                {loading ? '...' : formatRupees(data?.totalIncomePaise || 0)}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                Total successful student payments received
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Platform Income (20%) */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl overflow-hidden hover:border-primary-300 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Card 2 &bull; Total Platform Income
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-primary-700 dark:text-primary-400 tracking-tight">
                {loading ? '...' : formatRupees(data?.totalPlatformIncomePaise || 0)}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-800 dark:text-primary-300">
                  20% Surcharge
                </span>
                <span className="text-[11px] text-neutral-500">Platform earnings retained</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pending Money */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl overflow-hidden hover:border-amber-300 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Card 3 &bull; Pending Money
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
                {loading ? '...' : formatRupees(data?.pendingMoneyPaise || 0)}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                Outstanding payout owed to teachers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Paid Teacher Cost */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl overflow-hidden hover:border-neutral-300 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Card 4 &bull; Paid Teacher Cost
              </span>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                {loading ? '...' : formatRupees(data?.paidTeacherCostPaise || 0)}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                Successfully disbursed to educators
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TWO OVAL-STYLE NAVIGATION BUTTONS (Application Green Theme) */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="inline-flex p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Total Transactions</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'transactions'
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {data?.transactions.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Payments</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'pending'
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {data?.pendingPayments.filter((p) => p.remainingPendingAmountPaise > 0).length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Withdrawal Requests</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'withdrawals'
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {withdrawals.filter((w) => w.status === 'pending' || w.status === 'processing').length}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 1: TOTAL TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Search bar and counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search by student, teacher, txn ID, payment ID, channel..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setTxPage(1);
                }}
                className="pl-10 h-10 rounded-xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Showing {filteredTransactions.length} of {data?.transactions.length || 0} transactions
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Transaction / Razorpay ID</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Teacher & Channel</th>
                    <th className="py-3.5 px-4 text-right">Student Paid</th>
                    <th className="py-3.5 px-4 text-right">Platform Fee</th>
                    <th className="py-3.5 px-4 text-right">Teacher Earning</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Payment Status</th>
                    <th className="py-3.5 px-4">Teacher Payout</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                  {currentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-neutral-400">
                        {loading ? 'Loading transactions...' : 'No transactions found matching your criteria.'}
                      </td>
                    </tr>
                  ) : (
                    currentTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        {/* Transaction & Razorpay IDs */}
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[120px]">
                              {tx.razorpayPaymentId || tx.transactionId.slice(0, 12)}
                            </span>
                            <button
                              onClick={() => handleCopy(tx.razorpayPaymentId || tx.transactionId, tx.id)}
                              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer"
                              title="Copy ID"
                            >
                              {copiedId === tx.id ? (
                                <Check className="w-3.5 h-3.5 text-primary-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-neutral-400 block truncate max-w-[140px]">
                            Ord: {tx.razorpayOrderId || tx.orderId?.slice(0, 10)}
                          </span>
                        </td>

                        {/* Student */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-neutral-900 dark:text-white">{tx.studentName}</p>
                          <p className="text-[10px] text-neutral-400 truncate max-w-[140px]">{tx.studentEmail}</p>
                        </td>

                        {/* Teacher & Channel */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-neutral-900 dark:text-white">{tx.teacherName}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 truncate inline-block max-w-[140px]">
                            {tx.channelName}
                          </span>
                        </td>

                        {/* Total Amount Paid by Student */}
                        <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-white">
                          {formatRupees(tx.totalAmountPaise)}
                        </td>

                        {/* Platform Fee */}
                        <td className="py-3 px-4 text-right font-semibold text-primary-700 dark:text-primary-400">
                          {formatRupees(tx.platformFeePaise)}
                        </td>

                        {/* Teacher Earning */}
                        <td className="py-3 px-4 text-right font-semibold text-neutral-900 dark:text-white">
                          {formatRupees(tx.teacherEarningPaise)}
                        </td>

                        {/* Payment Date */}
                        <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                          {new Date(tx.paymentDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Payment Status */}
                        <td className="py-3 px-4">
                          {tx.paymentStatus === 'captured' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 dark:bg-primary-950/80 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                              <CheckCircle2 className="w-3 h-3 text-primary-600" />
                              Captured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <AlertCircle className="w-3 h-3" />
                              {tx.paymentStatus}
                            </span>
                          )}
                        </td>

                        {/* Teacher Payout Status */}
                        <td className="py-3 px-4">
                          {tx.teacherPayoutStatus === 'paid_out' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700">
                              <CheckCircle2 className="w-3 h-3 text-neutral-700 dark:text-neutral-300" />
                              Paid Out
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalTxPages > 1 && (
              <div className="py-3 px-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Page {txPage} of {totalTxPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    disabled={txPage <= 1}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
                    disabled={txPage >= totalTxPages}
                    className="h-8 px-2.5 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: PENDING PAYMENTS (Grouped by Teacher) */}
      {activeTab === 'pending' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Teacher Payout Disbursements
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Grouped educator balances awaiting external bank or UPI settlement.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Total Pending: {formatRupees(data?.pendingMoneyPaise || 0)}
            </span>
          </div>

          {data?.pendingPayments.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl bg-white dark:bg-neutral-900 text-neutral-400">
              No educators found in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {data?.pendingPayments.map((teacher) => {
                const hasPending = teacher.remainingPendingAmountPaise > 0;
                const isUnmasked = unmaskedTeachers[teacher.teacherId];

                return (
                  <Card
                    key={teacher.teacherId}
                    className={`border transition-all rounded-2xl overflow-hidden shadow-xs ${
                      hasPending
                        ? 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 opacity-90'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Teacher Profile & Contact */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center font-bold text-base text-primary-800 dark:text-primary-300 shrink-0 shadow-xs">
                            {teacher.teacherName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                                {teacher.teacherName}
                              </h3>
                              {hasPending ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Payout Due
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                                  All Settled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {teacher.teacherEmail} {teacher.teacherPhone ? `&bull; ${teacher.teacherPhone}` : ''}
                            </p>
                            <p className="text-xs font-medium text-primary-700 dark:text-primary-400 mt-1">
                              Channel: {teacher.channelName}
                            </p>
                          </div>
                        </div>

                        {/* Earnings Breakdown Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                              Total Sales
                            </span>
                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                              {teacher.totalSuccessfulPaymentsCount} student(s)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                              Total Earned
                            </span>
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">
                              {formatRupees(teacher.totalTeacherEarningsPaise)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                              Already Paid
                            </span>
                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                              {formatRupees(teacher.alreadyPaidAmountPaise)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
                              Remaining Pending
                            </span>
                            <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                              {formatRupees(teacher.remainingPendingAmountPaise)}
                            </span>
                          </div>
                        </div>

                        {/* Action: Mark as Paid */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2 shrink-0">
                          <Button
                            onClick={() => openPayoutModal(teacher)}
                            disabled={!hasPending}
                            className={`h-11 px-5 rounded-xl font-bold shadow-sm transition-all text-xs flex items-center justify-center gap-2 cursor-pointer ${
                              hasPending
                                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed border border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark as Paid / Complete Payment</span>
                          </Button>

                          <button
                            type="button"
                            onClick={() => openEditBankModal(teacher)}
                            className="text-[11px] font-semibold text-neutral-500 hover:text-primary-700 dark:hover:text-primary-400 flex items-center justify-center gap-1 py-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Update Bank / UPI Details</span>
                          </button>
                        </div>
                      </div>

                      {/* Bank & UPI Details Box */}
                      <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5" />
                            Banking & UPI Settlement Destination
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleAccountMask(teacher.teacherId)}
                            className="text-[11px] font-semibold text-primary-700 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {isUnmasked ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Mask Account Number</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Unmask Account Number</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-neutral-50/70 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-medium">Account Holder</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                              {teacher.bankDetails.accountHolderName || teacher.teacherName}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-medium">Bank Name</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                              {teacher.bankDetails.bankName || 'Not Provided'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-medium">Account Number</span>
                            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                              {maskAccountNumber(teacher.bankDetails.accountNumber, isUnmasked)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-medium">IFSC Code</span>
                            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                              {teacher.bankDetails.ifscCode || 'Not Provided'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-medium">UPI ID</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                              {teacher.bankDetails.upiId || 'Not Provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: TEACHER WITHDRAWAL REQUESTS */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Teacher Withdrawal Requests
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Review, process, and complete educator withdrawal requests with verified UTR numbers.
              </p>
            </div>

            {/* Filter Status Pills */}
            <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 self-start sm:self-center">
              {(['all', 'pending', 'processing', 'completed', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setWithdrawalFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    withdrawalFilterStatus === st
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* List of Withdrawal Requests */}
          {(() => {
            const filteredWithdrawals = withdrawals.filter((w) => {
              if (withdrawalFilterStatus === 'all') return true;
              return w.status === withdrawalFilterStatus;
            });

            if (filteredWithdrawals.length === 0) {
              return (
                <Card className="border-dashed border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400 mb-3">
                    <ArrowDownCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    No withdrawal requests in this view
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    When educators submit withdrawal requests from their Monetization tab, they will appear here.
                  </p>
                </Card>
              );
            }

            return (
              <div className="space-y-4">
                {filteredWithdrawals.map((item) => {
                  const reqRupees = item.amount_rupees || item.amount_paise / 100;
                  const availRupees = item.teacher_available_balance_rupees ?? 0;

                  return (
                    <Card
                      key={item.id}
                      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs overflow-hidden"
                    >
                      <CardContent className="p-5 sm:p-6 space-y-4">
                        {/* Top Row: Teacher Details & Status Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                          <div className="flex items-center gap-3">
                            {item.teacher?.photo_url ? (
                              <img
                                src={item.teacher.photo_url}
                                alt={item.teacher.name}
                                className="w-11 h-11 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center shrink-0 border border-primary-200 dark:border-primary-800">
                                {item.teacher?.name?.charAt(0).toUpperCase() || 'T'}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                                  {item.teacher?.name || 'Educator'}
                                </h3>
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                  ID: {item.teacher_id.slice(0, 8)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-1">
                                {item.teacher?.email && <span>{item.teacher.email}</span>}
                                {item.teacher?.phone && <span>• {item.teacher.phone}</span>}
                                {item.channel?.name && (
                                  <span className="font-medium text-primary-700 dark:text-primary-400">
                                    • Channel: {item.channel.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 self-start sm:self-center">
                            {item.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Completed
                              </span>
                            ) : item.status === 'processing' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                Processing
                              </span>
                            ) : item.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Pending Review
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Row: Financials and Payment Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Requested Amount
                            </span>
                            <span className="text-lg font-black text-primary-700 dark:text-primary-400 mt-0.5 block">
                              ₹{reqRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              Available: ₹{availRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                              Payout Destination ({item.payment_method === 'gpay_number' ? 'GPay Number' : 'UPI ID'})
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                                {item.payment_address}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.payment_address || item.upi_id || item.gpay_number || "", item.id)}
                                className="p-1 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                title="Copy payout destination"
                              >
                                {copiedId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {item.payment_notes && (
                              <p className="text-[11px] text-neutral-500 italic mt-0.5">
                                Notes: {item.payment_notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                                QR Code Image
                              </span>
                              {item.qr_code_url ? (
                                <button
                                  type="button"
                                  onClick={() => setQrModalUrl(item.qr_code_url || null)}
                                  className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 transition-colors cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  View QR Scanner
                                </button>
                              ) : (
                                <span className="text-neutral-400 italic text-[11px] mt-1 block">
                                  No QR attached
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-neutral-400 block pt-1">
                              Requested: {new Date(item.requested_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Completed info banner */}
                        {item.status === 'completed' && item.utr_reference && (
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2">
                            <span className="text-emerald-900 dark:text-emerald-200">
                              <strong>Payment Reference / UTR:</strong> <code className="font-mono font-bold bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-emerald-200">{item.utr_reference}</code>
                            </span>
                            {item.completed_at && (
                              <span className="text-emerald-700 dark:text-emerald-300 text-[11px]">
                                Completed on {new Date(item.completed_at).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Rejection info banner */}
                        {item.status === 'rejected' && item.rejection_reason && (
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                            <strong>Rejection Reason:</strong> {item.rejection_reason}
                          </div>
                        )}

                        {/* Bottom Row: Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="font-mono text-[10px] text-neutral-400">
                            Req ID: {item.id}
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedWithdrawal(item)}
                              className="text-xs h-8"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              View Details
                            </Button>

                            {item.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleWithdrawalAction(item.id, 'processing')}
                                className="text-xs h-8 text-blue-600 dark:text-blue-400 border-blue-200 hover:bg-blue-50"
                              >
                                Mark as Processing
                              </Button>
                            )}

                            {(item.status === 'pending' || item.status === 'processing') && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setWithdrawalActionModal({ type: 'rejected', request: item });
                                    setWithdrawalRejectReason('');
                                    setWithdrawalActionError(null);
                                  }}
                                  className="text-xs h-8 text-rose-600 dark:text-rose-400 border-rose-200 hover:bg-rose-50"
                                >
                                  Reject
                                </Button>

                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setWithdrawalActionModal({ type: 'completed', request: item });
                                    setWithdrawalUtr('');
                                    setWithdrawalAdminNotes('');
                                    setWithdrawalActionError(null);
                                  }}
                                  className="text-xs h-8 bg-primary-600 hover:bg-primary-700 text-white font-bold"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Mark as Completed
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* CONFIRMATION MODAL: MARK AS PAID / COMPLETE PAYMENT */}
      {payoutModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400 block">
                  Disbursement Confirmation
                </span>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
                  Confirm Payout to {payoutModalTeacher.teacherName}
                </h3>
              </div>
              <button
                onClick={() => setPayoutModalTeacher(null)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payout Amount Highlight */}
            <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-center">
              <span className="text-xs font-semibold text-primary-800 dark:text-primary-300 block">
                Total Payout Amount
              </span>
              <span className="text-3xl font-black text-primary-700 dark:text-primary-400 mt-1 block tracking-tight">
                {formatRupees(payoutModalTeacher.remainingPendingAmountPaise)}
              </span>
              <span className="text-[11px] text-primary-800/80 dark:text-primary-400/80 mt-1 block font-medium">
                This will clear {payoutModalTeacher.teacherName}&apos;s pending balance to ₹0.00
              </span>
            </div>

            {/* Destination Banking Details Summary */}
            <div className="space-y-1 text-xs bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                Settlement Destination
              </span>
              <p className="text-neutral-700 dark:text-neutral-300">
                <strong>Recipient:</strong> {payoutModalTeacher.bankDetails.accountHolderName || payoutModalTeacher.teacherName}
              </p>
              {payoutModalTeacher.bankDetails.bankName && (
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>Bank:</strong> {payoutModalTeacher.bankDetails.bankName}
                </p>
              )}
              {payoutModalTeacher.bankDetails.accountNumber && (
                <p className="text-neutral-700 dark:text-neutral-300 font-mono">
                  <strong>A/C:</strong> {payoutModalTeacher.bankDetails.accountNumber} ({payoutModalTeacher.bankDetails.ifscCode})
                </p>
              )}
              {payoutModalTeacher.bankDetails.upiId && (
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>UPI:</strong> {payoutModalTeacher.bankDetails.upiId}
                </p>
              )}
            </div>

            {/* Form Fields: UTR, Method, Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Bank UTR / Payment Reference Number <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. UTR123456789012 or IMPS ref"
                  value={payoutUtr}
                  onChange={(e) => setPayoutUtr(e.target.value)}
                  className="h-10 text-xs font-mono font-bold"
                  autoFocus
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Enter the transaction reference from your bank portal or UPI app.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Transfer Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs px-3 text-neutral-900 dark:text-white"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="imps">IMPS Instant</option>
                    <option value="upi">UPI Transfer</option>
                    <option value="cheque">Cheque / Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Internal Notes (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Monthly settlement"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              {payoutError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payoutError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayoutModalTeacher(null)}
                disabled={payoutSubmitting}
                className="rounded-xl text-xs h-10 px-4"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleConfirmPayout}
                disabled={payoutSubmitting || !payoutUtr.trim()}
                className="rounded-xl text-xs font-bold h-10 px-5 bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/20"
              >
                {payoutSubmitting ? 'Recording Payout...' : 'Confirm External Transfer & Mark Paid'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BANK / UPI DETAILS MODAL */}
      {editBankTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Educator Banking Profile
                </span>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                  Update Payout Details
                </h3>
                <p className="text-xs text-neutral-500">{editBankTeacher.teacherName}</p>
              </div>
              <button
                onClick={() => setEditBankTeacher(null)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Account Holder Name</label>
                <Input
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  placeholder="Full name as per bank account"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Bank Name</label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, State Bank of India"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Account Number</label>
                <Input
                  value={bankAccountNum}
                  onChange={(e) => setBankAccountNum(e.target.value)}
                  placeholder="Account number"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">IFSC Code</label>
                <Input
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">UPI ID (Optional)</label>
                <Input
                  value={bankUpiId}
                  onChange={(e) => setBankUpiId(e.target.value)}
                  placeholder="e.g. teacher@okaxis"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditBankTeacher(null)}
                disabled={bankSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveBankDetails}
                disabled={bankSubmitting}
                className="text-xs font-bold h-9 bg-primary-600 hover:bg-primary-700 text-white"
              >
                {bankSubmitting ? 'Saving...' : 'Save Bank Details'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAWAL ACTION MODAL (COMPLETE WITH UTR OR REJECT) */}
      {withdrawalActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400 block">
                  Withdrawal Request Settlement
                </span>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
                  {withdrawalActionModal.type === 'completed'
                    ? 'Confirm Payout Completion'
                    : 'Reject Withdrawal Request'}
                </h3>
              </div>
              <button
                onClick={() => setWithdrawalActionModal(null)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Teacher and Amount Summary */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Teacher:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {withdrawalActionModal.request.teacher?.name} ({withdrawalActionModal.request.teacher_id.slice(0, 8)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Requested Amount:</span>
                <span className="font-extrabold text-primary-700 dark:text-primary-400 text-sm">
                  ₹{(withdrawalActionModal.request.amount_rupees || withdrawalActionModal.request.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Destination:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  {withdrawalActionModal.request.payment_address} ({withdrawalActionModal.request.payment_method === 'gpay_number' ? 'GPay' : 'UPI'})
                </span>
              </div>
            </div>

            {withdrawalActionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {withdrawalActionError}
              </div>
            )}

            {withdrawalActionModal.type === 'completed' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. UTR9876543210 or UPI transaction ref"
                    value={withdrawalUtr}
                    onChange={(e) => setWithdrawalUtr(e.target.value)}
                    className="h-10 text-xs font-mono font-bold"
                    autoFocus
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    This reference confirms the payment transfer to {withdrawalActionModal.request.payment_address}.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Internal Notes (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Paid via ICICI Corporate Banking"
                    value={withdrawalAdminNotes}
                    onChange={(e) => setWithdrawalAdminNotes(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Reason for Rejection <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain clearly to the educator why this request is rejected (e.g. incorrect UPI ID, pending bank verification)..."
                    value={withdrawalRejectReason}
                    onChange={(e) => setWithdrawalRejectReason(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                    autoFocus
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Rejecting releases the reserved amount back to the educator&apos;s available withdrawable balance.
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawalActionModal(null)}
                disabled={withdrawalSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={() => handleWithdrawalAction(withdrawalActionModal.request.id, withdrawalActionModal.type)}
                disabled={withdrawalSubmitting}
                className={`text-xs font-bold h-9 text-white ${
                  withdrawalActionModal.type === 'completed'
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {withdrawalSubmitting
                  ? 'Processing...'
                  : withdrawalActionModal.type === 'completed'
                  ? 'Mark as Completed'
                  : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE FULL VIEW MODAL */}
      {qrModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Teacher QR Code
              </h3>
              <button
                type="button"
                onClick={() => setQrModalUrl(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-64 h-64 mx-auto rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white p-2">
              <img
                src={qrModalUrl}
                alt="Teacher QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setQrModalUrl(null)}
              className="w-full text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* WITHDRAWAL DETAILS MODAL */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Withdrawal Record
                </span>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                  Request #{selectedWithdrawal.id.slice(0, 14)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Teacher:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{selectedWithdrawal.teacher?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Teacher ID:</span>
                  <span className="font-mono text-neutral-900 dark:text-white">{selectedWithdrawal.teacher_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Channel:</span>
                  <span className="text-neutral-900 dark:text-white">{selectedWithdrawal.channel?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Email &amp; Phone:</span>
                  <span className="text-neutral-900 dark:text-white">{selectedWithdrawal.teacher?.email} • {selectedWithdrawal.teacher?.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Requested</span>
                  <span className="text-base font-black text-primary-700 dark:text-primary-400">
                    ₹{(selectedWithdrawal.amount_rupees || selectedWithdrawal.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Status</span>
                  <span className="text-sm font-bold capitalize text-neutral-900 dark:text-white">
                    {selectedWithdrawal.status}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payout Method:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white capitalize">{selectedWithdrawal.payment_method.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Destination:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedWithdrawal.payment_address}</span>
                </div>
                {selectedWithdrawal.utr_reference && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">UTR Reference:</span>
                    <span className="font-mono font-bold text-emerald-600">{selectedWithdrawal.utr_reference}</span>
                  </div>
                )}
                {selectedWithdrawal.rejection_reason && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Rejection Reason:</span>
                    <span className="text-rose-600 font-medium">{selectedWithdrawal.rejection_reason}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-400">Submitted:</span>
                  <span className="text-neutral-600 dark:text-neutral-300">{new Date(selectedWithdrawal.requested_at).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWithdrawal(null)}
                className="text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Authoritative Transaction Record
                </span>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                  Transaction #{selectedTx.transactionId.slice(0, 14)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Razorpay Payment ID:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {selectedTx.razorpayPaymentId || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Razorpay Order ID:</span>
                  <span className="font-mono text-neutral-900 dark:text-white">
                    {selectedTx.razorpayOrderId || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Student Name & ID:</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {selectedTx.studentName} ({selectedTx.studentId?.slice(0, 8)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Educator & Channel:</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {selectedTx.teacherName} &bull; {selectedTx.channelName}
                  </span>
                </div>
              </div>

              {/* Financial split */}
              <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 text-center">
                <div>
                  <span className="text-[10px] text-neutral-400 block font-bold uppercase">Total Paid</span>
                  <span className="text-sm font-black text-neutral-900 dark:text-white">
                    {formatRupees(selectedTx.totalAmountPaise)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-primary-700 dark:text-primary-400 block font-bold uppercase">Platform Fee</span>
                  <span className="text-sm font-black text-primary-700 dark:text-primary-400">
                    {formatRupees(selectedTx.platformFeePaise)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-700 dark:text-neutral-300 block font-bold uppercase">Teacher Earning</span>
                  <span className="text-sm font-black text-neutral-900 dark:text-white">
                    {formatRupees(selectedTx.teacherEarningPaise)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-neutral-400">Payment Status:</span>
                <span className="font-bold text-primary-700 dark:text-primary-400 uppercase">{selectedTx.paymentStatus}</span>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-neutral-400">Educator Payout:</span>
                <span className="font-bold text-neutral-900 dark:text-white capitalize">
                  {selectedTx.teacherPayoutStatus.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-neutral-400">Captured At:</span>
                <span className="text-neutral-600 dark:text-neutral-300">
                  {new Date(selectedTx.paymentDate).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTx(null)}
                className="text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

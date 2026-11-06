const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '../src/app/admin/page.tsx');
let code = fs.readFileSync(adminPath, 'utf8');

const isCRLF = code.includes('\r\n');
let norm = code.replace(/\r\n/g, '\n');

// 1. Update imports
const importTarget = `import {
  AdminIncomeOverview,
  AdminTransactionItem,
  AdminTeacherPendingPayout,
} from '@/types';`;

const importReplacement = `import {
  AdminIncomeOverview,
  AdminTransactionItem,
  AdminTeacherPendingPayout,
  TeacherWithdrawalRequest,
} from '@/types';
import { ArrowDownCircle, QrCode } from 'lucide-react';`;

if (norm.includes(importTarget)) {
  norm = norm.replace(importTarget, importReplacement);
  console.log('1. Updated types and icons imports');
} else {
  console.log('1. Import target not found');
}

// 2. Update activeTab state and add withdrawal states
const stateTarget = `  const [activeTab, setActiveTab] = useState<'transactions' | 'pending'>('transactions');`;

const stateReplacement = `  const [activeTab, setActiveTab] = useState<'transactions' | 'pending' | 'withdrawals'>('transactions');
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
  const [withdrawalFilterStatus, setWithdrawalFilterStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'rejected'>('all');`;

if (norm.includes(stateTarget)) {
  norm = norm.replace(stateTarget, stateReplacement);
  console.log('2. Updated state definitions');
} else {
  console.log('2. State target not found');
}

// 3. Update loadIncomeData to also fetch withdrawals
const loadDataTarget = `    try {
      const res = await fetch('/api/admin/income');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load income data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }`;

const loadDataReplacement = `    try {
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
    }`;

if (norm.includes(loadDataTarget)) {
  norm = norm.replace(loadDataTarget, loadDataReplacement);
  console.log('3. Updated loadIncomeData to fetch withdrawals in parallel');
} else {
  console.log('3. LoadData target not found');
}

// 4. Add handleWithdrawalAction function
const actionHelperTarget = `  const toggleAccountMask = (teacherId: string) => {
    setUnmaskedTeachers((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId],
    }));
  };`;

const actionHelperReplacement = `  const toggleAccountMask = (teacherId: string) => {
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
  };`;

if (norm.includes(actionHelperTarget)) {
  norm = norm.replace(actionHelperTarget, actionHelperReplacement);
  console.log('4. Added handleWithdrawalAction helper');
} else {
  console.log('4. Action helper target not found');
}

// 5. Update the navigation buttons container to add third oval button: Withdrawal Requests
const navButtonsTarget = `          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={\`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer \${
              activeTab === 'pending'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Payments</span>
            <span
              className={\`text-[10px] px-2 py-0.5 rounded-full font-bold \${
                activeTab === 'pending'
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }\`}
            >
              {data?.pendingPayments.filter((p) => p.remainingPendingAmountPaise > 0).length || 0}
            </span>
          </button>
        </div>`;

const navButtonsReplacement = `          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={\`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer \${
              activeTab === 'pending'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Payments</span>
            <span
              className={\`text-[10px] px-2 py-0.5 rounded-full font-bold \${
                activeTab === 'pending'
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }\`}
            >
              {data?.pendingPayments.filter((p) => p.remainingPendingAmountPaise > 0).length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            className={\`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer \${
              activeTab === 'withdrawals'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }\`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Withdrawal Requests</span>
            <span
              className={\`text-[10px] px-2 py-0.5 rounded-full font-bold \${
                activeTab === 'withdrawals'
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }\`}
            >
              {withdrawals.filter((w) => w.status === 'pending' || w.status === 'processing').length}
            </span>
          </button>
        </div>`;

if (norm.includes(navButtonsTarget)) {
  norm = norm.replace(navButtonsTarget, navButtonsReplacement);
  console.log('5. Added 3rd oval button: Withdrawal Requests');
} else {
  console.log('5. Nav buttons target not found');
}

// 6. Add Section 3: Withdrawal Requests UI after Section 2
const section2EndTarget = `      {activeTab === 'pending' && (
        <div className="space-y-6 animate-in fade-in duration-200">`;

// Let's find where activeTab === 'pending' closes
const pendingCloseTarget = `      {/* CONFIRMATION MODAL: MARK AS PAID / COMPLETE PAYMENT */}`;

const withdrawalSectionCode = `      {/* SECTION 3: TEACHER WITHDRAWAL REQUESTS */}
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
                  className={\`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer \${
                    withdrawalFilterStatus === st
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }\`}
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
                                onClick={() => handleCopy(item.payment_address, item.id)}
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

`;

if (norm.includes(pendingCloseTarget)) {
  norm = norm.replace(pendingCloseTarget, withdrawalSectionCode + pendingCloseTarget);
  console.log('6. Added Section 3: Withdrawal Requests UI');
} else {
  console.log('6. Pending close target not found');
}

// 7. Add Withdrawal Modals at the end (before last </div>)
const lastDivTarget = `      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (`;

const withdrawalModalsCode = `      {/* WITHDRAWAL ACTION MODAL (COMPLETE WITH UTR OR REJECT) */}
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
                className={\`text-xs font-bold h-9 text-white \${
                  withdrawalActionModal.type === 'completed'
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }\`}
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

`;

if (norm.includes(lastDivTarget)) {
  norm = norm.replace(lastDivTarget, withdrawalModalsCode + lastDivTarget);
  console.log('7. Added Withdrawal Modals (Action, QR Preview, Details)');
} else {
  console.log('7. LastDiv target not found');
}

const finalCode = isCRLF ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(adminPath, finalCode, 'utf8');
console.log('Finished updating admin page.');


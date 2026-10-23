'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
  Tag,
  CreditCard,
  PlusCircle,
  RefreshCw,
  BookOpen,
  FileQuestion,
  CheckCircle2,
  Calendar,
  Layers,
  Lock,
} from 'lucide-react';
import { PricingPlanItem } from '@/types';

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<PricingPlanItem[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formItemType, setFormItemType] = useState<'course' | 'exam'>('course');
  const [formItemId, setFormItemId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAmountRupees, setFormAmountRupees] = useState('499');
  const [formIsFree, setFormIsFree] = useState(false);
  const [formReason, setFormReason] = useState('Admin updated pricing configuration');
  const [formSaving, setFormSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pricingRes, coursesRes, examsRes] = await Promise.all([
        fetch('/api/admin/pricing'),
        fetch('/api/admin/courses?limit=50'),
        fetch('/api/admin/exams?limit=50'),
      ]);

      if (pricingRes.ok) {
        const data = await pricingRes.json();
        setPlans(data.plans || []);
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData.courses || []);
      }
      if (examsRes.ok) {
        const eData = await examsRes.json();
        setExams(eData.exams || []);
      }
    } catch (err) {
      console.error('Failed to load pricing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemId) {
      alert('Please select an item (course or exam)');
      return;
    }

    try {
      setFormSaving(true);
      // Integer minor units (e.g., ₹499 -> 49900 paise)
      const amountPaise = formIsFree ? 0 : Math.round(parseFloat(formAmountRupees || '0') * 100);

      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: formItemType,
          item_id: formItemId,
          title: formTitle || 'Course / Assessment Pricing',
          amount_paise: amountPaise,
          currency: 'INR',
          is_free: formIsFree,
          is_active: true,
          reason: formReason,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save pricing plan');
      }
    } catch (err) {
      console.error('Save price error:', err);
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
              Pricing Foundation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Pricing Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Establish course tuition and examination fees with backend integer minor-unit validation, ready for Razorpay.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setIsModalOpen(true);
              if (courses.length > 0) {
                setFormItemId(courses[0].id);
                setFormTitle(courses[0].name);
              }
            }}
            className="flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Configure Item Price</span>
          </Button>
        </div>
      </div>

      {/* Architecture Disclaimer Alert */}
      <Card className="border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-bold text-neutral-900 dark:text-white">
              Pricing Architecture Built for Razorpay Compliance
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Amounts are stored in integer minor units (paise) to eliminate floating-point rounding errors. Modifying price plans logs historical price points and does not silently retroactively recalculate prior historical transactions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans Table */}
      <Card className="shadow-sm border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Item Type</th>
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Price (INR)</th>
                <th className="py-3.5 px-4">Access Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Effective From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-neutral-700 dark:text-neutral-300">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No pricing plans configured yet</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Click &quot;Configure Item Price&quot; above to set prices for courses or exams.
                    </p>
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  const priceRupees = (plan.amount_paise / 100).toFixed(2);
                  const dateStr = plan.effective_from
                    ? new Date(plan.effective_from).toLocaleDateString()
                    : 'Immediately';

                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 capitalize font-medium">
                          {plan.item_type === 'course' ? (
                            <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                          ) : (
                            <FileQuestion className="w-3.5 h-3.5 text-purple-500" />
                          )}
                          {plan.item_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-neutral-900 dark:text-white truncate">
                          {plan.title}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-400">ID: {plan.item_id.slice(0, 8)}...</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-900 dark:text-white text-sm">
                          {plan.is_free ? '₹ 0.00' : `₹ ${priceRupees}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            plan.is_free
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}
                        >
                          {plan.is_free ? 'Free Enrollment' : 'Paid Admission'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={plan.is_active ? 'active' : 'suspended'} type="account" />
                      </td>

                      <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Configure Pricing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Configure Item Pricing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Item Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormItemType('course');
                      if (courses.length > 0) {
                        setFormItemId(courses[0].id);
                        setFormTitle(courses[0].name);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${
                      formItemType === 'course'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/50 text-primary-900 dark:text-primary-200 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Course Channel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormItemType('exam');
                      if (exams.length > 0) {
                        setFormItemId(exams[0].id);
                        setFormTitle(exams[0].title);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${
                      formItemType === 'exam'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <FileQuestion className="w-4 h-4" />
                    <span>Exam / Assessment</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Select {formItemType === 'course' ? 'Course' : 'Exam'}
                </label>
                <select
                  value={formItemId}
                  onChange={(e) => {
                    setFormItemId(e.target.value);
                    if (formItemType === 'course') {
                      const found = courses.find((c) => c.id === e.target.value);
                      if (found) setFormTitle(found.name);
                    } else {
                      const found = exams.find((x) => x.id === e.target.value);
                      if (found) setFormTitle(found.title);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  required
                >
                  {formItemType === 'course'
                    ? courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    : exams.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.title} ({x.subject_name || 'Exam'})
                        </option>
                      ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="free-toggle"
                  checked={formIsFree}
                  onChange={(e) => setFormIsFree(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="free-toggle" className="font-medium text-neutral-800 dark:text-neutral-200">
                  Offer as Free Content (₹ 0.00)
                </label>
              </div>

              {!formIsFree && (
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Price in Rupees (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formAmountRupees}
                      onChange={(e) => setFormAmountRupees(e.target.value)}
                      placeholder="499"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
                      required={!formIsFree}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Will be stored as integer minor units ({parseFloat(formAmountRupees || '0') * 100} paise).
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason for Setting / Changing Price
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Introductory promotional fee"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={formSaving}>
                  Save Pricing Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

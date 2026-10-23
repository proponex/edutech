'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Tag,
  BookOpen,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Loader2,
  Tv,
  Check,
  ShieldAlert,
  Percent,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChannelItem,
  ScopePricingConfig,
  MonetizationScope,
  SubscriptionDuration,
} from '@/types';

interface TeacherPricingManagerProps {
  channels: ChannelItem[];
  selectedChannelId?: string;
  onChannelChange?: (channelId: string) => void;
}

export function TeacherPricingManager({
  channels,
  selectedChannelId,
  onChannelChange,
}: TeacherPricingManagerProps) {
  const [activeChannelId, setActiveChannelId] = useState<string>(
    selectedChannelId || channels[0]?.id || ''
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Pricing State for Active Channel
  const [channelPricing, setChannelPricing] = useState<ScopePricingConfig | null>(null);
  const [subjectsPricing, setSubjectsPricing] = useState<ScopePricingConfig[]>([]);
  const [chaptersPricing, setChaptersPricing] = useState<ScopePricingConfig[]>([]);

  // Form State for Channel Pricing
  const [channelIsPaid, setChannelIsPaid] = useState(true);
  const [channelMonthlyRupees, setChannelMonthlyRupees] = useState('499');
  const [channelSixMonthRupees, setChannelSixMonthRupees] = useState('2499');
  const [channelYearlyRupees, setChannelYearlyRupees] = useState('3999');
  const [savingChannel, setSavingChannel] = useState(false);

  // Edit Modal State (For Subject or Chapter)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScopePricingConfig | null>(null);
  const [modalIsPaid, setModalIsPaid] = useState(true);
  const [modalMonthlyRupees, setModalMonthlyRupees] = useState('299');
  const [modalSixMonthRupees, setModalSixMonthRupees] = useState('1499');
  const [modalYearlyRupees, setModalYearlyRupees] = useState('2499');
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Preview Mode Toggle
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  // Synchronize active channel if props change
  useEffect(() => {
    if (selectedChannelId && selectedChannelId !== activeChannelId) {
      setActiveChannelId(selectedChannelId);
    }
  }, [selectedChannelId, activeChannelId]);

  // Load Pricing Data for Active Channel
  const loadPricingData = useCallback(async (channelId: string) => {
    if (!channelId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/monetization/pricing?channelId=${channelId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch channel pricing.');
      }

      setChannelPricing(data.channelPricing || null);
      setSubjectsPricing(data.subjectsPricing || []);
      setChaptersPricing(data.chaptersPricing || []);

      if (data.channelPricing) {
        setChannelIsPaid(data.channelPricing.is_paid);
        setChannelMonthlyRupees(String(data.channelPricing.monthly_paise / 100));
        setChannelSixMonthRupees(String(data.channelPricing.six_month_paise / 100));
        setChannelYearlyRupees(String(data.channelPricing.yearly_paise / 100));
      }
    } catch (err: any) {
      console.error('[TeacherPricingManager Error]:', err);
      setError(err.message || 'Error loading pricing data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeChannelId) {
      loadPricingData(activeChannelId);
    }
  }, [activeChannelId, loadPricingData]);

  const handleSelectChannel = (id: string) => {
    setActiveChannelId(id);
    if (onChannelChange) onChannelChange(id);
  };

  // Section A: Save Channel Pricing
  const handleSaveChannelPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannelId) return;

    setSavingChannel(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const mPaise = channelIsPaid ? Math.round(parseFloat(channelMonthlyRupees || '0') * 100) : 0;
      const sPaise = channelIsPaid ? Math.round(parseFloat(channelSixMonthRupees || '0') * 100) : 0;
      const yPaise = channelIsPaid ? Math.round(parseFloat(channelYearlyRupees || '0') * 100) : 0;

      const res = await fetch('/api/monetization/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: activeChannelId,
          scope: 'channel',
          is_paid: channelIsPaid,
          monthly_paise: mPaise,
          six_month_paise: sPaise,
          yearly_paise: yPaise,
          reason: 'Teacher updated channel subscription pricing',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save channel pricing.');
      }

      setSaveSuccess('Channel subscription pricing saved successfully.');
      loadPricingData(activeChannelId);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save channel pricing.');
    } finally {
      setSavingChannel(false);
    }
  };

  // Open Edit Modal for Subject or Chapter
  const openEditModal = (target: ScopePricingConfig) => {
    setEditTarget(target);
    setModalIsPaid(target.is_paid);
    setModalMonthlyRupees(String((target.monthly_paise || 29900) / 100));
    setModalSixMonthRupees(String((target.six_month_paise || 149900) / 100));
    setModalYearlyRupees(String((target.yearly_paise || 249900) / 100));
    setModalError(null);
    setEditModalOpen(true);
  };

  // Save Modal Pricing (Subject or Chapter)
  const handleSaveModalPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !activeChannelId) return;

    setSavingModal(true);
    setModalError(null);

    try {
      const mPaise = modalIsPaid ? Math.round(parseFloat(modalMonthlyRupees || '0') * 100) : 0;
      const sPaise = modalIsPaid ? Math.round(parseFloat(modalSixMonthRupees || '0') * 100) : 0;
      const yPaise = modalIsPaid ? Math.round(parseFloat(modalYearlyRupees || '0') * 100) : 0;

      const res = await fetch('/api/monetization/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: activeChannelId,
          scope: editTarget.scope,
          subject_name: editTarget.subject_name || null,
          unit_id: editTarget.unit_id || null,
          is_paid: modalIsPaid,
          monthly_paise: mPaise,
          six_month_paise: sPaise,
          yearly_paise: yPaise,
          reason: `Teacher updated ${editTarget.scope} pricing`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to update ${editTarget.scope} pricing.`);
      }

      setEditModalOpen(false);
      setSaveSuccess(`${editTarget.title} pricing updated successfully.`);
      loadPricingData(activeChannelId);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save pricing.');
    } finally {
      setSavingModal(false);
    }
  };

  const selectedChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="space-y-8">
      {/* Top Header & Channel Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              Monetization Center
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Course, Subject &amp; Chapter Pricing
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure independent subscription pricing tiers for full channel access, individual subjects, and specific chapters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Channel Selector */}
          {channels.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-neutral-500">Channel:</label>
              <select
                value={activeChannelId}
                onChange={(e) => handleSelectChannel(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            size="sm"
            variant={showStudentPreview ? 'primary' : 'outline'}
            onClick={() => setShowStudentPreview(!showStudentPreview)}
            className="flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showStudentPreview ? 'Hide Student Preview' : 'Preview Student Pricing'}</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* STUDENT PRICING PREVIEW BANNER */}
      {showStudentPreview && selectedChannel && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-primary-900 via-neutral-900 to-indigo-950 text-white shadow-xl space-y-4 border border-primary-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Live Student Pricing Preview
            </span>
            <Badge variant="outline" className="text-white border-white/20 text-[10px]">
              {selectedChannel.name}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <span className="text-xs text-neutral-300 font-semibold">Channel Monthly</span>
              <div className="text-2xl font-extrabold font-display">
                ₹{channelIsPaid ? channelMonthlyRupees : '0.00 (Free)'}
              </div>
              <p className="text-[11px] text-neutral-300">All subjects & chapters included</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <span className="text-xs text-neutral-300 font-semibold">Channel 6 Months</span>
              <div className="text-2xl font-extrabold font-display">
                ₹{channelIsPaid ? channelSixMonthRupees : '0.00 (Free)'}
              </div>
              <p className="text-[11px] text-neutral-300">180 calendar days access</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <span className="text-xs text-neutral-300 font-semibold">Channel 12 Months</span>
              <div className="text-2xl font-extrabold font-display">
                ₹{channelIsPaid ? channelYearlyRupees : '0.00 (Free)'}
              </div>
              <p className="text-[11px] text-neutral-300">365 calendar days access</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* ======================================================================= */}
          {/* SECTION A: CHANNEL-LEVEL PRICING */}
          {/* ======================================================================= */}
          <Card className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800/80 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-primary-500" />
                    <CardTitle className="text-lg font-bold text-neutral-950 dark:text-white">
                      Section A: Channel Subscription Pricing
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure the master subscription price for{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedChannel?.name || 'this channel'}
                    </strong>
                    . Students who purchase this gain access to all subjects, units, and paid videos in this channel.
                  </CardDescription>
                </div>

                <Badge
                  variant={channelIsPaid ? 'success' : 'outline'}
                  className="self-start sm:self-center text-xs px-3 py-1"
                >
                  {channelIsPaid ? 'Paid Channel Access Enabled' : 'Free Channel Access'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSaveChannelPricing} className="space-y-6">
                {/* Enable/Disable Paid Access Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                  <div>
                    <label className="text-sm font-bold text-neutral-900 dark:text-white cursor-pointer">
                      Enable Paid Channel Access
                    </label>
                    <p className="text-xs text-neutral-500">
                      When disabled, all published channel videos remain completely free for all students.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={channelIsPaid}
                    onChange={(e) => setChannelIsPaid(e.target.checked)}
                    className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                </div>

                {/* Platform Fee Notice */}
                {channelIsPaid && (
                  <div className="p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 text-xs text-primary-900 dark:text-primary-300 flex items-start gap-2.5">
                    <Percent className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">20% Platform Surcharge Model Active:</span>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                        Enter your desired net earnings. A 20% platform fee is applied on top so students pay the total (e.g., if you ask for ₹1,000, students pay ₹1,200, and you receive ₹1,000).
                      </p>
                    </div>
                  </div>
                )}

                {/* Price Duration Grid */}
                {channelIsPaid && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Monthly Teacher Ask (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min="10"
                          max="50000"
                          step="1"
                          required
                          value={channelMonthlyRupees}
                          onChange={(e) => setChannelMonthlyRupees(e.target.value)}
                          className="pl-8 text-sm font-bold"
                          placeholder="1000"
                        />
                      </div>
                      {parseFloat(channelMonthlyRupees || '0') > 0 && (
                        <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[11px] space-y-0.5 border border-neutral-200 dark:border-neutral-700">
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>Your Ask:</span>
                            <span className="font-bold text-neutral-900 dark:text-white">₹{parseFloat(channelMonthlyRupees || '0').toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-primary-600 dark:text-primary-400">
                            <span>Platform Fee (+20%):</span>
                            <span className="font-semibold">+₹{Math.round(parseFloat(channelMonthlyRupees || '0') * 0.20)}</span>
                          </div>
                          <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-0.5 font-extrabold text-neutral-900 dark:text-white">
                            <span>Student Pays:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{Math.round(parseFloat(channelMonthlyRupees || '0') * 1.20)}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-neutral-400">Renews every 1 calendar month</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        6-Month Teacher Ask (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min="10"
                          max="50000"
                          step="1"
                          required
                          value={channelSixMonthRupees}
                          onChange={(e) => setChannelSixMonthRupees(e.target.value)}
                          className="pl-8 text-sm font-bold"
                          placeholder="2499"
                        />
                      </div>
                      {parseFloat(channelSixMonthRupees || '0') > 0 && (
                        <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[11px] space-y-0.5 border border-neutral-200 dark:border-neutral-700">
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>Your Ask:</span>
                            <span className="font-bold text-neutral-900 dark:text-white">₹{parseFloat(channelSixMonthRupees || '0').toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-primary-600 dark:text-primary-400">
                            <span>Platform Fee (+20%):</span>
                            <span className="font-semibold">+₹{Math.round(parseFloat(channelSixMonthRupees || '0') * 0.20)}</span>
                          </div>
                          <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-0.5 font-extrabold text-neutral-900 dark:text-white">
                            <span>Student Pays:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{Math.round(parseFloat(channelSixMonthRupees || '0') * 1.20)}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-neutral-400">Renews every 6 calendar months</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        12-Month Teacher Ask (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min="10"
                          max="50000"
                          step="1"
                          required
                          value={channelYearlyRupees}
                          onChange={(e) => setChannelYearlyRupees(e.target.value)}
                          className="pl-8 text-sm font-bold"
                          placeholder="3999"
                        />
                      </div>
                      {parseFloat(channelYearlyRupees || '0') > 0 && (
                        <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[11px] space-y-0.5 border border-neutral-200 dark:border-neutral-700">
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>Your Ask:</span>
                            <span className="font-bold text-neutral-900 dark:text-white">₹{parseFloat(channelYearlyRupees || '0').toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between text-primary-600 dark:text-primary-400">
                            <span>Platform Fee (+20%):</span>
                            <span className="font-semibold">+₹{Math.round(parseFloat(channelYearlyRupees || '0') * 0.20)}</span>
                          </div>
                          <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-0.5 font-extrabold text-neutral-900 dark:text-white">
                            <span>Student Pays:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{Math.round(parseFloat(channelYearlyRupees || '0') * 1.20)}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-neutral-400">Renews every 12 calendar months</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingChannel}
                    className="flex items-center gap-2 font-bold px-6 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingChannel ? 'Saving Changes...' : 'Save Channel Pricing'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ======================================================================= */}
          {/* SECTION B: SUBJECT-LEVEL PRICING */}
          {/* ======================================================================= */}
          <Card className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800/80 p-6 sm:p-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <CardTitle className="text-lg font-bold text-neutral-950 dark:text-white">
                    Section B: Subject Subscription Pricing
                  </CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  Set independent prices for individual subjects in this channel. A student purchasing a subject receives access to all chapters and videos within that specific subject only.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {subjectsPricing.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No distinct academic subjects created in this channel yet. Create units with subject names to configure subject pricing.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-neutral-50/80 dark:bg-neutral-950 text-neutral-500 text-[11px] uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="py-3 px-6">Subject Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Monthly (Ask / Student)</th>
                        <th className="py-3 px-4">6 Mo (Ask / Student)</th>
                        <th className="py-3 px-4">12 Mo (Ask / Student)</th>
                        <th className="py-3 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                      {subjectsPricing.map((subj) => (
                        <tr
                          key={subj.title}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                        >
                          <td className="py-4 px-6 font-bold text-neutral-900 dark:text-white">
                            {subj.title}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant={subj.is_paid ? 'success' : 'outline'} className="text-[11px]">
                              {subj.is_paid ? 'Paid' : 'Free'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {subj.is_paid ? (
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  ₹{(subj.monthly_paise / 100).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-primary-600 dark:text-primary-400 font-sans font-semibold">
                                  Student: ₹{((subj.student_monthly_paise || Math.round(subj.monthly_paise * 1.2)) / 100).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">Free</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {subj.is_paid ? (
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  ₹{(subj.six_month_paise / 100).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-primary-600 dark:text-primary-400 font-sans font-semibold">
                                  Student: ₹{((subj.student_six_month_paise || Math.round(subj.six_month_paise * 1.2)) / 100).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">Free</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {subj.is_paid ? (
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  ₹{(subj.yearly_paise / 100).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-primary-600 dark:text-primary-400 font-sans font-semibold">
                                  Student: ₹{((subj.student_yearly_paise || Math.round(subj.yearly_paise * 1.2)) / 100).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">Free</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(subj)}
                              className="text-xs font-bold flex items-center gap-1.5 ml-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Pricing</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ======================================================================= */}
          {/* SECTION C: CHAPTER-LEVEL PRICING */}
          {/* ======================================================================= */}
          <Card className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800/80 p-6 sm:p-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  <CardTitle className="text-lg font-bold text-neutral-950 dark:text-white">
                    Section C: Chapter (Unit) Subscription Pricing
                  </CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  Monetize individual chapters separately. A chapter subscription grants access only to the selected chapter unless the student has an active broader subject or channel subscription.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {chaptersPricing.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No curriculum units (chapters) created in this channel yet. Go to your Channel Studio to add units.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-neutral-50/80 dark:bg-neutral-950 text-neutral-500 text-[11px] uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="py-3 px-6">Chapter Title</th>
                        <th className="py-3 px-4">Parent Subject</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Monthly (Ask / Student)</th>
                        <th className="py-3 px-4">6 Mo (Ask / Student)</th>
                        <th className="py-3 px-4">12 Mo (Ask / Student)</th>
                        <th className="py-3 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                      {chaptersPricing.map((chap) => (
                        <tr
                          key={chap.unit_id || chap.title}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                        >
                          <td className="py-4 px-6 font-bold text-neutral-900 dark:text-white">
                            {chap.title}
                          </td>
                          <td className="py-4 px-4 text-xs font-semibold text-neutral-500">
                            {chap.subject_name || 'General'}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant={chap.is_paid ? 'success' : 'outline'} className="text-[11px]">
                              {chap.is_paid ? 'Paid' : 'Free'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {chap.is_paid ? (
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  ₹{(chap.monthly_paise / 100).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-primary-600 dark:text-primary-400 font-sans font-semibold">
                                  Student: ₹{((chap.student_monthly_paise || Math.round(chap.monthly_paise * 1.2)) / 100).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">Free</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {chap.is_paid ? (
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  ₹{(chap.six_month_paise / 100).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-primary-600 dark:text-primary-400 font-sans font-semibold">
                                  Student: ₹{((chap.student_six_month_paise || Math.round(chap.six_month_paise * 1.2)) / 100).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">Free</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {chap.is_paid ? (
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-white">
                                  ₹{(chap.yearly_paise / 100).toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] text-primary-600 dark:text-primary-400 font-sans font-semibold">
                                  Student: ₹{((chap.student_yearly_paise || Math.round(chap.yearly_paise * 1.2)) / 100).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">Free</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(chap)}
                              className="text-xs font-bold flex items-center gap-1.5 ml-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Pricing</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* EDIT PRICING MODAL (FOR SUBJECT OR CHAPTER) */}
      {editModalOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  Edit {editTarget.scope} Pricing
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {editTarget.title}
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModalPricing} className="space-y-4">
              {/* Paid / Free Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <label className="text-xs font-bold text-neutral-900 dark:text-white cursor-pointer">
                    Enable Paid Access
                  </label>
                  <p className="text-[11px] text-neutral-500">
                    If disabled, content in this {editTarget.scope} is free.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={modalIsPaid}
                  onChange={(e) => setModalIsPaid(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
              </div>

              {/* Surcharge Notice */}
              {modalIsPaid && (
                <div className="p-3 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 text-xs text-primary-900 dark:text-primary-300 flex items-start gap-2">
                  <Percent className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Set your desired net earnings for this {editTarget.scope === 'chapter' ? 'chapter' : 'subject'}. A 20% platform fee is added so students pay the total (e.g. if you ask for ₹1,000, students pay ₹1,200, and you receive ₹1,000).
                  </p>
                </div>
              )}

              {/* Durations */}
              {modalIsPaid && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Monthly Teacher Ask (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="10"
                        max="50000"
                        step="1"
                        required
                        value={modalMonthlyRupees}
                        onChange={(e) => setModalMonthlyRupees(e.target.value)}
                        className="pl-8 text-sm font-bold"
                        placeholder="1000"
                      />
                    </div>
                    {parseFloat(modalMonthlyRupees || '0') > 0 && (
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[10px] space-y-0.5 border border-neutral-200 dark:border-neutral-700">
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Your Ask:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">₹{parseFloat(modalMonthlyRupees || '0').toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-primary-600 dark:text-primary-400">
                          <span>Platform Fee (+20%):</span>
                          <span>+₹{Math.round(parseFloat(modalMonthlyRupees || '0') * 0.20)}</span>
                        </div>
                        <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-0.5 font-bold">
                          <span>Student Pays:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ₹{Math.round(parseFloat(modalMonthlyRupees || '0') * 1.20)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      6-Month Teacher Ask (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="10"
                        max="50000"
                        step="1"
                        required
                        value={modalSixMonthRupees}
                        onChange={(e) => setModalSixMonthRupees(e.target.value)}
                        className="pl-8 text-sm font-bold"
                        placeholder="2499"
                      />
                    </div>
                    {parseFloat(modalSixMonthRupees || '0') > 0 && (
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[10px] space-y-0.5 border border-neutral-200 dark:border-neutral-700">
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Your Ask:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">₹{parseFloat(modalSixMonthRupees || '0').toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-primary-600 dark:text-primary-400">
                          <span>Platform Fee (+20%):</span>
                          <span>+₹{Math.round(parseFloat(modalSixMonthRupees || '0') * 0.20)}</span>
                        </div>
                        <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-0.5 font-bold">
                          <span>Student Pays:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ₹{Math.round(parseFloat(modalSixMonthRupees || '0') * 1.20)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      12-Month Teacher Ask (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="10"
                        max="50000"
                        step="1"
                        required
                        value={modalYearlyRupees}
                        onChange={(e) => setModalYearlyRupees(e.target.value)}
                        className="pl-8 text-sm font-bold"
                        placeholder="3999"
                      />
                    </div>
                    {parseFloat(modalYearlyRupees || '0') > 0 && (
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-[10px] space-y-0.5 border border-neutral-200 dark:border-neutral-700">
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Your Ask:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">₹{parseFloat(modalYearlyRupees || '0').toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-primary-600 dark:text-primary-400">
                          <span>Platform Fee (+20%):</span>
                          <span>+₹{Math.round(parseFloat(modalYearlyRupees || '0') * 0.20)}</span>
                        </div>
                        <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-0.5 font-bold">
                          <span>Student Pays:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ₹{Math.round(parseFloat(modalYearlyRupees || '0') * 1.20)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  disabled={savingModal}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingModal} className="font-bold">
                  {savingModal ? 'Saving...' : 'Save Pricing'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

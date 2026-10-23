'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  ShieldCheck,
  Check,
  Calendar,
  Layers,
  BookOpen,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MuxVideoPlayer } from '@/components/shared/MuxVideoPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { openAuthModal } from '@/components/auth/auth-modal';

import { createClient } from '@/lib/supabase/client';
import { StudentService } from '@/lib/student-service';
import { TeacherService } from '@/lib/teacher-service';
import {
  VideoContentItem,
  ChannelItem,
  Profile,
  StudentContentProgress,
  MonetizationScope,
  SubscriptionDuration,
  VideoPlaybackAccessResult,
} from '@/types';

export default function VideoWatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const videoId = params.videoId as string;
  const channelId = searchParams.get('channelId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoContentItem | null>(null);
  const [channel, setChannel] = useState<ChannelItem | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<StudentContentProgress | null>(null);

  // Playback Authorization State
  const [playbackAccess, setPlaybackAccess] = useState<VideoPlaybackAccessResult | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // In-Page Checkout State
  const [selectedScope, setSelectedScope] = useState<MonetizationScope>('chapter');
  const [selectedDuration, setSelectedDuration] = useState<SubscriptionDuration>('1_month');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);

  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const supabase = createClient();
  const lastSavedTimeRef = useRef<number>(0);
  const lastSavedPercentRef = useRef<number>(0);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 1. Authoritative Backend Playback Verification
  const verifyPlayback = useCallback(async () => {
    if (!videoId) return;
    try {
      setLoading(true);
      setError(null);

      // Authenticated user check
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let profile: Profile | null = null;
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        profile = data as Profile;
        setCurrentUser(profile);
      }

      // Check authoritative playback access via backend API
      const res = await fetch(`/api/videos/${videoId}/playback`);
      const accessData: VideoPlaybackAccessResult = await res.json();

      setPlaybackAccess(accessData);

      if (res.status === 403 || accessData.locked) {
        setIsLocked(true);
        // Default to chapter if available, else subject, else channel
        if (accessData.pricingOptions?.chapter?.is_paid) {
          setSelectedScope('chapter');
        } else if (accessData.pricingOptions?.subject?.is_paid) {
          setSelectedScope('subject');
        } else {
          setSelectedScope('channel');
        }
        setLoading(false);
        return;
      }

      if (!res.ok || !accessData.access) {
        setError(accessData.reason || 'Failed to verify playback access.');
        setLoading(false);
        return;
      }

      // Access is granted
      setIsLocked(false);

      // Load video and channel details
      const [vid, ch] = await Promise.all([
        StudentService.getVideoById(videoId),
        channelId ? TeacherService.getChannelById(channelId) : null,
      ]);

      if (vid) {
        setVideo({
          ...vid,
          mux_playback_id: accessData.playbackId || vid.mux_playback_id,
          video_url: accessData.videoUrl || vid.video_url,
        });
      }
      if (ch) setChannel(ch);

      // Load student progress if student
      if (profile && profile.role === 'student' && vid) {
        const prog = await StudentService.getSingleContentProgress(profile.id, vid.id, 'video');
        setProgress(prog);
        if (prog?.status === 'completed') {
          setHasCompleted(true);
        }
      }
    } catch (err: any) {
      console.error('[VideoWatchPage] Error verifying playback:', err);
      setError('Unable to authenticate video stream.');
    } finally {
      setLoading(false);
    }
  }, [videoId, channelId, supabase]);

  useEffect(() => {
    verifyPlayback();
  }, [verifyPlayback]);

  // Checkout handler right from the locked screen
  const handlePurchaseSubscription = async () => {
    if (!currentUser) {
      openAuthModal('login', 'Please sign in or create an account to purchase access.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    try {
      const targetChannelId = channelId || video?.channel_id || playbackAccess?.pricingOptions?.channel?.channel_id;
      if (!targetChannelId) {
        throw new Error('Channel information is required for purchasing access.');
      }

      const unitId = video?.unit_id || playbackAccess?.pricingOptions?.chapter?.unit_id || null;
      const subjectName = video?.subject_name || playbackAccess?.pricingOptions?.subject?.subject_name || null;

      // 1. Create order on backend with selected scope & duration
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: selectedScope === 'chapter' ? 'chapter' : 'course',
          item_id: targetChannelId,
          scope: selectedScope,
          duration: selectedDuration,
          unit_id: unitId,
          subject_name: subjectName,
        }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment order.');
      }

      // If free item, already unlocked
      if (orderData.isFree) {
        setCheckoutSuccess('Access unlocked successfully!');
        setTimeout(() => {
          verifyPlayback();
        }, 1200);
        return;
      }

      // 2. Load official Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay checkout SDK.');
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        name: 'Edutech Learning Platform',
        description: `${orderData.itemName} (${selectedDuration.replace(/_/g, ' ')})`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setCheckoutLoading(true);
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }

            setCheckoutSuccess('Payment successful! Video unlocked.');
            setTimeout(() => {
              verifyPlayback();
            }, 1200);
          } catch (vErr: any) {
            setCheckoutError(vErr.message || 'Payment verification failed.');
          } finally {
            setCheckoutLoading(false);
          }
        },
        prefill: {
          name: currentUser.name || '',
          email: currentUser.email || '',
          contact: currentUser.phone || '',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: function () {
            setCheckoutLoading(false);
          },
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on('payment.failed', function (resp: any) {
        setCheckoutError(resp.error?.description || 'Payment was declined.');
        setCheckoutLoading(false);
      });
      rzpInstance.open();
    } catch (err: any) {
      console.error('[Checkout Error]:', err);
      setCheckoutError(err.message || 'Payment initiation error.');
      setCheckoutLoading(false);
    }
  };

  // Manual / automatic reconciliation callback
  const handleRefreshStatus = useCallback(async () => {
    if (!videoId) return;
    try {
      const res = await fetch('/api/mux/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId }),
      });
      const data = await res.json();
      if (data.status) {
        const updatedVid = await StudentService.getVideoById(videoId);
        if (updatedVid) {
          setVideo(updatedVid);
        }
      }
    } catch (e) {
      console.warn('Reconciliation check failed:', e);
    }
  }, [videoId]);

  // Poll video status while video is processing
  const muxStatus = video?.mux_status;
  useEffect(() => {
    if (!videoId || !muxStatus || muxStatus === 'ready' || muxStatus === 'errored') return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      try {
        pollCount += 1;
        const updatedVid = await StudentService.getVideoById(videoId);
        if (updatedVid) {
          setVideo(updatedVid);
          if (updatedVid.mux_status === 'ready' || updatedVid.mux_status === 'errored') {
            return;
          }
        }
        if (pollCount % 2 === 0) {
          await handleRefreshStatus();
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [videoId, muxStatus, handleRefreshStatus]);

  // Handle Video Time Update
  const handleTimeUpdate = useCallback(
    (e: Event) => {
      if (!currentUser || currentUser.role !== 'student' || !channelId || !video) return;

      const target = e.target as HTMLVideoElement;
      if (!target) return;

      const currentTime = target.currentTime;
      const duration = target.duration || video.duration_seconds || video.mux_duration || 0;

      if (duration <= 0) return;

      const percent = Math.min(100, Math.round((currentTime / duration) * 100));

      const isNowCompleted = percent >= 95;
      if (isNowCompleted && !hasCompleted) {
        setHasCompleted(true);
        saveProgress(currentTime, percent, 'completed');
        return;
      }

      if (!hasCompleted && Math.abs(currentTime - lastSavedTimeRef.current) >= 5) {
        lastSavedTimeRef.current = currentTime;
        lastSavedPercentRef.current = percent;
        saveProgress(currentTime, percent, 'in_progress');
      }
    },
    [currentUser, channelId, video, hasCompleted]
  );

  const saveProgress = async (
    currentTime: number,
    percent: number,
    status: 'in_progress' | 'completed'
  ) => {
    if (!currentUser || !channelId || !video) return;

    setIsSavingProgress(true);
    try {
      await StudentService.updateContentProgress({
        studentId: currentUser.id,
        channelId,
        contentType: 'video',
        contentId: video.id,
        status,
        watchedSeconds: Math.round(currentTime),
        progressPercent: percent,
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleEnded = () => {
    if (!hasCompleted) {
      setHasCompleted(true);
      saveProgress(video?.duration_seconds || 0, 100, 'completed');
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    );
  }

  // LOCKED CONTENT SCREEN (Requirement 6 & 9)
  if (isLocked && playbackAccess) {
    const opts = playbackAccess.pricingOptions;
    const currentScopeConfig =
      selectedScope === 'chapter'
        ? opts?.chapter
        : selectedScope === 'subject'
        ? opts?.subject
        : opts?.channel;

    const basePricePaise =
      selectedDuration === '1_month'
        ? currentScopeConfig?.monthly_paise || 14900
        : selectedDuration === '6_months'
        ? currentScopeConfig?.six_month_paise || 69900
        : currentScopeConfig?.yearly_paise || 119900;

    const studentPricePaise =
      selectedDuration === '1_month'
        ? currentScopeConfig?.student_monthly_paise || Math.round(basePricePaise * 1.2)
        : selectedDuration === '6_months'
        ? currentScopeConfig?.student_six_month_paise || Math.round(basePricePaise * 1.2)
        : currentScopeConfig?.student_yearly_paise || Math.round(basePricePaise * 1.2);

    const platformFeePaise = Math.max(0, studentPricePaise - basePricePaise);

    const priceRupees = (studentPricePaise / 100).toLocaleString('en-IN');
    const teacherBaseRupees = (basePricePaise / 100).toLocaleString('en-IN');
    const platformFeeRupees = (platformFeePaise / 100).toLocaleString('en-IN');

    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100">
        <Header />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <Badge variant="outline" className="text-xs flex items-center gap-1.5 py-1 px-3">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Paid Educational Content
            </Badge>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-10 shadow-xl border border-neutral-200/80 dark:border-neutral-800 space-y-8">
            {/* Header info */}
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 mx-auto flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-neutral-950 dark:text-white">
                {playbackAccess.title || 'Premium Lesson Locked'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                This lesson is part of educator{' '}
                <strong className="text-neutral-900 dark:text-white">
                  {playbackAccess.teacherName || 'Verified Educator'}
                </strong>
                &apos;s curriculum. Choose your preferred subscription level and duration to unlock instant access.
              </p>
            </div>

            {/* Level Selector: Chapter, Subject, Channel */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block text-center">
                Select Monetization Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Chapter Option */}
                {opts?.chapter && (
                  <button
                    type="button"
                    onClick={() => setSelectedScope('chapter')}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                      selectedScope === 'chapter'
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500/20'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                          Chapter Level
                        </span>
                        {selectedScope === 'chapter' && (
                          <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {opts.chapter.title || 'Selected Chapter'}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Access to all videos in this chapter only.
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-900 dark:text-white">
                      <div className="font-bold">
                        From ₹{((opts.chapter.student_monthly_paise || Math.round((opts.chapter.monthly_paise || 14900) * 1.2)) / 100).toLocaleString('en-IN')}/mo
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Ask ₹{((opts.chapter.monthly_paise || 14900) / 100).toLocaleString('en-IN')} + 20% fee
                      </div>
                    </div>
                  </button>
                )}

                {/* Subject Option */}
                {opts?.subject && (
                  <button
                    type="button"
                    onClick={() => setSelectedScope('subject')}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                      selectedScope === 'subject'
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500/20'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                          Subject Level
                        </span>
                        {selectedScope === 'subject' && (
                          <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {opts.subject.title || 'Subject Access'}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Access to all chapters & videos in this subject.
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-900 dark:text-white">
                      <div className="font-bold">
                        From ₹{((opts.subject.student_monthly_paise || Math.round((opts.subject.monthly_paise || 29900) * 1.2)) / 100).toLocaleString('en-IN')}/mo
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Ask ₹{((opts.subject.monthly_paise || 29900) / 100).toLocaleString('en-IN')} + 20% fee
                      </div>
                    </div>
                  </button>
                )}

                {/* Channel Option */}
                {opts?.channel && (
                  <button
                    type="button"
                    onClick={() => setSelectedScope('channel')}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                      selectedScope === 'channel'
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-500/20'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                          Full Channel
                        </span>
                        {selectedScope === 'channel' && (
                          <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {opts.channel.title || 'Complete Channel'}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Unrestricted access to all subjects, chapters & videos.
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-900 dark:text-white">
                      <div className="font-bold">
                        From ₹{((opts.channel.student_monthly_paise || Math.round((opts.channel.monthly_paise || 49900) * 1.2)) / 100).toLocaleString('en-IN')}/mo
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Ask ₹{((opts.channel.monthly_paise || 49900) / 100).toLocaleString('en-IN')} + 20% fee
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Duration Selector: 1 Month, 6 Months, 12 Months */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block text-center">
                Select Access Duration
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDuration('1_month')}
                  className={`py-3 px-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                    selectedDuration === '1_month'
                      ? 'border-primary-500 bg-primary-500 text-white shadow-md'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  1 Month
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDuration('6_months')}
                  className={`py-3 px-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                    selectedDuration === '6_months'
                      ? 'border-primary-500 bg-primary-500 text-white shadow-md'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  6 Months
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDuration('12_months')}
                  className={`py-3 px-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                    selectedDuration === '12_months'
                      ? 'border-primary-500 bg-primary-500 text-white shadow-md'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  12 Months (Best Value)
                </button>
              </div>
            </div>

            {/* Price Summary & Checkout Action */}
            <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center space-y-4 max-w-md mx-auto">
              <div>
                <p className="text-xs text-neutral-500 font-medium">Total Payable</p>
                <div className="text-3xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white font-display mt-1">
                  ₹{priceRupees}
                </div>

                {/* Itemized Fee Breakdown Badge */}
                <div className="mt-3 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Teacher Content Fee:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">₹{teacherBaseRupees}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Platform Service Fee (+20%):</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">+₹{platformFeeRupees}</span>
                  </div>
                  <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between font-bold text-neutral-900 dark:text-white">
                    <span>Total Amount Payable:</span>
                    <span>₹{priceRupees}</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400 mt-2">
                  Includes full access for{' '}
                  {selectedDuration === '1_month'
                    ? '1 Month'
                    : selectedDuration === '6_months'
                    ? '6 Months'
                    : '12 Months'}{' '}
                  via verified Razorpay gateway.
                </p>
              </div>

              {checkoutError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {checkoutSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{checkoutSuccess}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handlePurchaseSubscription}
                disabled={checkoutLoading}
                className="w-full flex items-center justify-center gap-2 font-bold shadow-lg"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Subscribe & Unlock Now</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error State
  if (error || !video) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Error</h2>
          <p className="text-sm text-neutral-500">{error || 'Video not found'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // AUTHORIZED VIDEO PLAYER SCREEN
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Bar with Back Button & Completed Badge */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <Badge variant="success" className="flex items-center gap-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authorized Access
            </Badge>

            {hasCompleted && (
              <Badge variant="success" className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </Badge>
            )}
          </div>
        </div>

        {/* Video Player Section */}
        <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800">
          {video.mux_playback_id && video.mux_status === 'ready' ? (
            <MuxVideoPlayer
              playbackId={video.mux_playback_id}
              muxStatus={video.mux_status}
              title={video.title}
              thumbnailUrl={video.thumbnail_url}
              errorMessage={video.mux_error_message}
              startTime={progress?.watched_seconds || 0}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onRefreshStatus={handleRefreshStatus}
            />
          ) : video.mux_status && video.mux_status !== 'ready' ? (
            <MuxVideoPlayer
              playbackId={null}
              muxStatus={video.mux_status}
              title={video.title}
              thumbnailUrl={video.thumbnail_url}
              errorMessage={video.mux_error_message}
              onRefreshStatus={handleRefreshStatus}
            />
          ) : video.video_url ? (
            <video
              src={video.video_url}
              controls
              autoPlay
              className="w-full aspect-video object-contain"
              onTimeUpdate={(e) => handleTimeUpdate(e as any)}
              onEnded={handleEnded}
            />
          ) : (
            <MuxVideoPlayer
              playbackId={null}
              muxStatus={null}
              title={video.title}
              thumbnailUrl={video.thumbnail_url}
              errorMessage={video.mux_error_message}
              onRefreshStatus={handleRefreshStatus}
            />
          )}
        </div>

        {/* Video Information */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-display">
              {video.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-500 font-medium">
              {channel && (
                <span className="text-primary-600 dark:text-primary-400 font-bold">
                  {channel.name}
                </span>
              )}
              {channel && <span>•</span>}
              <span>{video.subject_name}</span>
            </div>
          </div>

          {video.description && (
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {video.description}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

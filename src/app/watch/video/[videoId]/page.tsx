'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MuxVideoPlayer } from '@/components/shared/MuxVideoPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { openAuthModal } from '@/components/auth/auth-modal';

import { createClient } from '@/lib/supabase/client';
import { StudentService } from '@/lib/student-service';
import { TeacherService } from '@/lib/teacher-service';
import { VideoContentItem, ChannelItem, Profile, StudentContentProgress } from '@/types';

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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [progress, setProgress] = useState<StudentContentProgress | null>(null);
  
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const supabase = createClient();
  const lastSavedTimeRef = useRef<number>(0);
  const lastSavedPercentRef = useRef<number>(0);

  // Load Data
  useEffect(() => {
    async function loadData() {
      if (!videoId || !channelId) {
        setError('Missing video or channel information.');
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        let profile = null;
        if (user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          profile = data as Profile;
          setCurrentUser(profile);
        }

        const [vid, ch] = await Promise.all([
          StudentService.getVideoById(videoId),
          TeacherService.getChannelById(channelId)
        ]);

        if (!vid) {
          setError('Video not found.');
          return;
        }

        setVideo(vid);
        setChannel(ch);

        // Check subscription
        let hasAccess = false;
        if (vid.is_demo) {
          hasAccess = true;
        } else if (profile && profile.role === 'student') {
          const subscription = await StudentService.getSubscription(profile.id, channelId);
          if (subscription && subscription.status === 'active') {
            hasAccess = true;
            setIsSubscribed(true);
          }
        } else if (profile && profile.role === 'teacher') {
          hasAccess = true; // Teachers can preview
        }

        if (!hasAccess) {
          if (!profile) {
             openAuthModal('login', 'Please sign in or create an account to view this lesson.');
          }
          setError('access_denied');
          return;
        }

        // Load progress
        if (profile && profile.role === 'student') {
          const prog = await StudentService.getSingleContentProgress(profile.id, vid.id, 'video');
          setProgress(prog);
          if (prog?.status === 'completed') {
            setHasCompleted(true);
          }
        }

      } catch (err: any) {
        console.error('Error loading video data:', err);
        setError('Failed to load video.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [videoId, channelId, supabase]);

  // Poll video status if not ready
  useEffect(() => {
    if (!video || video.mux_status === 'ready' || video.mux_status === 'errored' || !video.mux_status) return;

    const interval = setInterval(async () => {
      try {
        const updatedVid = await StudentService.getVideoById(video.id);
        if (updatedVid && updatedVid.mux_status !== video.mux_status) {
          setVideo(updatedVid);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [video]);

  // Handle Video Time Update
  const handleTimeUpdate = useCallback((e: Event) => {
    if (!currentUser || currentUser.role !== 'student' || !channelId || !video) return;
    
    const target = e.target as HTMLVideoElement;
    if (!target) return;
    
    const currentTime = target.currentTime;
    const duration = target.duration || video.duration_seconds || video.mux_duration || 0;
    
    if (duration <= 0) return;
    
    const percent = Math.min(100, Math.round((currentTime / duration) * 100));
    
    // Check if we reached completion threshold (95%)
    const isNowCompleted = percent >= 95;
    if (isNowCompleted && !hasCompleted) {
      setHasCompleted(true);
      saveProgress(currentTime, percent, 'completed');
      return;
    }

    // Save progress periodically (e.g. every 5 seconds) to avoid spamming the DB
    if (!hasCompleted && Math.abs(currentTime - lastSavedTimeRef.current) >= 5) {
      lastSavedTimeRef.current = currentTime;
      lastSavedPercentRef.current = percent;
      saveProgress(currentTime, percent, 'in_progress');
    }
  }, [currentUser, channelId, video, hasCompleted]);

  const saveProgress = async (currentTime: number, percent: number, status: 'in_progress' | 'completed') => {
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

  if (error === 'access_denied') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
            <Lock className="w-8 h-8 text-neutral-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Content Locked</h2>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            This video is part of a premium channel. You need an active subscription to watch this content.
          </p>
          <Button onClick={() => router.push(`/channels/${channelId}`)}>
            Back to Channel
          </Button>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Error</h2>
          <p className="text-sm text-neutral-500">{error || 'Video not found'}</p>
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Bar with Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          
          {hasCompleted && (
            <Badge variant="success" className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </Badge>
          )}
        </div>

        {/* Video Player Section */}
        <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800">
          {video.mux_playback_id && video.mux_status === 'ready' ? (
            <MuxVideoPlayer
              playbackId={video.mux_playback_id}
              muxStatus={video.mux_status}
              title={video.title}
              thumbnailUrl={video.thumbnail_url}
              startTime={progress?.watched_seconds || 0}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            />
          ) : video.mux_status && video.mux_status !== 'ready' ? (
             <MuxVideoPlayer
              playbackId={null}
              muxStatus={video.mux_status}
              title={video.title}
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

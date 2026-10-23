'use client';

import React, { useRef, useState, useEffect } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import type MuxPlayerElement from '@mux/mux-player';
import { Loader2, AlertCircle, Clock, RotateCcw, RotateCw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MuxVideoPlayerProps {
  playbackId: string | null | undefined;
  muxStatus: string | null | undefined;
  title?: string;
  thumbnailUrl?: string | null;
  errorMessage?: string | null;
  className?: string;
  startTime?: number;
  onTimeUpdate?: (e: Event) => void;
  onEnded?: () => void;
  onLoadedMetadata?: (e: Event) => void;
  onRefreshStatus?: () => void;
}

export function MuxVideoPlayer({
  playbackId,
  muxStatus,
  title,
  thumbnailUrl,
  errorMessage,
  className = '',
  startTime,
  onTimeUpdate,
  onEnded,
  onLoadedMetadata,
  onRefreshStatus,
}: MuxVideoPlayerProps) {
  const playerRef = useRef<MuxPlayerElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSeek = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.max(0, (playerRef.current.currentTime || 0) + seconds);
    }
  };

  const handleManualRefresh = async () => {
    if (onRefreshStatus && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefreshStatus();
      } finally {
        setTimeout(() => setIsRefreshing(false), 800);
      }
    }
  };

  // Determine appropriate poster: custom thumbnail or auto-generated Mux frame
  const posterUrl =
    thumbnailUrl ||
    (playbackId ? `https://image.mux.com/${playbackId}/thumbnail.webp?time=0` : undefined);

  // Video is ready and has a playback ID — render Mux Player
  if (muxStatus === 'ready' && playbackId && isClient) {
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 group ${className}`}>
        <MuxPlayer
          ref={playerRef}
          playbackId={playbackId}
          metadata={{
            video_title: title || 'Educational Video',
          }}
          streamType="on-demand"
          style={{ width: '100%', height: '100%' }}
          accentColor="#10B981"
          poster={posterUrl}
          startTime={startTime}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onLoadedMetadata={onLoadedMetadata}
        />
        {/* Quick jump seek controls for mobile & desktop convenience */}
        <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 flex justify-center gap-8 pointer-events-none z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => handleSeek(-10)}
            className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 backdrop-blur-sm transition-all shadow-md"
            aria-label="Seek backward 10 seconds"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="sr-only">Back 10s</span>
          </button>
          <button
            type="button"
            onClick={() => handleSeek(10)}
            className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 backdrop-blur-sm transition-all shadow-md"
            aria-label="Seek forward 10 seconds"
          >
            <RotateCw className="w-5 h-5" />
            <span className="sr-only">Forward 10s</span>
          </button>
        </div>
      </div>
    );
  }

  // Video is still encoding on Mux
  if (muxStatus === 'processing' || muxStatus === 'uploading') {
    return (
      <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3.5 px-6 max-w-md">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white font-heading">
              {muxStatus === 'uploading' ? 'Video Upload in Progress' : 'Encoding High-Definition Video'}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Mux is generating multi-resolution HLS streams. This usually takes 30–90 seconds. The player will activate automatically once ready.
            </p>
          </div>
          {onRefreshStatus && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="h-8 rounded-xl text-xs bg-neutral-900 border-neutral-700 text-neutral-200 hover:text-white hover:bg-neutral-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking...' : 'Check Status Now'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Video processing errored
  if (muxStatus === 'errored') {
    return (
      <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3.5 px-6 max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white font-heading">Video Processing Failed</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {errorMessage || 'There was an issue encoding this video on Mux. Please check the video format or re-upload.'}
            </p>
          </div>
          {onRefreshStatus && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="h-8 rounded-xl text-xs bg-neutral-900 border-neutral-700 text-neutral-200 hover:text-white hover:bg-neutral-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking...' : 'Re-check Status'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Waiting state
  if (muxStatus === 'waiting' || muxStatus === 'pending') {
    return (
      <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3 px-6 max-w-md">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white font-heading">Waiting for Upload Completion</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              The video upload is being prepared. Playback will begin as soon as processing completes.
            </p>
          </div>
          {onRefreshStatus && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-8 rounded-xl text-xs bg-neutral-900 border-neutral-700 text-neutral-200 hover:text-white hover:bg-neutral-800 mt-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Refresh Status'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // No Mux data at all
  return (
    <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
      <div className="text-center space-y-2 px-4">
        <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-neutral-500" />
        </div>
        <p className="text-xs text-neutral-400">
          Video stream is currently unavailable.
        </p>
      </div>
    </div>
  );
}

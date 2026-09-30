'use client';

import React, { useRef } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import type MuxPlayerElement from '@mux/mux-player';
import { Loader2, AlertCircle, Clock, RotateCcw, RotateCw } from 'lucide-react';

interface MuxVideoPlayerProps {
  playbackId: string | null | undefined;
  muxStatus: string | null | undefined;
  title?: string;
  thumbnailUrl?: string | null;
  className?: string;
  startTime?: number;
  onTimeUpdate?: (e: Event) => void;
  onEnded?: () => void;
  onLoadedMetadata?: (e: Event) => void;
}

export function MuxVideoPlayer({
  playbackId,
  muxStatus,
  title,
  thumbnailUrl,
  className = '',
  startTime,
  onTimeUpdate,
  onEnded,
  onLoadedMetadata,
}: MuxVideoPlayerProps) {
  const playerRef = useRef<MuxPlayerElement>(null);

  const handleSeek = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.max(0, (playerRef.current.currentTime || 0) + seconds);
    }
  };

  // Video is ready and has a playback ID — render Mux Player
  if (muxStatus === 'ready' && playbackId) {
    return (
      <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 ${className}`}>
        <MuxPlayer
          ref={playerRef}
          playbackId={playbackId}
          metadata={{
            video_title: title || 'Video',
          }}
          streamType="on-demand"
          style={{ width: '100%', height: '100%' }}
          accentColor="#4ADE80"
          thumbnailTime={0}
          startTime={startTime}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onLoadedMetadata={onLoadedMetadata}
        />
        {/* Custom 5-second seek controls for mobile accessibility */}
        <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 flex justify-center gap-8 pointer-events-none z-10 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button 
            type="button"
            onClick={() => handleSeek(-5)}
            className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition-all"
            aria-label="Seek backward 5 seconds"
          >
            <RotateCcw className="w-6 h-6" />
            <span className="sr-only">Back 5s</span>
          </button>
          <button 
            type="button"
            onClick={() => handleSeek(5)}
            className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition-all"
            aria-label="Seek forward 5 seconds"
          >
            <RotateCw className="w-6 h-6" />
            <span className="sr-only">Forward 5s</span>
          </button>
        </div>
      </div>
    );
  }

  // Video is still processing
  if (muxStatus === 'processing' || muxStatus === 'uploading') {
    return (
      <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3 px-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Processing Video</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              Mux is encoding your video. This usually takes 1–3 minutes. The page will update automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Video errored
  if (muxStatus === 'errored') {
    return (
      <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3 px-4">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Video Processing Failed</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              There was an error processing this video. Please try uploading again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Waiting state (upload initiated but not yet received by Mux)
  if (muxStatus === 'waiting') {
    return (
      <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3 px-4">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Waiting for Upload</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              The video upload is in progress. Please wait for it to complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No Mux data at all — show placeholder (legacy video or not yet uploaded)
  return (
    <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center ${className}`}>
      <div className="text-center space-y-2 px-4">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-neutral-500" />
        </div>
        <p className="text-xs text-neutral-500">
          Video not available.
        </p>
      </div>
    </div>
  );
}

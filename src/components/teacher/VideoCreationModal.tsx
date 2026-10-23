'use client';

import React, { useState, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import * as UpChunk from '@mux/upchunk';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Video as VideoIcon,
  AlertCircle,
  Loader2,
  GraduationCap,
  Image as ImageIcon,
  FileVideo,
  X,
  RefreshCw,
  CheckCircle2,
  Upload,
  Ban,
} from 'lucide-react';
import { VideoContentItem } from '@/types';
import { TeacherService } from '@/lib/teacher-service';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  classId: string;
  className: string;
  boardId?: string;
  subjectName: string;
  unitId: string;
  unitTitle: string;
  onSuccess: (video: VideoContentItem) => void;
}

type UploadStage =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error';

// Maximum allowed video size: 5GB
const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
// Supported video extensions
const VALID_VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'];

export function VideoCreationModal({
  open,
  onOpenChange,
  channelId,
  classId,
  className,
  boardId,
  subjectName,
  unitId,
  unitTitle,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [lastSavedPublished, setLastSavedPublished] = useState(true);

  // Mux Upload State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoFileSize, setVideoFileSize] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createdVideoId, setCreatedVideoId] = useState<string | null>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  // Refs for upload lifecycle management
  const upchunkUploadRef = useRef<UpChunk.UpChunk | null>(null);
  const createdVideoIdRef = useRef<string | null>(null);
  const currentUploadIdRef = useRef<string | null>(null);

  // Reset all state
  const reset = () => {
    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    setVideoFile(null);
    setVideoFileName('');
    setVideoFileSize(null);
    setIsDemo(false);
    setErrorMsg(null);
    setUploadStage('idle');
    setUploadProgress(0);
    setCreatedVideoId(null);
    setCurrentUploadId(null);
    createdVideoIdRef.current = null;
    currentUploadIdRef.current = null;

    if (upchunkUploadRef.current) {
      try {
        upchunkUploadRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      upchunkUploadRef.current = null;
    }
  };

  // Video File Selection Handler with validation
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5GB, min 1 byte)
    if (file.size <= 0) {
      setErrorMsg('The selected video file appears to be empty.');
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setErrorMsg('Video file exceeds maximum limit of 5GB. Please select a smaller file.');
      return;
    }

    // Validate video type / extension
    const extMatch = VALID_VIDEO_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!file.type.startsWith('video/') && !extMatch) {
      setErrorMsg('Please select a valid video file (MP4, MOV, WEBM, MKV, AVI).');
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFile(file);
    setVideoFileName(file.name);
    setVideoFileSize(`${sizeInMb} MB`);
    setUploadStage('idle');
    setUploadProgress(0);
    setErrorMsg(null);
  };

  // Thumbnail File Upload Handler
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Thumbnail image must be less than 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setThumbnailUrl(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Cancel an active upload
  const handleCancelUpload = useCallback(async () => {
    // 1. Abort UpChunk transfer
    if (upchunkUploadRef.current) {
      try {
        upchunkUploadRef.current.abort();
      } catch {
        // ignore
      }
      upchunkUploadRef.current = null;
    }

    // 2. Cancel upload on Mux
    const uploadId = currentUploadIdRef.current;
    if (uploadId) {
      try {
        await fetch('/api/mux/delete-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mux_upload_id: uploadId }),
        });
      } catch {
        // ignore
      }
    }

    // 3. Remove pending video record from Supabase
    const videoId = createdVideoIdRef.current;
    if (videoId) {
      try {
        await TeacherService.deleteContent('video', videoId);
      } catch {
        // ignore
      }
    }

    // 4. Reset upload states
    setUploadStage('idle');
    setUploadProgress(0);
    setCreatedVideoId(null);
    setCurrentUploadId(null);
    createdVideoIdRef.current = null;
    currentUploadIdRef.current = null;
    setSubmitting(false);
    setErrorMsg('Upload was cancelled.');
  }, []);

  // Upload video using Mux UpChunk (chunked, resumable)
  const uploadWithUpChunk = useCallback((file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const upload = UpChunk.createUpload({
          endpoint: uploadUrl,
          file,
          chunkSize: 5120, // 5MB chunks
        });

        upchunkUploadRef.current = upload;

        upload.on('progress', (progressEvent) => {
          if (progressEvent && typeof progressEvent.detail === 'number') {
            const pct = Math.min(100, Math.max(0, Math.round(progressEvent.detail)));
            setUploadProgress(pct);
          }
        });

        upload.on('success', () => {
          upchunkUploadRef.current = null;
          resolve();
        });

        upload.on('error', (err) => {
          upchunkUploadRef.current = null;
          reject(new Error(err?.detail?.message || 'Network interruption during video upload.'));
        });
      } catch (initErr) {
        reject(initErr);
      }
    });
  }, []);

  const handleSave = async (isPublished: boolean) => {
    if (!title.trim()) {
      setErrorMsg('Please enter a video title.');
      return;
    }

    if (!videoFile) {
      setErrorMsg('Please select a video file to upload.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setLastSavedPublished(isPublished);

    try {
      let activeVideoId = createdVideoIdRef.current;
      let activeVideoRecord: VideoContentItem | null = null;

      // Step 1: Create or reuse video record in Supabase
      if (!activeVideoId) {
        setUploadStage('preparing');

        const created = await TeacherService.createVideo({
          channel_id: channelId,
          class_id: classId,
          board_id: boardId || '',
          subject_name: subjectName,
          unit_id: unitId,
          topic_id: null,
          sub_topic_id: null,
          scope: 'unit',
          title: title.trim(),
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl || null,
          video_url: null,
          duration_seconds: null,
          is_demo: isDemo,
          is_published: isPublished,
          mux_status: 'waiting',
        });

        activeVideoId = created.id;
        activeVideoRecord = created;
        setCreatedVideoId(created.id);
        createdVideoIdRef.current = created.id;
      }

      // Step 2: Request Mux Direct Upload from server
      setUploadStage('preparing');
      const uploadRes = await fetch('/api/mux/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: activeVideoId }),
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create Mux direct upload session.');
      }

      const { upload_url, upload_id } = await uploadRes.json();
      setCurrentUploadId(upload_id);
      currentUploadIdRef.current = upload_id;

      // Step 3: Direct upload to Mux using UpChunk
      setUploadStage('uploading');
      setUploadProgress(0);
      await uploadWithUpChunk(videoFile, upload_url);

      // Step 4: File transfer complete! Mux is now encoding the video
      setUploadStage('processing');

      // Update Supabase status to processing
      await TeacherService.updateVideoMuxStatus(activeVideoId, 'processing');

      // Step 5: Notify parent component with complete record
      const finalItem: VideoContentItem = activeVideoRecord || {
        id: activeVideoId,
        channel_id: channelId,
        class_id: classId,
        board_id: boardId || '',
        subject_name: subjectName,
        unit_id: unitId,
        topic_id: null,
        sub_topic_id: null,
        scope: 'unit',
        title: title.trim(),
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl || null,
        video_url: null,
        duration_seconds: null,
        is_demo: isDemo,
        is_published: isPublished,
        mux_upload_id: upload_id,
        mux_status: 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onSuccess(finalItem);
      reset();
      onOpenChange(false);

    } catch (err: unknown) {
      console.error('[VideoCreationModal] Upload failed:', err);
      setUploadStage('error');
      setErrorMsg((err as Error).message || 'Failed to complete video upload. You can retry safely.');
    } finally {
      setSubmitting(false);
    }
  };

  const isUploading = uploadStage === 'uploading' || uploadStage === 'preparing' || uploadStage === 'processing';

  const getUploadStatusText = () => {
    switch (uploadStage) {
      case 'preparing':
        return 'Requesting secure upload session...';
      case 'uploading':
        return `Transferring file: ${uploadProgress}%`;
      case 'processing':
        return 'Upload complete. Mux is encoding video...';
      case 'ready':
        return 'Video ready ✓';
      case 'error':
        return 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Block closing during upload without explicit cancellation
        if (!isUploading) {
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <VideoIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-heading text-neutral-900 dark:text-white">
                  Add Video Lesson
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Upload directly to Mux for instant adaptive streaming
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Inherited Academic Context Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
            <Badge variant="secondary" className="rounded-lg text-xs bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-bold">
              {className}
            </Badge>
            <span className="text-neutral-400">•</span>
            <Badge className="bg-emerald-600 text-white rounded-lg text-xs font-bold">
              {subjectName}
            </Badge>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-900 dark:text-white font-bold truncate max-w-xs">
              {unitTitle}
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-700 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{errorMsg}</p>
                {uploadStage === 'error' && (
                  <p className="text-[11px] text-red-600 dark:text-red-300">
                    Your details are preserved. Click &quot;Retry Upload&quot; below to continue without duplicate records.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="videoTitle" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Video Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="videoTitle"
              placeholder="e.g. Introduction to Electric Charge & Coulomb's Law"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl h-11 text-sm border-neutral-200 dark:border-neutral-800"
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="videoDesc" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Lesson Description (Optional)
            </Label>
            <Textarea
              id="videoDesc"
              rows={3}
              placeholder="Summary of topics covered, derivations, examples, and homework references..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl text-xs leading-relaxed border-neutral-200 dark:border-neutral-800"
              disabled={isUploading}
            />
          </div>

          {/* Video File Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Video File <span className="text-red-500">*</span>
            </Label>
            {!videoFileName ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 cursor-pointer transition-colors bg-neutral-50/50 dark:bg-neutral-800/30">
                <FileVideo className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Click to Select Video File
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5">
                  MP4, MOV, WEBM, MKV — Direct Mux Resumable Upload (up to 5GB)
                </span>
                <input
                  type="file"
                  accept="video/*,.mkv,.mp4,.mov,.webm"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        uploadStage === 'error'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-600'
                          : uploadStage === 'processing'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'
                          : uploadStage === 'ready'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                      }`}
                    >
                      {uploadStage === 'error' ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : uploadStage === 'ready' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <FileVideo className="w-5 h-5" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {videoFileName}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {videoFileSize}
                        {uploadStage !== 'idle' && ` • ${getUploadStatusText()}`}
                        {uploadStage === 'idle' && ' • Ready to upload'}
                      </p>
                    </div>
                  </div>

                  {!isUploading && (
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replace
                      <input
                        type="file"
                        accept="video/*,.mkv,.mp4,.mov,.webm"
                        className="hidden"
                        onChange={handleVideoSelect}
                      />
                    </label>
                  )}
                </div>

                {/* Upload & Processing Progress Bar */}
                {isUploading && (
                  <div className="space-y-2 p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {uploadStage === 'uploading'
                          ? 'Transferring File to Mux'
                          : uploadStage === 'processing'
                          ? 'Mux Processing & Encoding'
                          : 'Preparing Session'}
                      </span>
                      <span className="text-neutral-500">
                        {uploadStage === 'uploading' ? `${uploadProgress}%` : uploadStage === 'processing' ? 'Encoding' : ''}
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          uploadStage === 'processing'
                            ? 'bg-blue-500 animate-pulse w-full'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: uploadStage === 'processing' ? '100%' : `${uploadProgress}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        {uploadStage === 'preparing' && (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            <span>Creating Direct Upload session with Mux...</span>
                          </>
                        )}
                        {uploadStage === 'uploading' && (
                          <>
                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Uploading video chunks ({uploadProgress}%)...</span>
                          </>
                        )}
                        {uploadStage === 'processing' && (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            <span>File transfer complete. Mux is generating HLS streams...</span>
                          </>
                        )}
                      </div>

                      {uploadStage === 'uploading' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelUpload}
                          className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1 font-semibold"
                        >
                          <Ban className="w-3 h-3" />
                          Cancel Upload
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail File Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Thumbnail (Optional)
            </Label>
            {!thumbnailUrl ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-5 cursor-pointer transition-colors bg-neutral-50/50 dark:bg-neutral-800/30">
                <ImageIcon className="w-7 h-7 text-neutral-400 mb-1.5" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Upload Custom Thumbnail
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5">
                  JPG, PNG or WEBP (If omitted, Mux auto-generates poster)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                  disabled={isUploading}
                />
              </label>
            ) : (
              <div className="relative h-44 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 group">
                <NextImage
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover"
                  unoptimized
                />
                {!isUploading && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-neutral-900 text-xs font-semibold cursor-pointer hover:bg-neutral-100 shadow-md">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl('')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-md"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Free Demo Video Checkbox */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
            <input
              type="checkbox"
              id="isDemo"
              checked={isDemo}
              onChange={(e) => setIsDemo(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
              disabled={isUploading}
            />
            <Label htmlFor="isDemo" className="text-xs font-medium cursor-pointer text-neutral-700 dark:text-neutral-300">
              <span className="font-bold text-neutral-900 dark:text-white block">
                Free Demo Lesson
              </span>
              Allow prospective students to preview this lesson without a paid subscription.
            </Label>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between sm:justify-between bg-neutral-50/50 dark:bg-neutral-900">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (uploadStage === 'uploading') {
                handleCancelUpload();
              } else {
                reset();
                onOpenChange(false);
              }
            }}
            disabled={uploadStage === 'preparing'}
            className="rounded-xl text-xs font-semibold"
          >
            {uploadStage === 'uploading' ? 'Cancel Upload' : 'Close'}
          </Button>

          <div className="flex items-center gap-2">
            {uploadStage === 'error' ? (
              <Button
                type="button"
                onClick={() => handleSave(lastSavedPublished)}
                disabled={submitting}
                className="rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry Upload
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={submitting || isUploading}
                  className="rounded-xl text-xs font-semibold"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={submitting || isUploading}
                  className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      {getUploadStatusText() || 'Uploading...'}
                    </>
                  ) : (
                    'Upload & Publish'
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

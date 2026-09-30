'use client';

import React, { useState, useRef, useCallback } from 'react';
import NextImage from 'next/image';
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

  // Mux Upload State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoFileSize, setVideoFileSize] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createdVideoId, setCreatedVideoId] = useState<string | null>(null);

  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Reset form
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
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  };

  // Video File Selection Handler
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFile(file);
    setVideoFileName(file.name);
    setVideoFileSize(`${sizeInMb} MB`);
    setUploadStage('idle');
    setUploadProgress(0);
    setErrorMsg(null);
  };

  // Thumbnail File Upload Handler (FileReader base64 preview)
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

  // Upload video directly to Mux via XHR (for progress tracking)
  const uploadToMux = useCallback(async (file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(pct);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during video upload.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled.'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.send(file);
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

    try {
      // Step 1: Create the video record in Supabase first (to get the ID for passthrough)
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

      setCreatedVideoId(created.id);

      // Step 2: Create Mux Direct Upload (server-side API call)
      const uploadRes = await fetch('/api/mux/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: created.id }),
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create upload session.');
      }

      const { upload_url, upload_id } = await uploadRes.json();

      // Step 3: Save the upload_id to Supabase
      await TeacherService.updateVideoMuxUploadId(created.id, upload_id);

      // Step 4: Upload video directly to Mux
      setUploadStage('uploading');
      await uploadToMux(videoFile, upload_url);

      // Step 5: Upload complete — Mux will now process the video
      setUploadStage('processing');

      // Update mux_status in Supabase
      await TeacherService.updateVideoMuxStatus(created.id, 'processing');

      // Notify parent and close
      onSuccess({
        ...created,
        mux_upload_id: upload_id,
        mux_status: 'processing',
      });
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to upload video', err);
      setUploadStage('error');
      setErrorMsg((err as Error).message || 'Failed to upload video. Please try again.');

      // If we created a video record but upload failed, clean it up
      if (createdVideoId) {
        try {
          await TeacherService.deleteContent('video', createdVideoId);
        } catch {
          // Ignore cleanup errors
        }
        setCreatedVideoId(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isUploading = uploadStage === 'uploading' || uploadStage === 'preparing' || uploadStage === 'processing';

  const getUploadStatusText = () => {
    switch (uploadStage) {
      case 'preparing': return 'Preparing upload...';
      case 'uploading': return `Uploading ${uploadProgress}%`;
      case 'processing': return 'Processing video...';
      case 'ready': return 'Video ready ✓';
      case 'error': return 'Upload failed';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isUploading) onOpenChange(o); }}>
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
                  Upload a lesson directly into this unit
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
              <div className="flex-1">{errorMsg}</div>
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
              onChange={e => setTitle(e.target.value)}
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
              onChange={e => setDescription(e.target.value)}
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
                  MP4, MOV, WEBM, MKV — Uploads directly to Mux
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
              </label>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      uploadStage === 'error'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-600'
                        : uploadStage === 'ready'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                    }`}>
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
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoSelect}
                      />
                    </label>
                  )}
                </div>

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          uploadStage === 'processing'
                            ? 'bg-amber-500 animate-pulse w-full'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: uploadStage === 'processing' ? '100%' : `${uploadProgress}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                      {uploadStage === 'preparing' && (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Preparing upload session...</span>
                        </>
                      )}
                      {uploadStage === 'uploading' && (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>Uploading to Mux... {uploadProgress}%</span>
                        </>
                      )}
                      {uploadStage === 'processing' && (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Upload complete — Mux is processing your video...</span>
                        </>
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
              Thumbnail
            </Label>
            {!thumbnailUrl ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 cursor-pointer transition-colors bg-neutral-50/50 dark:bg-neutral-800/30">
                <ImageIcon className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  Upload Thumbnail Image
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5">
                  JPG, PNG or WEBP (Max 3MB)
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
              onChange={e => setIsDemo(e.target.checked)}
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
              reset();
              onOpenChange(false);
            }}
            disabled={isUploading}
            className="rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

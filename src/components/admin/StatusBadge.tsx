import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  type?: 'account' | 'publication' | 'video' | 'general';
}

export function StatusBadge({ status, type = 'general' }: StatusBadgeProps) {
  const s = (status || 'unknown').toLowerCase();

  if (type === 'account') {
    const isSuspended = s === 'suspended';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          isSuspended
            ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isSuspended ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        />
        {isSuspended ? 'Suspended' : 'Active'}
      </span>
    );
  }

  if (type === 'publication') {
    const isPublished = s === 'published' || s === 'true';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          isPublished
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isPublished ? 'bg-emerald-600' : 'bg-neutral-400'
          }`}
        />
        {isPublished ? 'Published' : 'Draft'}
      </span>
    );
  }

  if (type === 'video') {
    const isReady = s === 'ready';
    const isProcessing = s === 'processing' || s === 'uploading' || s === 'waiting';
    const isErrored = s === 'errored' || s === 'error';

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          isReady
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : isProcessing
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
            : isErrored
            ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800'
            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isReady ? 'bg-emerald-600' : isProcessing ? 'bg-amber-600' : 'bg-red-600'
          }`}
        />
        {isReady ? 'Ready' : isProcessing ? 'Processing' : isErrored ? 'Errored' : s}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 capitalize">
      {status || 'N/A'}
    </span>
  );
}

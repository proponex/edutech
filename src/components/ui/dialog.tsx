'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { X } from 'lucide-react';

// Context for compound Dialog components
interface DialogContextType {
  open: boolean;
  onClose: () => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

// Unified Dialog Props
export interface DialogProps {
  // Simple modal props (Phase 1/2/3 admin components)
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  // Compound modal props (Phase 4 modals)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({
  isOpen,
  onClose,
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = 'md',
}: DialogProps) {
  const isCurrentlyOpen = open !== undefined ? open : Boolean(isOpen);

  const handleClose = React.useCallback(() => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  }, [onOpenChange, onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isCurrentlyOpen) {
        handleClose();
      }
    }
    if (isCurrentlyOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isCurrentlyOpen, handleClose]);

  if (!isCurrentlyOpen) return null;

  // If title is provided, render classic simple Dialog
  if (title !== undefined) {
    const maxWidths = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-2xl',
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
        <div
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
        <div
          className={`relative w-full ${maxWidths[maxWidth]} max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden`}
          role="dialog"
          aria-modal="true"
        >
          <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 sm:px-6 sm:py-5 border-b border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 z-10">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 sm:px-6 sm:py-5 min-h-0 overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise render compound context wrapper
  return (
    <DialogContext.Provider value={{ open: isCurrentlyOpen, onClose: handleClose }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
        <div
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
        {children}
      </div>
    </DialogContext.Provider>
  );
}

export function DialogContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(DialogContext);
  return (
    <div
      className={`relative w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {ctx && (
        <button
          type="button"
          onClick={ctx.onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`shrink-0 border-b border-neutral-100 dark:border-neutral-800/80 z-10 ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className={`text-lg font-bold text-neutral-900 dark:text-white leading-tight ${className}`}>
      {children}
    </h3>
  );
}

export function DialogDescription({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={`text-xs text-neutral-500 dark:text-neutral-400 mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function DialogFooter({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`shrink-0 border-t border-neutral-100 dark:border-neutral-800/80 ${className}`}>
      {children}
    </div>
  );
}

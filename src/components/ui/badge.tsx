import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'warning' | 'error' | 'outline';
}

export function Badge({
  className = '',
  variant = 'primary',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    primary:
      'bg-primary-100 dark:bg-primary-950/80 text-primary-900 dark:text-primary-300 border-primary-300 dark:border-primary-800',
    secondary:
      'bg-secondary-100 dark:bg-secondary-950/80 text-secondary-900 dark:text-secondary-300 border-secondary-300 dark:border-secondary-800',
    accent:
      'bg-accent-100 dark:bg-accent-950/80 text-accent-900 dark:text-accent-300 border-accent-300 dark:border-accent-800',
    neutral:
      'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700',
    success:
      'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    warning:
      'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    error:
      'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    outline:
      'bg-transparent text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

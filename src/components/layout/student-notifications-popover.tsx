'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  ExternalLink,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export interface NotificationRecord {
  id: string;
  type: 'lesson' | 'announcement' | 'live' | 'parent' | 'subscription' | 'quiz' | 'system';
  icon: string;
  title: string;
  message: string;
  created_at: string;
  link: string;
  tag: string;
  is_read: boolean;
}

interface StudentNotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function StudentNotificationsPopover({
  isOpen,
  onClose,
  onUnreadCountChange,
}: StudentNotificationsPopoverProps) {
  const [viewMode, setViewMode] = useState<'recent' | 'all'>('recent');
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/student/notifications?page=${targetPage}&limit=10`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setPage(data.page || targetPage);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setUnreadCount(data.unreadCount || 0);
          onUnreadCountChange?.(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Error fetching student notifications:', err);
      } finally {
        setLoading(false);
      }
    },
    [onUnreadCountChange]
  );

  // Fetch when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(page);
    }
  }, [isOpen, page, fetchNotifications]);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUnreadCount(0);
    onUnreadCountChange?.(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

    try {
      await fetch('/api/student/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
    } catch {
      // Keep optimistic UI
    }
  };

  const handlePageChange = (targetPage: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return;
    setPage(targetPage);
    fetchNotifications(targetPage);
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffMs = now - past;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  if (!isOpen) return null;

  const displayList = viewMode === 'recent' ? notifications.slice(0, 4) : notifications;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Student Notifications and Updates"
      onClick={(e) => e.stopPropagation()}
      className={`absolute right-0 mt-3 rounded-3xl bg-white/95 dark:bg-[#1A1429]/95 border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(30,16,53,0.18)] p-4 sm:p-5 z-[100] animate-in fade-in zoom-in-95 backdrop-blur-2xl text-[#1E1035] transition-all duration-300 ${
        viewMode === 'all' ? 'w-[90vw] sm:w-[480px] max-w-[500px]' : 'w-80 sm:w-96'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#EEE8FF] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {viewMode === 'all' && (
            <button
              type="button"
              onClick={() => setViewMode('recent')}
              className="p-1 rounded-lg hover:bg-[#EEE8FF] text-[#6244A6] transition-colors cursor-pointer"
              title="Back to Recent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-[#EEE8FF] text-[#6244A6] flex items-center justify-center shrink-0 shadow-2xs font-bold">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-[#1E1035] truncate leading-tight">
              {viewMode === 'all' ? 'All Updates' : 'Notifications'}
            </h3>
            <span className="text-[10px] font-semibold text-[#5F5875]">
              {total > 0 ? `${total} updates available` : 'Stay informed on lessons & tests'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-[#6244A6] hover:text-[#130924] px-2 py-1 rounded-lg hover:bg-[#EEE8FF] transition-colors flex items-center gap-1 cursor-pointer"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#EEE8FF] text-[#5F5875] hover:text-[#130924] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Switcher Toggle Pills */}
      <div className="pt-2.5 pb-2 flex items-center justify-between gap-2">
        <div className="inline-flex p-1 rounded-xl bg-[#FAF9FF] border border-[#EEE8FF] text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('recent')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'recent'
                ? 'bg-white text-[#130924] shadow-2xs font-extrabold border border-[#DCCFFF]'
                : 'text-[#5F5875] hover:text-[#130924]'
            }`}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('all');
              fetchNotifications(page);
            }}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'all'
                ? 'bg-[#6244A6] text-white shadow-2xs font-extrabold'
                : 'text-[#5F5875] hover:text-[#130924]'
            }`}
          >
            <span>All Updates</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                viewMode === 'all' ? 'bg-white/20 text-white' : 'bg-[#EEE8FF] text-[#6244A6]'
              }`}
            >
              {total}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => fetchNotifications(page)}
          className="p-1.5 rounded-lg text-[#5F5875] hover:text-[#6244A6] hover:bg-[#EEE8FF] transition-colors cursor-pointer"
          title="Refresh updates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6244A6]' : ''}`} />
        </button>
      </div>

      {/* Notifications List Body */}
      <div
        className={`space-y-2.5 overflow-y-auto pr-1 transition-all ${
          viewMode === 'all' ? 'max-h-[50vh] sm:max-h-[55vh]' : 'max-h-72'
        }`}
      >
        {loading && notifications.length === 0 ? (
          <div className="py-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-[#F8F6FF] animate-pulse" />
            ))}
          </div>
        ) : displayList.length > 0 ? (
          displayList.map((item) => (
            <Link
              key={item.id}
              href={item.link || '/student'}
              onClick={onClose}
              className={`block p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 group relative ${
                item.is_read
                  ? 'bg-white/80 border-[#EEE8FF] hover:bg-[#FAF9FF] hover:border-[#DCCFFF]'
                  : 'bg-gradient-to-r from-[#F8F6FF] to-white border-[#DCCFFF] hover:border-[#6244A6] shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#EEE8FF] shadow-2xs flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF] truncate max-w-[150px]">
                      {item.tag}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold text-[#5F5875]">
                        {formatRelativeTime(item.created_at)}
                      </span>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#6244A6] ring-2 ring-white" />
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs sm:text-sm font-extrabold text-[#1E1035] group-hover:text-[#6244A6] transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#5F5875] mt-0.5 leading-relaxed line-clamp-2">
                    {item.message}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="py-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#EEE8FF] text-[#6244A6] flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-[#1E1035]">No notifications at this time</p>
            <p className="text-[11px] text-[#5F5875]">
              You are all caught up with your academic classroom updates.
            </p>
          </div>
        )}
      </div>

      {/* Footer / Pagination Section */}
      <div className="pt-3 mt-1 border-t border-[#EEE8FF]">
        {viewMode === 'recent' ? (
          <button
            type="button"
            onClick={() => {
              setViewMode('all');
              fetchNotifications(1);
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#6244A6] hover:text-[#130924] bg-[#EEE8FF]/70 hover:bg-[#EEE8FF] border border-[#DCCFFF] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs group"
          >
            <span>View All Updates ({total})</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          /* Pagination Controls at Bottom of Popup (10 items per page, 1 2 3 ... 10) */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <span className="text-[11px] font-semibold text-[#5F5875]">
              Showing {Math.min((page - 1) * 10 + 1, total)}–{Math.min(page * 10, total)} of {total} updates
            </span>

            <div className="flex items-center gap-1">
              {/* Previous Page Arrow */}
              <button
                type="button"
                onClick={(e) => handlePageChange(page - 1, e)}
                disabled={page <= 1 || loading}
                className="w-7 h-7 rounded-lg border border-[#DCCFFF] bg-white hover:bg-[#EEE8FF] disabled:opacity-35 disabled:cursor-not-allowed transition-all text-[#1E1035] flex items-center justify-center cursor-pointer shadow-2xs"
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Numbers 1, 2, 3 ... N */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={(e) => handlePageChange(p, e)}
                  disabled={loading}
                  className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    page === p
                      ? 'font-black bg-[#6244A6] text-white shadow-xs ring-2 ring-[#6244A6]/20 scale-105'
                      : 'font-semibold bg-white hover:bg-[#EEE8FF] text-[#1E1035] hover:text-[#130924] border border-[#DCCFFF]'
                  }`}
                  aria-label={`Go to page ${p}`}
                  aria-current={page === p ? 'page' : undefined}
                >
                  {p}
                </button>
              ))}

              {/* Next Page Arrow */}
              <button
                type="button"
                onClick={(e) => handlePageChange(page + 1, e)}
                disabled={page >= totalPages || loading}
                className="w-7 h-7 rounded-lg border border-[#DCCFFF] bg-white hover:bg-[#EEE8FF] disabled:opacity-35 disabled:cursor-not-allowed transition-all text-[#1E1035] flex items-center justify-center cursor-pointer shadow-2xs"
                title="Next page"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


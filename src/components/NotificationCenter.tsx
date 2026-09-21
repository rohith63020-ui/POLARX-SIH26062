/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification, NotificationSeverity, NotificationCategory } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const {
    notifications,
    unreadCount,
    criticalCount,
    isLiveConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL' | 'LOGISTICS' | 'EMERGENCY'>('ALL');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'UNREAD') return !item.isRead;
    if (activeFilter === 'CRITICAL') return item.severity === 'CRITICAL';
    if (activeFilter === 'LOGISTICS')
      return (
        item.category === 'INVENTORY' ||
        item.category === 'CARGO' ||
        item.category === 'ASSET' ||
        item.category === 'RESUPPLY'
      );
    if (activeFilter === 'EMERGENCY')
      return item.category === 'EMERGENCY' || item.severity === 'CRITICAL';
    return true;
  });

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: 'crisis_alert',
          bg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',
          dot: 'bg-red-500',
        };
      case 'WARNING':
        return {
          icon: 'warning',
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500',
        };
      case 'SUCCESS':
        return {
          icon: 'task_alt',
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      default:
        return {
          icon: 'info',
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-[#a4c9ff] border-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500',
        };
    }
  };

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    if (item.targetTab) {
      onNavigateTab(item.targetTab);
      onClose();
    }
  };

  return (
    <div
      ref={panelRef}
      id="notificationCenterPanel"
      className="absolute right-0 top-11 sm:top-12 w-[calc(100vw-24px)] sm:w-[420px] max-w-[440px] bg-white dark:bg-[#0a1d2e] border-2 border-neutral-900 dark:border-[#a4c9ff] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[82vh] animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="p-3.5 bg-neutral-50 dark:bg-[#0f2132] border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <span className="material-symbols-outlined text-neutral-900 dark:text-[#a4c9ff] text-[20px]">
              notifications_active
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-[#d2e4fc]">
                Tactical Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <p className="text-[10px] text-neutral-500 dark:text-[#c1c6d3]">
              Real-time station telemetry & operational alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              title="Mark all notifications as read"
              className="px-2 py-1 rounded-lg bg-neutral-200/80 hover:bg-neutral-300 dark:bg-[#1a2b3d] dark:hover:bg-[#253648] text-[10px] font-headline font-bold text-neutral-800 dark:text-[#d2e4fc] transition-colors"
            >
              Mark Read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            aria-label="Close notification center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-2 bg-neutral-100/60 dark:bg-[#071828] border-b border-neutral-200 dark:border-[#253648] overflow-x-auto no-scrollbar text-[10.5px] font-headline">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
            activeFilter === 'ALL'
              ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8] dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-200 dark:hover:bg-[#0f2132]'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setActiveFilter('UNREAD')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all flex items-center gap-1 ${
            activeFilter === 'UNREAD'
              ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8] dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-200 dark:hover:bg-[#0f2132]'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('CRITICAL')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all flex items-center gap-1 ${
            activeFilter === 'CRITICAL'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
          }`}
        >
          <span>Urgent</span>
          {criticalCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveFilter('LOGISTICS')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
            activeFilter === 'LOGISTICS'
              ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8] dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-200 dark:hover:bg-[#0f2132]'
          }`}
        >
          Logistics
        </button>

        <button
          onClick={() => setActiveFilter('EMERGENCY')}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
            activeFilter === 'EMERGENCY'
              ? 'bg-neutral-900 text-white dark:bg-[#0b5ea8] dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-[#c1c6d3] hover:bg-neutral-200 dark:hover:bg-[#0f2132]'
          }`}
        >
          SAR / SOS
        </button>
      </div>

      {/* Notifications Scroll List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[50vh] divide-y divide-neutral-100 dark:divide-[#1a2b3d]/50">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <span className="material-symbols-outlined text-[32px] text-neutral-400 dark:text-[#a4c9ff]/60">
              notifications_paused
            </span>
            <p className="font-headline text-xs font-bold text-neutral-900 dark:text-[#d2e4fc]">
              No {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} notifications
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] max-w-xs mx-auto">
              Station subsystems and polar convoys operating within normal baseline limits.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const badge = getSeverityBadge(item.severity);
            const isUnread = !item.isRead;

            return (
              <div
                key={item.id}
                id={`notificationItem-${item.id}`}
                className={`pt-2 first:pt-0 group relative p-2.5 rounded-xl border transition-all ${
                  isUnread
                    ? 'bg-neutral-50/80 hover:bg-neutral-100/90 dark:bg-[#0f2132]/90 dark:hover:bg-[#0f2132] border-neutral-300 dark:border-[#a4c9ff]/40 shadow-xs'
                    : 'bg-transparent hover:bg-neutral-50 dark:hover:bg-[#0f2132]/40 border-transparent text-neutral-600 dark:text-[#c1c6d3]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Severity Icon */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${badge.bg}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {badge.icon}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div
                    onClick={() => handleNotificationClick(item)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc]">
                          {item.category}
                        </span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                        )}
                      </div>
                      <span className="font-mono text-[9.5px] text-neutral-500 dark:text-[#c1c6d3] shrink-0">
                        {item.timestamp}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-headline font-bold leading-tight ${
                        isUnread
                          ? 'text-neutral-900 dark:text-[#d2e4fc]'
                          : 'text-neutral-700 dark:text-[#c1c6d3]'
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-neutral-600 dark:text-[#c1c6d3] mt-0.5 leading-relaxed">
                      {item.message}
                    </p>

                    {item.targetTab && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-headline font-bold text-blue-600 dark:text-[#a4c9ff] group-hover:underline">
                        <span>Open {item.targetTab.toUpperCase()} console</span>
                        <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Controls */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isUnread) markAsRead(item.id);
                      }}
                      title={isUnread ? 'Mark as read' : 'Read'}
                      className={`p-1 rounded-md transition-colors ${
                        isUnread
                          ? 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'text-neutral-300 dark:text-neutral-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {isUnread ? 'mark_chat_read' : 'check'}
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      title="Dismiss notification"
                      className="p-1 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2.5 bg-neutral-50 dark:bg-[#0f2132] border-t border-neutral-200 dark:border-[#253648] flex items-center justify-between text-[10px] font-mono text-neutral-500 dark:text-[#c1c6d3]">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span>{isLiveConnected ? 'REAL-TIME CLOUD RELAY' : 'OFFLINE STORE: ACTIVE'}</span>
        </span>
        {notifications.length > 0 && (
          <button
            onClick={() => clearAll()}
            className="text-red-600 dark:text-red-400 font-bold hover:underline"
          >
            Clear All History
          </button>
        )}
      </div>
    </div>
  );
};

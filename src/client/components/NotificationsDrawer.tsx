import React, { useEffect, useState } from 'react';
import { X, Bell, Check, CheckCheck, Sparkles, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { NotificationItem, NotificationCategory } from '../../types';
import { authFetch } from '../utils/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnreadCount?: (count: number) => void;
}

export const NotificationsDrawer: React.FC<Props> = ({ isOpen, onClose, onUpdateUnreadCount }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        const unread = (data.notifications || []).filter((n: NotificationItem) => !n.is_read).length;
        if (onUpdateUnreadCount) onUpdateUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      const remainingUnread = notifications.filter(n => n.id !== id && !n.is_read).length;
      if (onUpdateUnreadCount) onUpdateUnreadCount(remainingUnread);
    } catch (e) {
      console.error('Failed to mark read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authFetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onUpdateUnreadCount) onUpdateUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  };

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'New Content':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'Update':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-blue-600" />,
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'Important':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'General':
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-stone-600" />,
          classes: 'bg-stone-100 text-stone-700 border-stone-200',
        };
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#830e0d]/10 text-[#830e0d] rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Notifications</h3>
              <p className="text-xs text-stone-500">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-[#830e0d] hover:text-[#6a0b0a] px-2.5 py-1.5 rounded-lg hover:bg-[#830e0d]/5 transition-colors flex items-center gap-1.5"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-stone-400 text-sm">
              Loading updates...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-stone-700">No notifications yet</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Announcements, study updates, and important notices will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const badge = getCategoryBadge(notif.category);
              const isExpanded = expandedId === notif.id;

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : notif.id);
                    if (!notif.is_read) {
                      markAsRead(notif.id);
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    notif.is_read
                      ? 'bg-white border-stone-200/80 hover:border-stone-300'
                      : 'bg-amber-50/40 border-amber-200 shadow-xs hover:border-amber-300'
                  }`}
                >
                  {!notif.is_read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#830e0d]" />
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.classes}`}>
                      {badge.icon}
                      {notif.category}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {new Date(notif.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <h4 className={`text-sm font-bold text-stone-900 leading-snug mb-1 ${!notif.is_read ? 'text-[#830e0d]' : ''}`}>
                    {notif.title}
                  </h4>

                  <p className={`text-xs text-stone-600 leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                    {notif.message}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-stone-400 font-medium">
                      {isExpanded ? 'Click to collapse' : 'Click to read full'}
                    </span>
                    {notif.is_read && (
                      <span className="text-stone-400 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Read
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

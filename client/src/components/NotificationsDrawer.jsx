import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCheck, Clock, CheckCircle2, AlertTriangle, Star } from 'lucide-react';

export default function NotificationsDrawer({
  isOpen,
  onClose,
  currentUser,
  onNavigate
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?user_id=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'POST' });
      }
      if (notif.link && onNavigate) {
        onNavigate(notif.link);
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-600 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Notifications
              </h2>
              <span className="text-xs text-slate-400">
                {currentUser?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/40 flex items-center gap-1 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold">No notifications yet</p>
              <p className="text-xs text-slate-400 mt-1">
                You'll receive updates when surplus food is posted, claimed, or collected.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    n.is_read
                      ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 opacity-80'
                      : 'bg-white dark:bg-slate-900 border-brand-200 dark:border-brand-800/60 shadow-sm ring-1 ring-brand-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="capitalize font-semibold text-brand-600 dark:text-brand-400">
                      {n.type}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

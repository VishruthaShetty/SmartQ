import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Volume2,
  Check,
  ShieldAlert,
  Sparkles,
  Inbox,
  User,
  ExternalLink,
} from 'lucide-react';
import { AppNotification } from '../../types/queue';
import {
  filterNotificationsForRole,
  markNotificationRead,
  markAllNotificationsRead,
  getStoredSettings,
  saveSettings,
} from '../../services/storage';

interface NotificationBellProps {
  notifications: AppNotification[];
  role: 'patient' | 'doctor' | 'operator' | 'all';
  patientToken?: string;
  doctorId?: string;
  label?: string;
  compact?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  role,
  patientToken,
  doctorId,
  label,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Filter notifications strictly for this role / context
  const filteredNotifs = useMemo(() => {
    return filterNotificationsForRole(notifications, role, patientToken, doctorId);
  }, [notifications, role, patientToken, doctorId]);

  const unreadCount = filteredNotifs.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setBrowserPerm(res);
        if (res === 'granted') {
          const settings = getStoredSettings();
          saveSettings({ ...settings, browserNotificationsEnabled: true });
        }
      } catch (e) {
        console.warn('Browser notification permission error', e);
      }
    }
  };

  const contextTitle = useMemo(() => {
    if (role === 'patient') {
      return patientToken ? `Notifications · ${patientToken}` : 'Patient Notifications';
    }
    if (role === 'doctor') {
      return 'Physician Alerts';
    }
    if (role === 'operator') {
      return 'Hospital Operations Alerts';
    }
    return 'Notification Center';
  }, [role, patientToken]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={label || `${contextTitle} (${unreadCount} unread)`}
        className={`relative flex items-center gap-1.5 rounded-lg border transition-all ${
          compact
            ? 'p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
            : 'px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200/90'
        }`}
      >
        <Bell className="w-3.5 h-3.5 text-slate-600" />
        {label && <span className="text-xs">{label}</span>}
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-92 bg-white rounded-xl shadow-xl border border-slate-200 py-2.5 z-50 text-xs animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span>{contextTitle}</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {role === 'patient'
                  ? 'Personal queue position and turn callouts'
                  : role === 'doctor'
                  ? 'Clinical alerts and patient chamber calls'
                  : 'Queue empty events and hospital triage alerts'}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  markAllNotificationsRead((n) =>
                    filterNotificationsForRole([n], role, patientToken, doctorId).length > 0
                  )
                }
                className="text-[11px] text-teal-700 hover:underline font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <Inbox className="w-6 h-6 mx-auto text-slate-300" />
                <div className="text-xs">No notifications for this view</div>
                <div className="text-[10px] text-slate-400">
                  {role === 'patient'
                    ? 'You will receive notifications when your turn approaches or changes.'
                    : 'Real-time queue events will appear here.'}
                </div>
              </div>
            ) : (
              filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !n.read ? 'bg-teal-50/40 border-l-2 border-teal-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-semibold text-xs ${
                          n.type === 'queue_empty'
                            ? 'text-amber-800'
                            : n.type === 'emergency'
                            ? 'text-rose-700'
                            : n.type === 'turn_alert'
                            ? 'text-emerald-800 font-bold'
                            : n.type === 'next_in_line'
                            ? 'text-teal-800 font-bold'
                            : 'text-slate-800'
                        }`}
                      >
                        {n.title}
                      </span>
                      {n.tokenNumber && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {n.tokenNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(n.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                  {(n.doctorName || n.roomNumber || n.estimatedMinutes !== undefined) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      {n.doctorName && <span>Dr: {n.doctorName}</span>}
                      {n.roomNumber && <span>· Room: {n.roomNumber}</span>}
                      {n.estimatedMinutes !== undefined && (
                        <span>· Est. Wait: ~{n.estimatedMinutes}m</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Browser Desktop Notifications Opt-in Toggle */}
          <div className="px-3 pt-2 pb-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Browser Desktop Alerts:</span>
            {browserPerm === 'granted' ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Enabled
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestBrowserPermission}
                className="text-teal-700 font-semibold hover:underline"
              >
                Enable Desktop Alerts
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

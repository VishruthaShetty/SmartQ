import React, { useState, useEffect } from 'react';
import { AppNotification } from '../../types/queue';
import { subscribeToToasts } from '../../services/storage';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  X,
  Volume2,
  ShieldAlert,
  Inbox,
  User,
} from 'lucide-react';

interface ActiveToast extends AppNotification {
  toastId: string;
}

interface NotificationToastContainerProps {
  onNavigateToToken?: (token: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  onNavigateToToken,
}) => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((notif) => {
      const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const activeItem: ActiveToast = { ...notif, toastId };

      setToasts((prev) => [activeItem, ...prev.slice(0, 3)]); // Keep max 4 toasts visible

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.toastId !== toastId));
      }, 6000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismiss = (toastId: string) => {
    setToasts((current) => current.filter((t) => t.toastId !== toastId));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className={`pointer-events-auto rounded-xl border p-4 shadow-xl text-xs transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
            toast.type === 'queue_empty'
              ? 'bg-amber-950 text-amber-50 border-amber-600'
              : toast.type === 'emergency'
              ? 'bg-rose-950 text-rose-50 border-rose-600'
              : toast.type === 'turn_alert'
              ? 'bg-emerald-950 text-emerald-50 border-emerald-500'
              : toast.type === 'next_in_line'
              ? 'bg-teal-950 text-teal-50 border-teal-500'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 shrink-0">
                {toast.type === 'emergency' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                ) : toast.type === 'queue_empty' ? (
                  <Inbox className="w-4 h-4 text-amber-400" />
                ) : (
                  <Bell className="w-4 h-4 text-teal-400 animate-bounce" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white">{toast.title}</span>
                  {toast.tokenNumber && (
                    <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-white/20 text-white">
                      {toast.tokenNumber}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-300 leading-snug">{toast.message}</p>
                {toast.tokenNumber && onNavigateToToken && (
                  <button
                    onClick={() => {
                      onNavigateToToken(toast.tokenNumber!);
                      handleDismiss(toast.toastId);
                    }}
                    className="mt-2 text-[11px] font-semibold text-teal-300 hover:text-white underline block"
                  >
                    View Token Status &rarr;
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDismiss(toast.toastId)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors shrink-0"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

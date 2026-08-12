import React, { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useUiStore, ToastItem, ToastKind } from '../store/useUiStore';

const KIND_META: Record<
  ToastKind,
  { icon: React.ElementType; ring: string; iconColor: string; bar: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-emerald-400/30 border-emerald-400/50',
    iconColor: 'text-emerald-400',
    bar: 'bg-emerald-400',
  },
  info: {
    icon: Info,
    ring: 'ring-cyan-400/30 border-cyan-400/50',
    iconColor: 'text-cyan-400',
    bar: 'bg-cyan-400',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'ring-amber-400/30 border-amber-400/50',
    iconColor: 'text-amber-400',
    bar: 'bg-amber-400',
  },
  error: {
    icon: XCircle,
    ring: 'ring-rose-400/30 border-rose-400/50',
    iconColor: 'text-rose-400',
    bar: 'bg-rose-400',
  },
};

const ToastCard: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const dismissToast = useUiStore((s) => s.dismissToast);
  const meta = KIND_META[toast.kind];
  const Icon = meta.icon;

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, dismissToast]);

  return (
    <div
      dir="rtl"
      className={`glass-strong ${meta.ring} ring-4 rounded-2xl p-3.5 shadow-2xl relative overflow-hidden animate-toast-in pointer-events-auto`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${meta.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[var(--ink)] leading-tight">{toast.title}</h4>
          {toast.message && (
            <p className="text-xs text-[var(--ink-dim)] mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => dismissToast(toast.id)}
          className="shrink-0 p-1 -mt-1 -ml-1 rounded-lg text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--panel-3)]/60 transition-colors"
          aria-label="סגור התראה"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-[var(--panel-3)]/40">
        <div
          className={`h-full ${meta.bar} toast-progress-bar`}
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      </div>
    </div>
  );
};

export const ToastHost: React.FC = () => {
  const toasts = useUiStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-6 md:right-auto md:w-[360px] z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useToastStore } from '../lib/toastStore';

function ToastIcon({ type }) {
  switch (type) {
    case 'payment':
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      );
    case 'success':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case 'warning':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    case 'info':
    default:
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast]);

  const getBorderColor = () => {
    switch (toast.type) {
      case 'payment':
        return 'border-emerald-500/40 bg-[#0c1a14] text-emerald-100 shadow-2xl shadow-emerald-950/40';
      case 'success':
        return 'border-emerald-500/30 bg-[#0f1712] text-emerald-100 shadow-emerald-950/20';
      case 'error':
        return 'border-rose-500/30 bg-[#1a0f12] text-rose-100 shadow-rose-950/20';
      case 'warning':
        return 'border-amber-500/30 bg-[#1a140b] text-amber-100 shadow-amber-950/20';
      case 'info':
      default:
        return 'border-orange-500/30 bg-[#17110c] text-neutral-100 shadow-orange-950/20';
    }
  };

  const getProgressBarColor = () => {
    switch (toast.type) {
      case 'payment':
      case 'success':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-rose-500';
      case 'warning':
        return 'bg-amber-500';
      case 'info':
      default:
        return 'bg-orange-500';
    }
  };

  if (toast.type === 'payment') {
    const details = toast.paymentDetails || {};
    return (
      <div
        role="alert"
        className={`pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-right-3 ${getBorderColor()}`}
      >
        <div className="flex items-start gap-3">
          <ToastIcon type="payment" />
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                ✓ Payment Confirmed
              </span>
              {details.transactionId && (
                <span className="text-[10px] font-mono text-emerald-500/70 truncate max-w-[120px]">
                  {details.transactionId}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm font-bold tracking-tight text-neutral-50">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-300 break-words">{toast.description}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#06120d] border border-emerald-500/25 p-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <span>{details.planName || 'Pro Growth'}</span>
                <span className="text-emerald-500/40">•</span>
                <span className="font-mono text-emerald-200">{details.currencySymbol || '€'}{details.amount || 79}/mo</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Stripe Active
              </span>
            </div>

            {toast.action && (
              <div className="mt-2.5">
                <button
                  onClick={() => {
                    toast.action.onClick?.();
                    onRemove(toast.id);
                  }}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition shadow-sm"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onRemove(toast.id)}
            className="shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-100"
            aria-label="Close notification"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {toast.duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-950/40">
            <div
              className={`h-full transition-all duration-75 ease-linear ${getProgressBarColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-lg border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-right-3 ${getBorderColor()}`}
    >
      <div className="flex items-start gap-3">
        <ToastIcon type={toast.type} />
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-sm font-semibold tracking-tight text-neutral-50">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-xs leading-relaxed text-neutral-300 break-words">{toast.description}</p>
          )}
          {toast.action && (
            <div className="mt-2">
              <button
                onClick={() => {
                  toast.action.onClick?.();
                  onRemove(toast.id);
                }}
                className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:bg-white/10"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-100"
          aria-label="Close notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
          <div
            className={`h-full transition-all duration-75 ease-linear ${getProgressBarColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-[9999] flex max-w-md w-[calc(100vw-2.5rem)] flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}

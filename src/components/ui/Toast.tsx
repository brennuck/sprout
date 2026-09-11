"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error" | "warning" | "loading";

export interface ToastOptions {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. `null` keeps it until dismissed. */
  duration?: number | null;
  action?: { label: string; onClick: () => void | Promise<void> };
}

interface ToastRecord extends Required<Pick<ToastOptions, "id" | "title">> {
  description?: ReactNode;
  variant: ToastVariant;
  duration: number | null;
  action?: ToastOptions["action"];
  createdAt: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => string;
  update: (id: string, options: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastVariant, ReactNode> = {
  default: <Info className="h-5 w-5 text-info" aria-hidden="true" />,
  success: <CheckCircle2 className="h-5 w-5 text-positive" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 text-danger" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />,
  loading: <Loader2 className="h-5 w-5 animate-spin text-ink-muted" aria-hidden="true" />,
};

const DEFAULT_DURATION = 5000;
const UNDO_DURATION = 7000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const schedule = useCallback(
    (id: string, duration: number | null) => {
      const existing = timers.current.get(id);
      if (existing) window.clearTimeout(existing);
      if (duration == null) return;
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  const show = useCallback(
    (options: ToastOptions) => {
      const id = options.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const variant = options.variant ?? "default";
      const duration =
        options.duration === undefined
          ? variant === "loading"
            ? null
            : options.action
              ? UNDO_DURATION
              : DEFAULT_DURATION
          : options.duration;
      setToasts((current) => {
        const next = current.filter((toast) => toast.id !== id);
        next.push({
          id,
          title: options.title,
          description: options.description,
          variant,
          duration,
          action: options.action,
          createdAt: Date.now(),
        });
        return next.slice(-4);
      });
      schedule(id, duration);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: string, options: Partial<ToastOptions>) => {
      setToasts((current) =>
        current.map((toast) => {
          if (toast.id !== id) return toast;
          const variant = options.variant ?? toast.variant;
          const duration =
            options.duration === undefined
              ? variant === "loading"
                ? null
                : options.action || toast.action
                  ? UNDO_DURATION
                  : DEFAULT_DURATION
              : options.duration;
          schedule(id, duration);
          return {
            ...toast,
            ...options,
            title: options.title ?? toast.title,
            variant,
            duration,
          };
        }),
      );
    },
    [schedule],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => window.clearTimeout(timer));
      active.clear();
    };
  }, []);

  const value = useMemo(() => ({ show, update, dismiss }), [show, update, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-tabbar sm:items-end sm:pb-6 sm:pr-6 lg:pb-6"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 pr-2 text-ink shadow-float animate-slide-up",
      )}
    >
      <span className="mt-0.5 flex-none">{icons[toast.variant]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-ink-muted">{toast.description}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await toast.action?.onClick();
            } finally {
              setBusy(false);
              onDismiss();
            }
          }}
          className="min-h-9 flex-none rounded-lg px-2.5 text-sm font-semibold text-brand-strong hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
        >
          {busy ? "…" : toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

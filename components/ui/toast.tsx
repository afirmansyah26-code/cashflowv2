"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, LoaderCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
  ariaLabel?: string;
  icon?: ReactNode;
}

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
  icon?: ReactNode;
}

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
  icon?: ReactNode;
  actionRunning?: boolean;
}

const ToastContext = createContext<{
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
}>({
  showToast: () => {},
});

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, options: ToastOptions = {}) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, {
      id,
      type,
      message,
      action: options.action,
      icon: options.icon,
    }]);
    const timer = setTimeout(() => removeToast(id), options.duration ?? 4000);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  const runToastAction = useCallback(async (toast: Toast) => {
    if (!toast.action || toast.actionRunning) return;
    const timer = timersRef.current.get(toast.id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(toast.id);
    setToasts((prev) => prev.map((item) => (
      item.id === toast.id ? { ...item, actionRunning: true } : item
    )));
    try {
      await toast.action.onClick();
    } finally {
      removeToast(toast.id);
    }
  }, [removeToast]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  const colors = {
    success: "var(--toast-success)",
    error: "var(--toast-error)",
    warning: "var(--toast-warning)",
    info: "var(--toast-info)",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-item"
            style={{ borderLeftColor: colors[toast.type] }}
            role="status"
          >
            <span className="toast-icon" style={{ color: colors[toast.type] }}>
              {toast.icon || icons[toast.type]}
            </span>
            <span className="toast-message">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => void runToastAction(toast)}
                disabled={toast.actionRunning}
                aria-label={toast.action.ariaLabel || toast.action.label}
              >
                {toast.actionRunning ? (
                  <LoaderCircle className="toast-action-spinner" size={13} aria-hidden="true" />
                ) : toast.action.icon ? (
                  <span className="toast-action-icon" aria-hidden="true">{toast.action.icon}</span>
                ) : null}
                <span>{toast.actionRunning ? "Memproses..." : toast.action.label}</span>
              </button>
            )}
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

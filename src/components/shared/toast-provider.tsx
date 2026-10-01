"use client";

import { CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

const ToastContext = createContext<((message: MessageKey) => void) | null>(
  null,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const sequence = useRef(0);
  const [toast, setToast] = useState<{
    id: number;
    message: MessageKey;
  } | null>(null);
  const [paused, setPaused] = useState(false);
  const notify = useCallback((message: MessageKey) => {
    setToast({ id: ++sequence.current, message });
  }, []);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast, paused]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-region">
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {toast ? t(toast.message) : ""}
        </div>
        {toast && (
          <div
            key={toast.id}
            className="toast-message"
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setPaused(false);
            }}
          >
            <CheckCircle2 aria-hidden="true" />
            <p>{t(toast.message)}</p>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => {
                setToast(null);
                setPaused(false);
              }}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast requires ToastProvider");
  return notify;
}

import { useEffect } from "react";

import "./Toast.css";

export type ToastMessage = {
  autoDismissMs?: number | null;
  message: string;
};

type ToastProps = ToastMessage & {
  onDismiss: () => void;
};

export function Toast({
  autoDismissMs = 4500,
  message,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    if (!autoDismissMs) return;
    const timeoutId = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timeoutId);
  }, [autoDismissMs, message, onDismiss]);

  return (
    <section aria-label="Notice" className="toast-panel">
      <p>{message}</p>
    </section>
  );
}

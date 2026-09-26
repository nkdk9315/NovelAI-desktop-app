import { useEffect, useRef } from "react";
import { toast, useSonner } from "sonner";

const SUCCESS_MS = 3000;
const ERROR_MS = 8000;

/**
 * Sonner pauses its own timer while the pointer is over (or has pressed) the
 * toast stack, which in practice left toasts on screen until closed by hand.
 * This force-dismisses every toast after a fixed time regardless of hover.
 * Loading toasts and ones created with `duration: Infinity` are left alone.
 */
export default function ToastAutoDismiss() {
  const { toasts } = useSonner();
  const timers = useRef(new Map<string | number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const live = new Set(toasts.map((t) => t.id));
    for (const t of toasts) {
      if (timers.current.has(t.id) || t.type === "loading" || t.duration === Infinity) continue;
      const ms = t.duration ?? (t.type === "error" ? ERROR_MS : SUCCESS_MS);
      timers.current.set(t.id, setTimeout(() => toast.dismiss(t.id), ms));
    }
    for (const [id, timer] of timers.current) {
      if (!live.has(id)) { clearTimeout(timer); timers.current.delete(id); }
    }
  }, [toasts]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return null;
}

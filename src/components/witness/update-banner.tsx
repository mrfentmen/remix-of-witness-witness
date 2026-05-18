import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { applyUpdate, getUpdateAvailable, subscribeUpdate } from "@/lib/pwa";

const DISMISS_KEY = "@Witness_updateDismissed";

function isDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setAvailable(getUpdateAvailable());
    setDismissed(isDismissed());
    const unsub = subscribeUpdate(() => setAvailable(getUpdateAvailable()));
    return unsub;
  }, []);

  if (!available || dismissed) return null;

  function handleDismiss() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  }

  async function handleUpdate() {
    setUpdating(true);
    try {
      await applyUpdate();
    } catch {
      setUpdating(false);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[max(env(safe-area-inset-top),0.5rem)]"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <RefreshCw className="h-3.5 w-3.5" />
        </span>
        <p className="flex-1 text-xs font-medium text-foreground">
          A new version of Witness R.E.P is available.
        </p>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="h-8 shrink-0 rounded-lg bg-primary px-3 text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition active:scale-95 disabled:opacity-60"
        >
          {updating ? "Updating…" : "Tap to update"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss update notice"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition active:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

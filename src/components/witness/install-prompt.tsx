import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { getInstallPrompt, subscribeInstallPrompt, triggerInstall } from "@/lib/pwa";

const DISMISS_KEY = "@Witness_install_dismissed";
const TRIGGER_KEY = "@Witness_first_record_done";

/** Mark that the user just finished their first recording. */
export function markFirstRecording(): void {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(TRIGGER_KEY)) {
    window.localStorage.setItem(TRIGGER_KEY, String(Date.now()));
    window.dispatchEvent(new Event("witness:first-record"));
  }
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    const evaluate = () => {
      const hasPrompt = !!getInstallPrompt();
      const hasRecorded = !!window.localStorage.getItem(TRIGGER_KEY);
      setVisible(hasPrompt && hasRecorded);
    };

    evaluate();
    const unsub = subscribeInstallPrompt(evaluate);
    window.addEventListener("witness:first-record", evaluate);
    return () => {
      unsub();
      window.removeEventListener("witness:first-record", evaluate);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Download className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Install Witness R.E.P</p>
        <p className="text-xs text-muted-foreground">
          Faster launch, fullscreen camera, works offline.
        </p>
      </div>
      <button
        onClick={async () => {
          const result = await triggerInstall();
          if (result !== "unavailable") setVisible(false);
        }}
        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

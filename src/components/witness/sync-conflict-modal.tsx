import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export interface SyncConflict {
  recordingId: string;
  localTimestamp: number;
  remoteTimestamp: number;
  localTitle?: string;
  remoteTitle?: string;
}

type Listener = (conflict: SyncConflict) => void;
const listeners = new Set<Listener>();

export function reportSyncConflict(c: SyncConflict) {
  listeners.forEach((l) => l(c));
}

export type ConflictResolution = "local" | "remote" | "both";

let resolverFn: ((c: SyncConflict, r: ConflictResolution) => void) | null = null;
export function setSyncConflictResolver(fn: (c: SyncConflict, r: ConflictResolution) => void) {
  resolverFn = fn;
}

export function SyncConflictModal() {
  const [queue, setQueue] = useState<SyncConflict[]>([]);

  useEffect(() => {
    const l: Listener = (c) =>
      setQueue((q) => (q.some((x) => x.recordingId === c.recordingId) ? q : [...q, c]));
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const current = queue[0];
  if (!current) return null;

  const resolve = (r: ConflictResolution) => {
    resolverFn?.(current, r);
    setQueue((q) => q.slice(1));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-primary">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-base font-bold">Sync conflict</h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The same recording exists on two devices with different timestamps. Choose which to keep.
        </p>
        <div className="mt-4 space-y-2 text-xs">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="font-semibold">This device</p>
            <p className="text-muted-foreground">{current.localTitle ?? current.recordingId}</p>
            <p className="text-muted-foreground">
              {new Date(current.localTimestamp).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="font-semibold">Other device</p>
            <p className="text-muted-foreground">{current.remoteTitle ?? current.recordingId}</p>
            <p className="text-muted-foreground">
              {new Date(current.remoteTimestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => resolve("local")}
            className="h-10 rounded-xl border border-border bg-background text-xs font-semibold active:scale-95"
          >
            Keep local
          </button>
          <button
            type="button"
            onClick={() => resolve("remote")}
            className="h-10 rounded-xl border border-border bg-background text-xs font-semibold active:scale-95"
          >
            Keep remote
          </button>
          <button
            type="button"
            onClick={() => resolve("both")}
            className="h-10 rounded-xl bg-primary text-xs font-semibold text-primary-foreground active:scale-95"
          >
            Keep both
          </button>
        </div>
      </div>
    </div>
  );
}

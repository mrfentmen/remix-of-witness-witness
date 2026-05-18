import { useEffect, useState, useCallback } from "react";
import { Smartphone, Trash2, Star, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generatePairingCode,
  getLocalDeviceId,
  listMyDevices,
  setPrimaryDevice,
  subscribeToDevices,
  unlinkDevice,
  type DeviceRow,
} from "@/lib/witness-devices";

export function ManageDevicesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const myId = getLocalDeviceId();

  const refresh = useCallback(async () => {
    try {
      setDevices(await listMyDevices());
    } catch (e) {
      console.warn("[witness] list devices failed", e);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    let unsub: (() => void) | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      unsub = subscribeToDevices(uid, () => void refresh());
    });
    return () => {
      unsub?.();
    };
  }, [open, refresh]);

  if (!open) return null;

  const handlePair = () => setPairCode(generatePairingCode());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Manage Devices</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {pairCode ? (
          <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pairing code</p>
            <p className="mt-1 font-mono text-3xl tracking-[0.4em]">{pairCode}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Enter this code on your other device to link it. Code expires when you close this
              sheet.
            </p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(pairCode);
                toast.success("Copied");
              }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePair}
            className="mb-4 grid h-12 w-full place-items-center rounded-2xl bg-primary text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground active:scale-[0.98]"
          >
            Generate pairing code
          </button>
        )}

        <div className="space-y-2">
          {devices.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">No devices linked yet.</p>
          )}
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
                <Smartphone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {d.name}
                  {d.device_id === myId && (
                    <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                      This device
                    </span>
                  )}
                  {d.is_primary && (
                    <span className="ml-2 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-success">
                      Primary
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Last sync {new Date(d.last_sync_at).toLocaleString()}
                </p>
              </div>
              {!d.is_primary && (
                <button
                  type="button"
                  aria-label="Make primary"
                  onClick={() => void setPrimaryDevice(d.id).then(refresh)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground active:scale-95"
                >
                  <Star className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="Unlink device"
                onClick={() => {
                  if (!confirm(`Unlink "${d.name}"?`)) return;
                  void unlinkDevice(d.id).then(refresh);
                }}
                className="grid h-9 w-9 place-items-center rounded-lg text-primary active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { getCustodyLogs, verifyCustodyChain, type CustodyLogEntry } from "@/lib/witness-chain";
import { RotateCw } from "lucide-react";

interface CustodyLogProps {
  recordingId: string;
}

const ACTION_LABELS: Record<string, string> = {
  viewed: "Viewed",
  exported: "Exported",
  shared: "Shared",
  uploaded: "Uploaded",
  certificate_generated: "Certificate",
};

export function CustodyLog({ recordingId }: CustodyLogProps) {
  const [logs, setLogs] = useState<CustodyLogEntry[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndVerify = useCallback(async () => {
    setLoading(true);
    try {
      const result = await verifyCustodyChain(recordingId);
      setLogs(result.entries);
      setVerified(result.valid);
    } catch {
      setLogs([]);
      setVerified(null);
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  useEffect(() => {
    void fetchAndVerify();
  }, [fetchAndVerify]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-black uppercase italic text-primary">Chain of Custody</h3>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Cryptographic audit trail
          </p>
        </div>
        <button
          onClick={fetchAndVerify}
          className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
        >
          <RotateCw className="mr-1 inline h-3 w-3" />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Verifying chain…</p>
      ) : (
        <>
          <div
            className={`mb-4 rounded-lg p-2.5 text-center text-xs font-bold ${
              verified
                ? "bg-success/10 text-success border border-success/20"
                : verified === false
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-secondary text-muted-foreground"
            }`}
          >
            {verified
              ? "✓ Chain Verified · Tamper-Free"
              : verified === false
                ? "⚠️ Chain Breach · Integrity Compromised"
                : "No audit events recorded"}
          </div>

          {logs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No custody events recorded yet.
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border-l-2 border-primary bg-secondary/30 p-2.5"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-primary">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="truncate font-mono text-[9px] text-muted-foreground">
                    SHA256: {log.hash}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

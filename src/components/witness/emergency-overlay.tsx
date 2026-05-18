import { Siren } from "lucide-react";
import { useState } from "react";
import { useWitness } from "@/lib/witness-orchestrator";
import { getString, STORAGE_KEYS } from "@/lib/witness-storage";

export function EmergencyOverlay() {
  const { state, clearEmergency } = useWitness();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  if (!state.emergency) return null;
  const expected = getString(STORAGE_KEYS.pin);

  const tryClear = () => {
    if (!expected || pin === expected) {
      setPin("");
      setError(false);
      clearEmergency();
    } else {
      setError(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-primary p-6 text-primary-foreground"
      role="alertdialog"
      aria-label="Emergency mode"
    >
      <Siren className="h-16 w-16" />
      <h1 className="mt-4 text-3xl font-black uppercase tracking-widest">Emergency</h1>
      <p className="mt-2 max-w-xs text-center text-sm opacity-90">
        Your last 5 minutes have been flushed to your encrypted vault.
      </p>
      {expected && (
        <div className="mt-8 w-full max-w-xs">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError(false);
            }}
            placeholder="Enter PIN"
            aria-label="Enter PIN to dismiss"
            className="h-14 w-full rounded-2xl border border-white/40 bg-white/10 px-4 text-center text-lg tracking-widest outline-none focus:border-white"
          />
          {error && <p className="mt-2 text-center text-xs">Incorrect PIN</p>}
        </div>
      )}
      <button
        type="button"
        onClick={tryClear}
        className="mt-4 h-12 w-full max-w-xs rounded-2xl bg-white text-sm font-bold uppercase tracking-widest text-primary active:scale-95"
      >
        Dismiss
      </button>
    </div>
  );
}

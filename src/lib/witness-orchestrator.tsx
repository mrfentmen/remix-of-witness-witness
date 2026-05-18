import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";

type State = { emergency: boolean; emergencyAt: number | null };
type Action = { type: "EMERGENCY_TRIGGER" } | { type: "EMERGENCY_CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "EMERGENCY_TRIGGER":
      return { emergency: true, emergencyAt: Date.now() };
    case "EMERGENCY_CLEAR":
      return { emergency: false, emergencyAt: null };
  }
}

interface Ctx {
  state: State;
  triggerEmergency: () => void;
  clearEmergency: () => void;
}

const WitnessCtx = createContext<Ctx | null>(null);

export function WitnessProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { emergency: false, emergencyAt: null });
  const triggerEmergency = useCallback(() => dispatch({ type: "EMERGENCY_TRIGGER" }), []);
  const clearEmergency = useCallback(() => dispatch({ type: "EMERGENCY_CLEAR" }), []);
  const value = useMemo(
    () => ({ state, triggerEmergency, clearEmergency }),
    [state, triggerEmergency, clearEmergency],
  );
  return <WitnessCtx.Provider value={value}>{children}</WitnessCtx.Provider>;
}

export function useWitness(): Ctx {
  const ctx = useContext(WitnessCtx);
  if (!ctx) throw new Error("useWitness must be used inside <WitnessProvider>");
  return ctx;
}

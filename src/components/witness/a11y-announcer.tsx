// Global ARIA live region. Use the exported announce() function from anywhere.
import { useEffect, useState } from "react";

let publish: ((msg: string) => void) | null = null;

export function announce(msg: string) {
  publish?.(msg);
}

export function A11yAnnouncer() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    publish = (m: string) => {
      setMsg("");
      // Two-tick to force AT to re-announce identical text.
      setTimeout(() => setMsg(m), 30);
    };
    return () => {
      publish = null;
    };
  }, []);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {msg}
    </div>
  );
}

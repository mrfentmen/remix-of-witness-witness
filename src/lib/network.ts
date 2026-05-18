// Connection-type detection via the Network Information API.
// Note: support is partial — Chrome/Edge/Opera on Android expose `effectiveType`
// and `type`; iOS Safari and Firefox return undefined. We treat "unknown" as
// usable so we never block uploads on browsers that can't report.

type ConnectionType =
  | "wifi"
  | "cellular"
  | "ethernet"
  | "wimax"
  | "bluetooth"
  | "none"
  | "other"
  | "unknown";

interface NetworkInfo {
  type: ConnectionType;
  online: boolean;
}

interface NetInfoConn extends EventTarget {
  type?: ConnectionType;
  effectiveType?: string;
  saveData?: boolean;
}

function getConn(): NetInfoConn | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as unknown as { connection?: NetInfoConn };
  return nav.connection ?? null;
}

export function getNetworkInfo(): NetworkInfo {
  if (typeof navigator === "undefined") {
    return { type: "unknown", online: true };
  }
  const online = navigator.onLine;
  const conn = getConn();
  return { type: conn?.type ?? "unknown", online };
}

/** True when uploads are allowed under a "WiFi-only" policy.
 *  - WiFi/ethernet: always OK
 *  - Cellular: blocked
 *  - Unknown (iOS/Safari/Firefox): treat as OK so we don't strand uploads.
 */
export function isWifiOrUnknown(): boolean {
  const { type, online } = getNetworkInfo();
  if (!online) return false;
  if (type === "wifi" || type === "ethernet" || type === "unknown") return true;
  return false;
}

/** Subscribe to connection-type or online/offline changes. */
export function subscribeConnection(fn: () => void): () => void {
  const conn = getConn();
  conn?.addEventListener("change", fn);
  if (typeof window !== "undefined") {
    window.addEventListener("online", fn);
    window.addEventListener("offline", fn);
  }
  return () => {
    conn?.removeEventListener("change", fn);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", fn);
      window.removeEventListener("offline", fn);
    }
  };
}

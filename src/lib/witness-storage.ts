// Storage keys mirror the React Native app (`@Witness_*`).
export const STORAGE_KEYS = {
  onboarded: "@Witness_onboarded",
  pin: "@Witness_pin",
  contacts: "@Witness_contacts",
  settings: "@Witness_settings",
  recordings: "@Witness_recordings",
  encrypt: "@Witness_encrypt",
  gps: "@Witness_gps",
  anonymous: "@Witness_anonymous",
  autoStopMin: "@Witness_autoStopMin",
  uploads: "@Witness_uploads",
  deviceId: "@Witness_deviceId",
  autoSosOnLive: "@Witness_autoSosOnLive",
  wifiOnly: "@Witness_wifiOnly",
  shareLocation: "@Witness_shareLocation",
  theme: "@Witness_theme",
  notifSosReceived: "@Witness_notifSosReceived",
  notifShareRequest: "@Witness_notifShareRequest",
  notifLiveNearby: "@Witness_notifLiveNearby",
  publicLiveLocation: "@Witness_publicLiveLocation",
  publicLiveLocationAck: "@Witness_publicLiveLocationAck",
  airGap: "@Witness_airGap",
  stealthAppMasking: "@Witness_stealthAppMasking",
  dashcamMode: "@Witness_dashcamMode",
  policeConnect: "@Witness_policeConnect",
  privacyBlur: "@Witness_privacyBlur",
} as const;

export function getFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* noop */
  }
}

export function getFlagWithDefault(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v === "1";
  } catch {
    return defaultValue;
  }
}

export function getString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setString(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

export function getNumber(key: string, defaultValue: number): number {
  if (typeof window === "undefined") return defaultValue;
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return defaultValue;
    const n = Number(v);
    return Number.isFinite(n) ? n : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setNumber(key: string, value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* noop */
  }
}

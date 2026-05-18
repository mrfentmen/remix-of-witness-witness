import { getString, setString, STORAGE_KEYS } from "./witness-storage";

export type VerificationStatus = "unverified" | "pending" | "verified";

export interface SosContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  verification: VerificationStatus;
  verificationCode?: string; // generated 6-digit code while pending
  verifiedAt?: number;
}

export function listContacts(): SosContact[] {
  const raw = getString(STORAGE_KEYS.contacts);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SosContact[]) : [];
  } catch {
    return [];
  }
}

export function saveContacts(items: SosContact[]) {
  setString(STORAGE_KEYS.contacts, JSON.stringify(items));
}

export function addContact(
  input: Omit<SosContact, "id" | "verification" | "verificationCode" | "verifiedAt"> & {
    verification?: VerificationStatus;
  },
): SosContact {
  const c: SosContact = {
    id: crypto.randomUUID(),
    verification: input.verification ?? "unverified",
    name: input.name,
    phone: input.phone,
    relation: input.relation,
  };
  const next = [...listContacts(), c];
  saveContacts(next);
  return c;
}

export function updateContact(
  id: string,
  patch: Partial<Omit<SosContact, "id">>,
): SosContact | null {
  const all = listContacts();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated: SosContact = { ...all[idx], ...patch };
  all[idx] = updated;
  saveContacts(all);
  return updated;
}

export function removeContact(id: string) {
  saveContacts(listContacts().filter((c) => c.id !== id));
}

export function startVerification(id: string): { code: string; contact: SosContact } | null {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const c = updateContact(id, { verification: "pending", verificationCode: code });
  if (!c) return null;
  return { code, contact: c };
}

export function confirmVerification(id: string, code: string): boolean {
  const all = listContacts();
  const c = all.find((x) => x.id === id);
  if (!c || c.verificationCode !== code.trim()) return false;
  updateContact(id, {
    verification: "verified",
    verifiedAt: Date.now(),
    verificationCode: undefined,
  });
  return true;
}

export interface SosLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function getQuickLocation(): Promise<SosLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

function watchBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export interface StreamLink {
  id: string;
  url: string;
}

export function createStreamLink(): StreamLink {
  const id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
    .replace(/-/g, "")
    .slice(0, 12);
  return { id, url: `${watchBaseUrl()}/watch/${id}` };
}

export function buildSosMessage(loc: SosLocation | null, stream?: StreamLink | null): string {
  const map = loc ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}` : null;
  const lines = [
    "🚨 SOS — I need help.",
    map ? `Live location: ${map}` : "Location unavailable.",
    stream ? `Watch live: ${stream.url}` : null,
    "Sent from Witness R.E.P.",
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

export function buildVerificationMessage(code: string): string {
  return `Witness R.E.P verification code: ${code}\nReply with this code to your contact so they can confirm your trusted-contact list.`;
}

export function smsHref(phones: string[], body: string): string {
  // iOS uses `&body=`, Android uses `?body=`. Most modern handsets accept `?body=`.
  const to = phones.map((p) => p.replace(/\s+/g, "")).join(",");
  return `sms:${to}?&body=${encodeURIComponent(body)}`;
}

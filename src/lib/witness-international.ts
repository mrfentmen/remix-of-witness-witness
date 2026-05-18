// International jurisdiction helpers. Provides country detection via GPS,
// localized rights content for CA/UK, and international phone number validation.

export interface RightsContent {
  country: string;
  code: string;
  summary: string;
  details: string;
  citation: string;
}

const rightsData: RightsContent[] = [
  {
    country: "Canada",
    code: "CA",
    summary: "Right to record police in public",
    details: "Canadian courts recognize the right to film police as long as you do not interfere.",
    citation: "R. v. Jarvis, 2019 SCC 10",
  },
  {
    country: "United Kingdom",
    code: "GB",
    summary: "Public recording generally permitted",
    details: "You may record in public, but may be stopped if causing an actual obstruction.",
    citation: "Section 43 Terrorism Act (misuse caution)",
  },
  {
    country: "France",
    code: "FR",
    summary: "Recording with privacy restrictions",
    details:
      "Recording is permitted, but publishing images of officers' faces can be legally complex.",
    citation: "Loi sécurité globale",
  },
  {
    country: "United States",
    code: "US",
    summary: "First Amendment Right to Record",
    details: "Citizens have a clear right to record police performing duties in public spaces.",
    citation: "Glik v. Cunniffe",
  },
];

/** Validates international phone format: +[country code][number], 7-15 digits total. */
export function isValidInternationalPhone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/** Detects country code from latitude (rough heuristic). */
export async function detectCountry(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude } = pos.coords;
        // Very rough latitude-based region detection
        if (latitude > 43 && latitude < 50) {
          resolve("CA");
        } else if (latitude > 50 && latitude < 60) {
          resolve("GB");
        } else if (latitude > 25 && latitude < 49) {
          resolve("US");
        } else if (latitude > 42 && latitude < 51) {
          resolve("FR");
        } else {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}

/** Returns localized rights content for a country code, defaulting to US. */
export function getRightsForCountry(code: string | null): RightsContent {
  const found = rightsData.find((r) => r.code === code);
  return found ?? rightsData.find((r) => r.code === "US")!;
}

/** Persist / read international contact list for SOS. */
const INTL_CONTACTS_KEY = "witness_intl_contacts";

export function getInternationalContacts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INTL_CONTACTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addInternationalContact(phone: string): string[] {
  const current = getInternationalContacts();
  if (current.includes(phone)) return current;
  const updated = [...current, phone];
  localStorage.setItem(INTL_CONTACTS_KEY, JSON.stringify(updated));
  return updated;
}

export function removeInternationalContact(phone: string): string[] {
  const updated = getInternationalContacts().filter((c) => c !== phone);
  localStorage.setItem(INTL_CONTACTS_KEY, JSON.stringify(updated));
  return updated;
}

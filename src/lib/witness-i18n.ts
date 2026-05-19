// Lightweight i18n: en / es / ht with localStorage persistence.
// Reactive via useSyncExternalStore. Falls back to English when missing.
import { useSyncExternalStore } from "react";

export type Language = "en" | "es" | "ht";

const STORAGE_KEY = "witness:lang";

const dict = {
  // App / nav
  "app.title": { en: "Witness R.E.P.", es: "Testigo R.E.P.", ht: "Temwen R.E.P." },
  "nav.back": { en: "Back", es: "Atrás", ht: "Tounen" },
  "nav.settings": { en: "Settings", es: "Ajustes", ht: "Paramèt" },
  "nav.vault": { en: "Vault", es: "Bóveda", ht: "Kòf" },
  "nav.map": { en: "Map", es: "Mapa", ht: "Kat" },
  "nav.sos": { en: "SOS", es: "SOS", ht: "SOS" },
  "nav.curriculum": { en: "Know Your Rights", es: "Conoce tus Derechos", ht: "Konnen Dwa W" },
  // Camera
  "camera.encrypted": { en: "ENCRYPTED", es: "CIFRADO", ht: "CHIFRE" },
  "camera.gps": { en: "GPS", es: "GPS", ht: "GPS" },
  "camera.live": { en: "LIVE", es: "DIRECTO", ht: "LIVE" },
  "camera.record": { en: "Record", es: "Grabar", ht: "Anrejistre" },
  "camera.stop": { en: "Stop", es: "Detener", ht: "Sispann" },
  "camera.pause": { en: "Pause", es: "Pausar", ht: "Poze" },
  "camera.resume": { en: "Resume", es: "Reanudar", ht: "Kontinye" },
  "camera.flash": { en: "Flash", es: "Flash", ht: "Flash" },
  "camera.switch": { en: "Switch camera", es: "Cambiar cámara", ht: "Chanje kamera" },
  "camera.detained": { en: "Detained", es: "Detenido", ht: "Arete" },
  "camera.goLive": { en: "Go Live", es: "Iniciar Directo", ht: "Komanse Live" },
  // A11y settings panel
  "a11y.title": { en: "Accessibility", es: "Accesibilidad", ht: "Aksesiblite" },
  "a11y.language": { en: "Language", es: "Idioma", ht: "Lang" },
  "a11y.textSize": { en: "Text size", es: "Tamaño del texto", ht: "Gwosè tèks" },
  "a11y.highContrast": { en: "High contrast", es: "Alto contraste", ht: "Gwo kontras" },
  "a11y.leftHanded": { en: "Left-handed mode", es: "Modo zurdo", ht: "Mòd goch" },
  "a11y.voice": { en: "Voice commands", es: "Comandos de voz", ht: "Kòmand vwa" },
  "a11y.reducedMotion": { en: "Reduce motion", es: "Reducir movimiento", ht: "Diminye mouvman" },
  // Settings
  "settings.devices": { en: "Manage Devices", es: "Administrar Dispositivos", ht: "Jere Aparèy" },
  // Common
  "common.cancel": { en: "Cancel", es: "Cancelar", ht: "Anile" },
  "common.save": { en: "Save", es: "Guardar", ht: "Sove" },
  "common.continue": { en: "Continue", es: "Continuar", ht: "Kontinye" },
} as const satisfies Record<string, Record<Language, string>>;

export type TranslationKey = keyof typeof dict;

function read(): Language {
  if (typeof localStorage === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "es" || v === "ht" ? v : "en";
}

let current: Language = read();
const listeners = new Set<() => void>();

export function setLanguage(lang: Language) {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* noop */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
  listeners.forEach((l) => l());
}

export function getLanguage(): Language {
  return current;
}

export function t(key: TranslationKey, lang: Language = current): string {
  const entry = dict[key];
  return entry[lang] ?? entry.en;
}

export function useLanguage(): Language {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}

export function useTranslation(): {
  t: (key: TranslationKey) => string;
  lang: Language;
  setLang: (l: Language) => void;
} {
  const lang = useLanguage();
  return { t: (k) => t(k, lang), lang, setLang: setLanguage };
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  es: "Español",
  ht: "Kreyòl Ayisyen",
};

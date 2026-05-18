// Web Speech API voice commands. Localized en/es/ht. Best-effort: silently
// no-ops when SpeechRecognition is unavailable.
import { useEffect, useRef } from "react";
import type { Language } from "@/lib/witness-i18n";

export type VoiceCommand =
  | "startRecording"
  | "stopRecording"
  | "goLive"
  | "sendSos"
  | "openVault"
  | "openMap";

const PHRASES: Record<Language, Record<VoiceCommand, string[]>> = {
  en: {
    startRecording: ["start recording", "record", "begin recording"],
    stopRecording: ["stop recording", "stop", "end recording"],
    goLive: ["go live", "start live", "broadcast"],
    sendSos: ["send sos", "emergency", "help"],
    openVault: ["open vault", "vault"],
    openMap: ["open map", "map"],
  },
  es: {
    startRecording: ["empezar a grabar", "grabar"],
    stopRecording: ["detener", "parar grabacion"],
    goLive: ["en directo", "transmitir"],
    sendSos: ["enviar sos", "emergencia", "ayuda"],
    openVault: ["abrir boveda", "boveda"],
    openMap: ["abrir mapa", "mapa"],
  },
  ht: {
    startRecording: ["komanse anrejistre", "anrejistre"],
    stopRecording: ["sispann", "rete"],
    goLive: ["ale live", "live"],
    sendSos: ["voye sos", "ijans", "èd"],
    openVault: ["louvri kòf", "kòf"],
    openMap: ["louvri kat", "kat"],
  },
};

const LANG_LOCALE: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  ht: "fr-FR",
};

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function useVoiceCommands(
  enabled: boolean,
  lang: Language,
  onCommand: (cmd: VoiceCommand) => void,
) {
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = LANG_LOCALE[lang];

    const phrases = PHRASES[lang];

    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript?.toLowerCase().trim() ?? "";
      if (!transcript) return;
      for (const cmd of Object.keys(phrases) as VoiceCommand[]) {
        if (phrases[cmd].some((p) => transcript.includes(p))) {
          onCommandRef.current(cmd);
          return;
        }
      }
    };
    rec.onerror = () => undefined;
    rec.onend = () => {
      // Auto-restart while enabled
      try {
        rec.start();
      } catch {
        /* noop */
      }
    };

    try {
      rec.start();
    } catch {
      /* noop */
    }
    return () => {
      try {
        rec.onend = null;
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, [enabled, lang]);
}

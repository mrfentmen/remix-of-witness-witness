import { Accessibility } from "lucide-react";
import { LANGUAGE_LABELS, useTranslation, type Language } from "@/lib/witness-i18n";
import { setA11y, useA11y, type TextScale } from "@/lib/witness-a11y";

const SCALES: TextScale[] = ["small", "normal", "large", "extra-large", "maximum"];

export function A11ySettingsPanel() {
  const { t, lang, setLang } = useTranslation();
  const cfg = useA11y();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
          <Accessibility className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("a11y.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Language, text size, contrast, and motion preferences.
          </p>
        </div>
      </div>

      {/* Language */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("a11y.language")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`h-10 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                lang === l
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Text size */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("a11y.textSize")}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setA11y({ textScale: s })}
              aria-pressed={cfg.textScale === s}
              className={`h-10 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                cfg.textScale === s
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              A
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="mt-4 space-y-2">
        <Toggle
          label={t("a11y.highContrast")}
          checked={cfg.highContrast}
          onChange={(v) => setA11y({ highContrast: v })}
        />
        <Toggle
          label={t("a11y.leftHanded")}
          checked={cfg.leftHanded}
          onChange={(v) => setA11y({ leftHanded: v })}
        />
        <Toggle
          label={t("a11y.voice")}
          checked={cfg.voiceCommandsEnabled}
          onChange={(v) => setA11y({ voiceCommandsEnabled: v })}
        />
        <Toggle
          label={t("a11y.reducedMotion")}
          checked={cfg.reducedMotion}
          onChange={(v) => setA11y({ reducedMotion: v })}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-primary"
        aria-label={label}
      />
    </label>
  );
}

export const RECORDING_CATEGORIES = [
  "Police",
  "Protest",
  "Workplace",
  "Domestic",
  "Traffic",
  "Other",
] as const;

export type RecordingCategory = (typeof RECORDING_CATEGORIES)[number];

export function isRecordingCategory(value: unknown): value is RecordingCategory {
  return typeof value === "string" && (RECORDING_CATEGORIES as readonly string[]).includes(value);
}

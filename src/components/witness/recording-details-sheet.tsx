import { useEffect, useState } from "react";
import { X, ShieldCheck, AlertTriangle, MessageSquare } from "lucide-react";
import { updateRecordingDetails, type RecordingMeta } from "@/lib/witness-db";
import { RECORDING_CATEGORIES, isRecordingCategory } from "@/lib/witness-categories";
import { toast } from "sonner";
import { recordCustodyAction } from "@/lib/witness-chain";
import { sanitizeText } from "@/lib/witness-sanitize";
import type { TranscriptionSegment } from "@/lib/witness-ai-forensics";
import { GpsTrackViewer } from "@/components/witness/gps-track-viewer";

interface Props {
  meta: RecordingMeta | null;
  onClose: () => void;
  transcription?: TranscriptionSegment[] | null;
}

export function RecordingDetailsSheet({ meta, onClose, transcription }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (meta) {
      setTitle(meta.title ?? "");
      setDescription(meta.description ?? "");
      setCategory(meta.category ?? "");
    }
  }, [meta]);

  if (!meta) return null;

  const flaggedCount = transcription
    ? transcription.filter((s) => (s.flaggedPhrases?.length ?? 0) > 0).length
    : 0;

  // Admissibility score (simplified heuristic)
  const admissibilityScore = (() => {
    let score = 0;
    if (meta.gps?.latitude != null) score += 30;
    if (meta.encrypted) score += 25;
    if (meta.title) score += 20;
    if (meta.description) score += 15;
    if (meta.continuity) score += 10;
    return score;
  })();
  const admissibilityGrade =
    admissibilityScore >= 80
      ? "Excellent"
      : admissibilityScore >= 60
        ? "Good"
        : admissibilityScore >= 40
          ? "Fair"
          : "Poor";

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRecordingDetails(meta.id, {
        title: sanitizeText(title, 120) || null,
        description: sanitizeText(description, 2000) || null,
        category: isRecordingCategory(category) ? category : null,
      });
      toast.success("Details saved");
      // Log custody action
      recordCustodyAction(meta.id, "uploaded").catch(() => {});
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-card p-5 pb-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Add details</h2>
            <p className="text-xs text-muted-foreground">
              Optional. Helps you find this clip later.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Skip"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Stop on Main St"
            maxLength={120}
            autoFocus
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened, who was involved, anything you want to remember."
            rows={4}
            maxLength={2000}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">Uncategorized</option>
            {RECORDING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {/* Admissibility score */}
        <div className="mb-4 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admissibility
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                admissibilityGrade === "Excellent"
                  ? "bg-success/15 text-success"
                  : admissibilityGrade === "Good"
                    ? "bg-success/10 text-success"
                    : admissibilityGrade === "Fair"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
              }`}
            >
              {admissibilityGrade === "Excellent" || admissibilityGrade === "Good" ? (
                <ShieldCheck className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {admissibilityGrade} ({admissibilityScore}%)
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
            <span>{meta.gps?.latitude != null ? "✓" : "✗"} GPS metadata</span>
            <span>{meta.encrypted ? "✓" : "✗"} Encrypted</span>
            <span>{meta.title ? "✓" : "✗"} Labeled</span>
            <span>{meta.description ? "✓" : "✗"} Described</span>
          </div>
        </div>

        {/* GPS track viewer */}
        {meta.gpsTrack && meta.gpsTrack.length > 0 && (
          <div className="mb-4">
            <GpsTrackViewer
              recordingId={meta.id}
              track={meta.gpsTrack}
              startedAt={meta.createdAt}
            />
          </div>
        )}

        {/* Flagged phrases from transcription */}
        {transcription && flaggedCount > 0 && (
          <div className="mb-4 rounded-xl border border-red-600/20 bg-red-950/10 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                {flaggedCount} flagged phrase{flaggedCount === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {transcription
                .filter((s) => (s.flaggedPhrases?.length ?? 0) > 0)
                .map((seg, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0 rounded bg-red-600/20 px-1 text-[9px] font-mono text-red-400">
                      {Math.floor(seg.start)}s
                    </span>
                    <span className="text-[10px] text-red-300">
                      {seg.flaggedPhrases?.join(", ")}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

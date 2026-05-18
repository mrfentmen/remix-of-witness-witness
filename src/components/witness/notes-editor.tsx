import { useState } from "react";
import { X } from "lucide-react";
import { updateRecordingDetails, type RecordingMeta } from "@/lib/witness-db";
import { toast } from "sonner";
import { sanitizeText } from "@/lib/witness-sanitize";

interface NotesEditorProps {
  meta: RecordingMeta;
  onClose: () => void;
  onSaved?: (meta: RecordingMeta) => void;
}

export function NotesEditor({ meta, onClose, onSaved }: NotesEditorProps) {
  const [notes, setNotes] = useState(meta.notes ?? "");
  const [tagsInput, setTagsInput] = useState((meta.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => sanitizeText(t.trim().toLowerCase(), 60))
        .filter((t) => t !== "");
      const updated = await updateRecordingDetails(meta.id, {
        notes: sanitizeText(notes, 5000) || null,
        tags: tags.length > 0 ? tags : null,
      });
      toast.success("Notes saved");
      if (onSaved && updated) onSaved(updated);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save notes");
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
            <h2 className="text-base font-semibold text-foreground">Recording Notes</h2>
            <p className="text-xs text-muted-foreground">
              Context, badge numbers, location details…
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context (e.g. officer badge numbers, location details…)"
            rows={4}
            maxLength={5000}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Tags (comma separated)
          </span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. police, protest, 2025"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { X } from "lucide-react";
import type { RecordingFingerprint } from "@/lib/witness-fingerprint";

interface DuplicateModalProps {
  match: RecordingFingerprint;
  currentPreview: string;
  similarity: number;
  onResolve: (action: "both" | "replace" | "discard") => void;
}

export function DuplicateModal({
  match,
  currentPreview,
  similarity,
  onResolve,
}: DuplicateModalProps) {
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95 p-6 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-primary/30 bg-card p-6 shadow-2xl">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black uppercase italic text-primary">Duplicate Detected</h2>
            <p className="text-xs text-muted-foreground">
              This recording shares a {similarity}% similarity with an existing file.
            </p>
          </div>
          <button
            onClick={() => onResolve("both")}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
              Existing
            </div>
            {match.preview ? (
              <img
                src={match.preview}
                className="aspect-video w-full rounded-lg border border-border object-cover"
                alt=""
              />
            ) : (
              <div className="aspect-video w-full rounded-lg border border-border bg-secondary" />
            )}
          </div>
          <div className="text-center">
            <div className="mb-1 text-[10px] font-bold uppercase text-primary">New</div>
            <img
              src={currentPreview}
              className="aspect-video w-full rounded-lg border border-primary object-cover"
              alt=""
            />
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onResolve("replace")}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold uppercase text-primary-foreground active:scale-95"
          >
            Replace Existing
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onResolve("both")}
              className="rounded-xl border border-border py-2.5 text-xs font-bold uppercase text-foreground active:bg-secondary"
            >
              Keep Both
            </button>
            <button
              onClick={() => onResolve("discard")}
              className="rounded-xl border border-border py-2.5 text-xs font-bold uppercase text-primary active:bg-secondary"
            >
              Discard New
            </button>
          </div>
        </div>

        {similarity > 90 && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-center">
            <p className="text-[10px] font-bold italic text-primary">
              PRO-TIP: Nearly identical. Replacing saves storage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

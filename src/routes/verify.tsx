import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  Upload,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { verifyByHash, verifyPayload, type VerifyResult } from "@/lib/witness-signing.functions";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a Witness R.E.P Certificate" },
      {
        name: "description",
        content:
          "Paste a SHA-256 hash or upload a .witness.json file to verify the authenticity of a Witness R.E.P recording. No account required.",
      },
      { property: "og:title", content: "Verify a Witness R.E.P Certificate" },
      {
        property: "og:description",
        content:
          "Tamper-evident verification for Witness R.E.P recordings. Works without signing in.",
      },
    ],
  }),
  component: VerifyPage,
  validateSearch: (search: Record<string, unknown>) => ({
    hash: typeof search.hash === "string" ? search.hash : undefined,
  }),
});

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function VerifyPage() {
  const { hash: hashParam } = Route.useSearch();
  const callVerifyByHash = useServerFn(verifyByHash);
  const callVerifyPayload = useServerFn(verifyPayload);

  const [hash, setHash] = useState<string>(hashParam ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runHash(value: string) {
    setError(null);
    setResult(null);
    const h = value.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) {
      setError("That doesn't look like a SHA-256 hash. It should be 64 hex characters.");
      return;
    }
    setBusy(true);
    try {
      const r = await callVerifyByHash({ data: { sha256: h } });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  // Auto-verify on first load if ?hash= was provided.
  useEffect(() => {
    if (hashParam) void runHash(hashParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashParam]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        format?: string;
        meta?: {
          id?: string;
          sha256?: string;
          createdAt?: number;
          durationMs?: number;
          mimeType?: string;
          sizeBytes?: number;
        };
      };
      const meta = parsed.meta;
      if (!meta?.sha256) {
        throw new Error(
          "This file doesn't contain a SHA-256 hash. Expected a Witness R.E.P export (.witness.json).",
        );
      }
      setHash(meta.sha256);
      const r = await callVerifyPayload({
        data: {
          recordingId: meta.id,
          sha256: meta.sha256,
          meta: {
            createdAt: meta.createdAt,
            durationMs: meta.durationMs,
            mimeType: meta.mimeType,
            sizeBytes: meta.sizeBytes,
          },
        },
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Verify a Witness R.E.P Certificate
            </h1>
            <p className="text-sm text-muted-foreground">
              Paste a SHA-256 hash or upload a <code className="font-mono">.witness.json</code>{" "}
              file. No account required.
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            SHA-256 hash
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runHash(hash);
              }}
              placeholder="64 hex characters…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => void runHash(hash)}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background/50 px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-background">
            <Upload className="h-4 w-4" />
            Upload a <code className="font-mono">.witness.json</code> file
            <input
              type="file"
              accept="application/json,.json,.witness.json"
              className="hidden"
              onChange={onFile}
            />
          </label>
        </section>

        {error ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {result ? <ResultCard result={result} /> : null}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            ← Back to Witness R.E.P
          </Link>
        </p>
      </div>
    </main>
  );
}

function ResultCard({ result }: { result: VerifyResult }) {
  if (result.status === "not_found") {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <FileQuestion className="h-6 w-6 text-muted-foreground" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">No certificate found</h2>
            <p className="text-sm text-muted-foreground">
              {result.reason ??
                "We don't have a signed certificate for that hash. The recording may not have been certified, or the hash is incorrect."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const verified = result.status === "verified";
  const cert = result.certificate;

  return (
    <div
      className={`mt-6 rounded-xl border p-5 ${
        verified ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-center gap-3">
        {verified ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden />
        ) : (
          <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden />
        )}
        <div>
          <h2 className="text-lg font-semibold">{verified ? "Verified" : "Tampered"}</h2>
          <p className="text-sm text-muted-foreground">
            {verified
              ? "Signature checks out against the server's public Ed25519 key."
              : (result.reason ??
                "The signed payload does not match what was provided. The recording or metadata has been altered.")}
          </p>
        </div>
      </div>

      {cert ? (
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
          <Field label="Recording ID" value={cert.recordingId} mono />
          <Field label="SHA-256" value={cert.sha256} mono wrap />
          <Field label="Recorded" value={fmtDate(cert.payload.createdAt)} />
          <Field label="Duration" value={fmtDuration(cert.payload.durationMs)} />
          <Field label="MIME type" value={cert.payload.mimeType} />
          <Field label="File size" value={fmtBytes(cert.payload.sizeBytes)} />
          <Field label="Issued" value={fmtDate(new Date(cert.issuedAt).getTime())} />
          <Field label="Algorithm" value={cert.alg} />
          <Field label="Key ID" value={cert.keyId} mono />
          <Field label="Signature" value={cert.signatureB64} mono wrap />
          <Field label="Public key" value={cert.publicKeyB64} mono wrap />
        </dl>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  wrap,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`${mono ? "font-mono" : ""} ${wrap ? "break-all" : ""} text-foreground`}>
        {value}
      </dd>
    </>
  );
}

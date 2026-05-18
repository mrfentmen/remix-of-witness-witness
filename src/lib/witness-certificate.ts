// Witness Certificate PDF generator using jsPDF defaults.
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { RecordingMeta } from "./witness-db";
import { getFlagWithDefault, STORAGE_KEYS } from "./witness-storage";
import { signCertificate, type IssuedCertificate } from "./witness-signing.functions";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "long",
  });
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function verifyUrl(meta: RecordingMeta): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  return `${origin}/verify?hash=${encodeURIComponent(meta.sha256)}`;
}

/**
 * Build a Certificate PDF.
 * If a server-issued signature is available it is embedded along with a QR
 * code that links to the public /verify page. If signing fails (offline,
 * not signed in, etc.) the certificate is still produced — just without
 * the QR/signature block.
 */
export async function buildCertificate(meta: RecordingMeta): Promise<jsPDF> {
  let issued: IssuedCertificate | null = null;
  try {
    issued = await signCertificate({
      data: {
        recordingId: meta.id,
        sha256: meta.sha256,
        createdAt: meta.createdAt,
        durationMs: meta.durationMs,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
      },
    });
  } catch (e) {
    console.warn("[witness] certificate signing failed; PDF will be unsigned", e);
  }

  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl(meta), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    });
  } catch (e) {
    console.warn("[witness] QR generation failed", e);
  }

  return renderCertificatePdf(meta, issued, qrDataUrl);
}

function renderCertificatePdf(
  meta: RecordingMeta,
  issued: IssuedCertificate | null,
  qrDataUrl: string | null,
): jsPDF {
  const anonymous = getFlagWithDefault(STORAGE_KEYS.anonymous, false);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 56;
  let y = margin;

  // Header band
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("WITNESS R.E.P", margin, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Record. Encrypt. Prove. — Tamper-Evident Recording Certificate", margin, 70);
  doc.setFillColor(255, 59, 48);
  doc.circle(W - margin, 45, 6, "F");

  y = 130;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Certificate of Authenticity", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const intro =
    "This document certifies that the recording referenced below was created on the device of the holder, encrypted at rest using AES-256-GCM, and fingerprinted with SHA-256. Any alteration of the underlying media will produce a different hash and invalidate this certificate.";
  const wrapped = doc.splitTextToSize(intro, W - margin * 2);
  doc.text(wrapped, margin, y);
  y += wrapped.length * 14 + 14;

  // Details table
  const rows: Array<[string, string]> = [
    ["Recording ID", meta.id],
    ["Holder", anonymous ? "Anonymous" : "Device holder"],
    ["Created", fmtDate(meta.createdAt)],
    ["Duration", fmtDuration(meta.durationMs)],
    ["MIME type", meta.mimeType],
    ["File size", fmtBytes(meta.sizeBytes)],
    ["Encrypted at rest", meta.encrypted ? "Yes — AES-256-GCM" : "No"],
    [
      "GPS coordinates",
      anonymous
        ? "Withheld (anonymous mode)"
        : meta.gps
          ? `${meta.gps.latitude.toFixed(6)}, ${meta.gps.longitude.toFixed(6)}${
              meta.gps.accuracy ? ` (±${Math.round(meta.gps.accuracy)} m)` : ""
            }`
          : "Not captured",
    ],
  ];

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  for (const [k, v] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(k.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const valLines = doc.splitTextToSize(v, W - margin * 2 - 140);
    doc.text(valLines, margin + 140, y);
    y += Math.max(18, valLines.length * 14 + 6);
    doc.line(margin, y - 2, W - margin, y - 2);
    y += 6;
  }

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SHA-256 FINGERPRINT", margin, y);
  y += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  // Break the 64-char hash into two lines for readability.
  const half = meta.sha256.length / 2;
  doc.text(meta.sha256.slice(0, half), margin, y);
  y += 14;
  doc.text(meta.sha256.slice(half), margin, y);
  y += 28;

  // Continuity log block
  if (meta.continuity) {
    const c = meta.continuity;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CONTINUITY LOG", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summary = c.hasGaps
      ? `${c.segments.length} segments — pause/resume detected. Recorded ${fmtDuration(
          c.totalRecordedMs,
        )} of ${fmtDuration(c.totalElapsedMs)} wall-clock.`
      : `Continuous recording — no pauses (${fmtDuration(c.totalRecordedMs)}).`;
    const lines = doc.splitTextToSize(summary, W - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 4;
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    c.segments.slice(0, 12).forEach((s, i) => {
      doc.text(
        `seg ${i + 1}: ${fmtDuration(s.startTime)} → ${fmtDuration(s.endTime)}  (${fmtDuration(s.endTime - s.startTime)})`,
        margin,
        y,
      );
      y += 11;
    });
    y += 10;
  }

  // Signature + QR block.
  if (issued || qrDataUrl) {
    const blockTop = y;
    if (qrDataUrl) {
      const qrSize = 110;
      doc.addImage(qrDataUrl, "PNG", W - margin - qrSize, blockTop - 4, qrSize, qrSize);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Scan to verify", W - margin - qrSize, blockTop + qrSize + 12);
    }
    if (issued) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text("SERVER SIGNATURE (Ed25519)", margin, y);
      y += 14;
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const sigLines = doc.splitTextToSize(issued.signatureB64, W - margin * 2 - 130);
      doc.text(sigLines, margin, y);
      y += sigLines.length * 10 + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("KEY ID", margin, y);
      doc.setFont("courier", "normal");
      doc.text(issued.keyId, margin + 60, y);
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.text("ISSUED", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(fmtDate(new Date(issued.issuedAt).getTime()), margin + 60, y);
      y += 18;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 60, 60);
      doc.text(
        "Server signature unavailable — sign in and re-export to attach a verifiable signature.",
        margin,
        y,
      );
      y += 18;
    }
    y = Math.max(y, blockTop + 130);
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Generated by Witness R.E.P. Verify at /verify by pasting the SHA-256 hash or scanning the QR code.",
    margin,
    doc.internal.pageSize.getHeight() - margin,
  );

  return doc;
}

export async function downloadCertificate(meta: RecordingMeta) {
  const doc = await buildCertificate(meta);
  const stamp = new Date(meta.createdAt).toISOString().replace(/[:.]/g, "-");
  doc.save(`witness-certificate-${stamp}.pdf`);
}

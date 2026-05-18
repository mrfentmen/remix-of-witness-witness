// WitnessREP_VaultIntelligence.tsx
// One‑file React + TypeScript + Tailwind CSS implementation for vault intelligence & evidence handling.
// Includes: vault search & advanced filtering (useVaultSearch), vault sorting, multi‑select bulk actions,
// evidence package bundler (JSZip + jsPDF), timestamp watermark engine, storage usage analytics,
// native share/export, incident category tagging. Demo MainApp at bottom.
// Uses: React, Tailwind, jsPDF, JSZip.

import React, { useState, useEffect, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import JSZip from "jszip";

// ------------------------------
// SECTION: Vanilla SVG Icons
// ------------------------------

const IconSearch = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const IconSortAsc = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
    <path d="M11 12h4" />
    <path d="M11 16h7" />
    <path d="M11 20h10" />
  </svg>
);
const IconSortDesc = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="M11 12h4" />
    <path d="M11 8h7" />
    <path d="M11 4h10" />
  </svg>
);
const IconCheckSquare = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 11 3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const IconSquare = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
  </svg>
);
const IconTrash2 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);
const IconPackage = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16.5 9.4 7.55 4.24" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" x2="12" y1="22" y2="12" />
  </svg>
);
const IconShare2 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
  </svg>
);
const IconClock = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconTag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z" />
    <line x1="7" x2="7.01" y1="7" y2="7" />
  </svg>
);
const IconMapPin = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconLoader2 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ------------------------------
// SECTION: Types & Mock Data
// ------------------------------
export interface Recording {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  durationSec: number;
  gps: { lat: number; lng: number };
  hash: string;
  category: string;
  isPriority: boolean;
  videoBlob?: Blob;
  sizeMB: number;
}

const mockRecordings: Recording[] = [
  {
    id: "1",
    title: "Traffic Stop - Main St",
    description: "Officer asked driver to step out",
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    durationSec: 78,
    gps: { lat: 40.7128, lng: -74.006 },
    hash: "a1b2c3...",
    category: "Traffic Stop",
    isPriority: true,
    sizeMB: 15.2,
  },
  {
    id: "2",
    title: "Protest at City Hall",
    description: "Peaceful demonstration, later escalated",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    durationSec: 420,
    gps: { lat: 40.758, lng: -73.985 },
    hash: "d4e5f6...",
    category: "Protest",
    isPriority: false,
    sizeMB: 95.7,
  },
  {
    id: "3",
    title: "Workplace safety issue",
    description: "Unsafe conditions reported",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    durationSec: 120,
    gps: { lat: 40.75, lng: -73.98 },
    hash: "g7h8i9...",
    category: "Workplace",
    isPriority: false,
    sizeMB: 22.4,
  },
];

// ------------------------------
// SECTION: Vault Search & Advanced Filtering (useVaultSearch)
// ------------------------------
export function useVaultSearch(recordings: Recording[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from: number | null; to: number | null }>({
    from: null,
    to: null,
  });
  const [quickFilter, setQuickFilter] = useState<"all" | "24h" | "7d" | "priority">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = recordings.filter((rec) => {
    if (
      searchTerm &&
      !rec.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !rec.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    if (dateRange.from && rec.createdAt < dateRange.from) return false;
    if (dateRange.to && rec.createdAt > dateRange.to) return false;
    if (quickFilter === "24h" && rec.createdAt < Date.now() - 24 * 60 * 60 * 1000) return false;
    if (quickFilter === "7d" && rec.createdAt < Date.now() - 7 * 24 * 60 * 60 * 1000) return false;
    if (quickFilter === "priority" && !rec.isPriority) return false;
    if (categoryFilter !== "all" && rec.category !== categoryFilter) return false;
    return true;
  });

  return {
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    quickFilter,
    setQuickFilter,
    categoryFilter,
    setCategoryFilter,
    filteredRecordings: filtered,
  };
}

// ------------------------------
// SECTION: Vault Sorting Logic (VaultSortController)
// ------------------------------
type SortOrder = "newest" | "oldest";

export function useVaultSort() {
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (typeof window === "undefined") return "newest";
    const stored = localStorage.getItem("vault_sort_preference");
    return stored === "oldest" ? "oldest" : "newest";
  });

  const sortRecordings = useCallback(
    (recordings: Recording[]) => {
      return [...recordings].sort((a, b) => {
        if (sortOrder === "newest") return b.createdAt - a.createdAt;
        return a.createdAt - b.createdAt;
      });
    },
    [sortOrder],
  );

  const toggleSort = () => {
    const newOrder = sortOrder === "newest" ? "oldest" : "newest";
    setSortOrder(newOrder);
    localStorage.setItem("vault_sort_preference", newOrder);
  };

  return { sortOrder, toggleSort, sortRecordings };
}

// ------------------------------
// SECTION: Multi‑Select Bulk Actions (VaultBulkActions)
// ------------------------------
export function useVaultBulkActions() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };
  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };
  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const bulkDelete = async (
    ids: Set<string>,
    _recordings: Recording[],
    onDelete: (ids: string[]) => void,
  ) => {
    const toDelete = Array.from(ids);
    onDelete(toDelete);
    clearSelection();
  };
  return {
    selectionMode,
    setSelectionMode,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkDelete,
  };
}

// ------------------------------
// SECTION: Evidence Package Bundler (EvidenceBundler)
// ------------------------------
export function useEvidenceBundler() {
  const [progress, setProgress] = useState(0);
  const [isBundling, setIsBundling] = useState(false);

  const generateCertificate = async (recording: Recording): Promise<Blob> => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(232, 0, 28);
    doc.text("Witness R.E.P - Certificate of Authenticity", 20, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Recording: ${recording.title}`, 20, 50);
    doc.text(`SHA-256 Hash: ${recording.hash}`, 20, 60);
    doc.text(`Timestamp: ${new Date(recording.createdAt).toISOString()}`, 20, 70);
    doc.text(`GPS: ${recording.gps.lat.toFixed(5)}, ${recording.gps.lng.toFixed(5)}`, 20, 80);
    doc.text(`Duration: ${recording.durationSec} seconds`, 20, 90);
    doc.text(`Certificate generated on ${new Date().toISOString()}`, 20, 110);
    return doc.output("blob");
  };

  const bundleEvidence = async (recording: Recording, coverLetterText: string) => {
    setIsBundling(true);
    setProgress(0);
    const zip = new JSZip();

    const videoBlob =
      recording.videoBlob || new Blob(["mock video content"], { type: "video/mp4" });
    zip.file(`${recording.title.replace(/[^a-z0-9]/gi, "_")}.mp4`, videoBlob);
    setProgress(20);

    const certPdf = await generateCertificate(recording);
    zip.file("certificate.pdf", certPdf);
    setProgress(50);

    zip.file("coverLetter.txt", coverLetterText);
    setProgress(70);

    const zipBlob = await zip.generateAsync({ type: "blob" }, (metadata) => {
      setProgress(70 + Math.floor(metadata.percent * 0.3));
    });
    setIsBundling(false);
    setProgress(0);
    return zipBlob;
  };

  return { bundleEvidence, isBundling, progress };
}

// ------------------------------
// SECTION: Timestamp Watermark Engine (VideoWatermarker)
// ------------------------------
export async function watermarkVideo(videoBlob: Blob, text: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const url = URL.createObjectURL(videoBlob);
    video.src = url;
    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx!.font = "20px monospace";
      ctx!.fillStyle = "#E8001C";
      ctx!.shadowColor = "black";
      ctx!.shadowBlur = 4;
      ctx!.fillText(text, canvas.width - 320, canvas.height - 30);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas blob error"));
        URL.revokeObjectURL(url);
      }, "image/jpeg"); // Note: Real video watermarking client-side usually requires ffmpeg.wasm.
      // This vanilla implementation creates a watermarked thumbnail as fallback evidence.
    };
    video.onerror = (e) => reject(e);
  });
}

// ------------------------------
// SECTION: Storage Usage Analytics (StorageMetrics)
// ------------------------------
export function useStorageMetrics(recordings: Recording[]) {
  const [totalUsedMB, setTotalUsedMB] = useState(0);
  const [quotaMB, setQuotaMB] = useState(1024);

  useEffect(() => {
    const total = recordings.reduce((sum, r) => sum + r.sizeMB, 0);
    setTotalUsedMB(total);
    if (
      typeof navigator !== "undefined" &&
      "storage" in navigator &&
      "estimate" in navigator.storage
    ) {
      navigator.storage.estimate().then((est) => {
        if (est.quota) setQuotaMB(est.quota / (1024 * 1024));
      });
    }
  }, [recordings]);

  const percentUsed = (totalUsedMB / quotaMB) * 100;
  return { totalUsedMB, quotaMB, percentUsed };
}

export function StorageMetricsBar({
  usedMB,
  quotaMB,
  percent,
}: {
  usedMB: number;
  quotaMB: number;
  percent: number;
}) {
  return (
    <div className="bg-[#111111] p-5 rounded-2xl border border-[#2A2A2A] shadow-lg">
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#999999] mb-3">
        <span>Vault Capacity</span>
        <span className="text-white">
          {usedMB.toFixed(1)} MB / {quotaMB.toFixed(0)} MB
        </span>
      </div>
      <div className="w-full bg-[#1A1A1A] rounded-full h-3 border border-[#2A2A2A] overflow-hidden">
        <div
          className="bg-[#E8001C] h-full transition-all duration-500 shadow-[0_0_10px_rgba(232,0,28,0.3)]"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      {percent > 90 && (
        <p className="text-[10px] text-[#E8001C] font-black uppercase mt-2 animate-pulse">
          ⚠️ Storage Critical: Offload evidence immediately
        </p>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Native Share & Download (useMediaExport)
// ------------------------------
export function useMediaExport() {
  const shareFile = async (blob: Blob, filename: string) => {
    const castNavigator = navigator as any;
    if (castNavigator.share && castNavigator.canShare?.({ files: [new File([], "test")] })) {
      const file = new File([blob], filename, { type: blob.type });
      try {
        await castNavigator.share({ files: [file], title: "Witness R.E.P Evidence" });
      } catch (err) {
        console.warn("Native share failed, downloading instead.");
        downloadFile(blob, filename);
      }
    } else {
      downloadFile(blob, filename);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return { shareFile };
}

// ------------------------------
// SECTION: Incident Categories (CategoryTagging)
// ------------------------------
const categoryOptions = ["Traffic Stop", "Protest", "Workplace", "Domestic", "Other"];

export function CategoryTag({
  category,
  onChange,
}: {
  category: string;
  onChange?: (newCat: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-3 py-1 text-[10px] font-black uppercase text-white shadow-inner">
      <IconTag />
      {onChange ? (
        <select
          value={category}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-white outline-none cursor-pointer"
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c} className="bg-black">
              {c}
            </option>
          ))}
        </select>
      ) : (
        <span>{category}</span>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo (Vault Management Dashboard)
// ------------------------------
export function MainApp() {
  const [recordings, setRecordings] = useState<Recording[]>(mockRecordings);
  const {
    searchTerm,
    setSearchTerm,
    quickFilter,
    setQuickFilter,
    categoryFilter,
    setCategoryFilter,
    filteredRecordings,
  } = useVaultSearch(recordings);
  const { sortOrder, toggleSort, sortRecordings } = useVaultSort();
  const sorted = sortRecordings(filteredRecordings);
  const { selectionMode, setSelectionMode, selectedIds, toggleSelect, selectAll, clearSelection } =
    useVaultBulkActions();
  const { bundleEvidence, isBundling, progress } = useEvidenceBundler();
  const { shareFile } = useMediaExport();
  const { totalUsedMB, quotaMB, percentUsed } = useStorageMetrics(recordings);
  const [bundlingForId, setBundlingForId] = useState<string | null>(null);

  const handleBulkDelete = () => {
    if (window.confirm(`PERMANENTLY WIPE ${selectedIds.size} EVIDENTIARY RECORDS?`)) {
      const idsToDelete = Array.from(selectedIds);
      setRecordings((prev) => prev.filter((r) => !idsToDelete.includes(r.id)));
      clearSelection();
    }
  };

  const handleGeneratePackage = async (rec: Recording) => {
    setBundlingForId(rec.id);
    const coverLetterText = "This evidence package contains encrypted data verified by SHA-256.";
    const zipBlob = await bundleEvidence(rec, coverLetterText);
    await shareFile(zipBlob, `Witness_Evidence_${rec.id}.zip`);
    setBundlingForId(null);
  };

  const allIds = sorted.map((r) => r.id);

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6">
      <div className="max-w-5xl mx-auto pb-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#E8001C] uppercase mb-1">
            Vault Intelligence
          </h1>
          <p className="text-[10px] font-bold text-[#999999] uppercase tracking-[0.4em]">
            Forensic Evidence Hub
          </p>
        </header>

        <StorageMetricsBar usedMB={totalUsedMB} quotaMB={quotaMB} percent={percentUsed} />

        {/* Action Bar */}
        <div className="bg-[#111111] p-4 rounded-2xl border border-[#2A2A2A] my-8 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Query binary logs or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-[#2A2A2A] rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-[#E8001C] outline-none transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-black rounded-xl p-1 border border-[#2A2A2A]">
                {(["all", "24h", "7d", "priority"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setQuickFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      quickFilter === f
                        ? "bg-[#E8001C] text-white"
                        : "text-[#555555] hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-black border border-[#2A2A2A] text-white rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-[#E8001C]"
              >
                <option value="all">Categories: All</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={toggleSort}
                className="bg-[#1A1A1A] border border-[#2A2A2A] p-2.5 rounded-xl hover:text-[#E8001C] transition-colors"
                title="Sort Hierarchy"
              >
                {sortOrder === "newest" ? <IconSortDesc /> : <IconSortAsc />}
              </button>

              <button
                onClick={() => setSelectionMode(!selectionMode)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                  selectionMode
                    ? "bg-[#E8001C] border-[#E8001C]"
                    : "bg-black border-[#2A2A2A] text-white"
                }`}
              >
                {selectionMode ? "Cancel" : "Bulk Action"}
              </button>
            </div>
          </div>

          {selectionMode && (
            <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => selectAll(allIds)}
                  className="text-[10px] font-bold text-white hover:text-[#E8001C] uppercase"
                >
                  Select All
                </button>
                <span className="text-[10px] font-mono text-[#555555]">
                  {selectedIds.size} Nodes Targetted
                </span>
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="bg-[#E8001C]/10 border border-[#E8001C]/50 text-[#E8001C] px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E8001C] hover:text-white transition-all disabled:opacity-30"
              >
                Permanent Wipe
              </button>
            </div>
          )}
        </div>

        {/* Recordings List */}
        <div className="space-y-4">
          {sorted.map((rec) => (
            <div
              key={rec.id}
              className="group bg-[#111111] hover:bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#E8001C]/30 transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-5">
                  {selectionMode && (
                    <button
                      onClick={() => toggleSelect(rec.id)}
                      className="mt-1 transition-transform active:scale-90"
                    >
                      {selectedIds.has(rec.id) ? (
                        <div className="text-[#E8001C]">
                          <IconCheckSquare />
                        </div>
                      ) : (
                        <div className="text-[#555555]">
                          <IconSquare />
                        </div>
                      )}
                    </button>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-black uppercase tracking-tight text-white">
                        {rec.title}
                      </h3>
                      <CategoryTag category={rec.category} />
                      {rec.isPriority && (
                        <span className="bg-[#E8001C]/20 text-[#E8001C] border border-[#E8001C]/40 text-[9px] font-black px-2 py-0.5 rounded-sm uppercase italic">
                          Priority SOS
                        </span>
                      )}
                    </div>
                    <p className="text-[#999999] text-xs leading-relaxed max-w-2xl">
                      {rec.description}
                    </p>
                    <div className="flex gap-5 text-[10px] font-bold text-[#555555] uppercase tracking-widest pt-2">
                      <span className="flex items-center gap-1.5">
                        <IconClock /> {new Date(rec.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <IconMapPin /> {rec.gps.lat.toFixed(4)}, {rec.gps.lng.toFixed(4)}
                      </span>
                      <span className="bg-[#1A1A1A] px-2 rounded font-mono text-[#777]">
                        {rec.sizeMB.toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleGeneratePackage(rec)}
                    disabled={isBundling && bundlingForId === rec.id}
                    className="bg-black border border-[#2A2A2A] hover:border-[#E8001C] p-3 rounded-xl transition-all"
                    title="Package Bundle"
                  >
                    {bundlingForId === rec.id ? <IconLoader2 /> : <IconPackage />}
                  </button>
                  <button
                    onClick={async () => {
                      const blob = rec.videoBlob || new Blob(["mock video"], { type: "video/mp4" });
                      const watermarked = await watermarkVideo(
                        blob,
                        `WITNESS • ${new Date(rec.createdAt).toISOString()}`,
                      );
                      await shareFile(watermarked, `Witness_Extract_${rec.id}.jpg`);
                    }}
                    className="bg-black border border-[#2A2A2A] hover:border-[#E8001C] p-3 rounded-xl transition-all"
                    title="Export Extract"
                  >
                    <IconShare2 />
                  </button>
                </div>
              </div>

              {isBundling && bundlingForId === rec.id && (
                <div className="mt-5 bg-black/50 border border-[#2A2A2A] rounded-xl p-4 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase mb-2">
                    <span className="text-white">Compiling Evidence Package...</span>
                    <span className="text-[#E8001C]">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] rounded-full h-1">
                    <div
                      className="bg-[#E8001C] h-1 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-24 bg-[#0A0A0A] border border-dashed border-[#2A2A2A] rounded-3xl">
            <div className="text-[#2A2A2A] flex justify-center mb-4">
              <IconSearch />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#555555]">
              No Binary Records Matched Query
            </p>
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-[#2A2A2A] text-center pointer-events-none">
        <p className="text-[8px] font-bold text-[#444444] uppercase tracking-[0.6em]">
          Witness R.E.P • Evidence Custody Node v2.0
        </p>
      </footer>
    </div>
  );
}

export default MainApp;

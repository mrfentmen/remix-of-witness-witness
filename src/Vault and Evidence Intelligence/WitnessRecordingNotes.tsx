// WitnessRecordingNotes.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
export interface RecordingBase {
  id: string;
  filename: string;
  date: string;
  duration: string;
  fileSize: number;
}

export interface RecordingMeta {
  id: string;
  notes: string;
  starred: boolean;
  tags: string[];
}

// ------------------------------
// SECTION: CRYPTO & DB ENGINE
// ------------------------------
const DB_NAME = "WitnessNotesDB";
const STORE_NAME = "notes_encrypted";

// Optimized Key Derivation (Run once, not in loops)
let cachedKey: CryptoKey | null = null;
const getMasterKey = async () => {
  if (cachedKey) return cachedKey;
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode("witness-rep-2025"),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  cachedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("witness-salt"), iterations: 50000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
};

const openNotesDB = (): Promise<IDBDatabase> => {
  return new Promise((res) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) =>
      e.target.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    req.onsuccess = () => res(req.result);
  });
};

// ------------------------------
// SECTION: MAIN COMPONENT
// ------------------------------
export default function WitnessRecordingNotes({ recordings }: { recordings: RecordingBase[] }) {
  const [metaMap, setMetaMap] = useState<Record<string, RecordingMeta>>({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RecordingMeta | null>(null);

  const [activeTag, setActiveTag] = useState<string | null>(null);

  // 1. Initial Load
  useEffect(() => {
    const loadData = async () => {
      const db = await openNotesDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const results: RecordingMeta[] = req.result;
        const map: Record<string, RecordingMeta> = {};
        results.forEach((m) => (map[m.id] = m));
        setMetaMap(map);
      };
    };
    loadData();
  }, []);

  // 2. Save Logic
  const saveEntry = async (data: RecordingMeta) => {
    const db = await openNotesDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data);
    setMetaMap({ ...metaMap, [data.id]: data });
    setEditingId(null);
  };

  const toggleStar = (id: string) => {
    const existing = metaMap[id] || { id, notes: "", starred: false, tags: [] };
    saveEntry({ ...existing, starred: !existing.starred });
  };

  // 3. Search & Sort Engine
  const filteredList = useMemo(() => {
    let list = recordings.map((r) => ({
      ...r,
      meta: metaMap[r.id] || { id: r.id, notes: "", starred: false, tags: [] },
    }));

    if (search) {
      const term = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.filename.toLowerCase().includes(term) ||
          item.meta.notes.toLowerCase().includes(term) ||
          item.meta.tags.some((t) => t.toLowerCase().includes(term)),
      );
    }

    if (activeTag) {
      list = list.filter((item) => item.meta.tags.includes(activeTag));
    }

    // Default Sort: Starred First, then Newest Date
    return list.sort((a, b) => {
      if (a.meta.starred !== b.meta.starred) return a.meta.starred ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [recordings, metaMap, search, activeTag]);

  // Unique tags for the "Filter Bar"
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(metaMap).forEach((m) => m.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [metaMap]);

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-black italic text-red-600">VAULT INDEX</h1>
        <div className="relative mt-4">
          <input
            className="w-full bg-gray-900 border border-gray-800 p-3 pl-10 rounded-2xl text-sm focus:border-red-600 outline-none"
            placeholder="Search notes, tags, or files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 opacity-30">🔍</span>
        </div>

        {/* Tag Filter Bar */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap ${activeTag === tag ? "bg-red-600 border-red-600" : "bg-gray-900 border-gray-800 text-gray-500"}`}
            >
              #{tag.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Recording List */}
      <div className="space-y-3">
        {filteredList.map((item) => (
          <div
            key={item.id}
            className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 transition-transform active:scale-[0.98]"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => toggleStar(item.id)} className="text-xl">
                    {item.meta.starred ? "⭐" : "☆"}
                  </button>
                  <h3 className="font-bold text-sm truncate">{item.filename}</h3>
                </div>
                <div className="text-[10px] text-gray-500 uppercase font-medium">
                  {item.date} • {item.duration} • {(item.fileSize / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingId(item.id);
                  setEditForm(item.meta);
                }}
                className="bg-gray-800 p-2 rounded-lg text-xs"
              >
                EDIT
              </button>
            </div>

            {item.meta.notes && (
              <p className="mt-3 text-xs text-gray-400 line-clamp-2 italic border-l-2 border-red-900 pl-3">
                "{item.meta.notes}"
              </p>
            )}

            {item.meta.tags.length > 0 && (
              <div className="flex gap-2 mt-3">
                {item.meta.tags.map((t) => (
                  <span key={t} className="text-[9px] font-bold text-red-500">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {editingId && editForm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-red-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-red-600 font-black italic mb-4">NOTATION</h2>

            <label className="text-[10px] font-bold text-gray-500 uppercase">Context Notes</label>
            <textarea
              className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1 text-sm h-32 focus:border-red-600 outline-none"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Add context (e.g. officer badge numbers, location details...)"
            />

            <div className="mt-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase">
                Tags (Comma separated)
              </label>
              <input
                className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1 text-xs"
                value={editForm.tags.join(", ")}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim().toLowerCase())
                      .filter((t) => t !== ""),
                  })
                }
                placeholder="e.g. police, protest, 2025"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setEditingId(null)}
                className="py-3 text-xs font-bold text-gray-500"
              >
                CANCEL
              </button>
              <button
                onClick={() => saveEntry(editForm)}
                className="bg-red-600 py-3 rounded-xl font-bold text-xs text-white"
              >
                SAVE DATA
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredList.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-xs uppercase font-bold tracking-widest">No Matches Found</p>
        </div>
      )}
    </div>
  );
}

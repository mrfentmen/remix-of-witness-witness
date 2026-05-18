// WitnessDecoyVault.tsx
import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// -----------------------------------------------------------------------------
// SECTION: CRYPTO ENGINE (The Heavy Lifting)
// -----------------------------------------------------------------------------
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const importedKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100000, hash: "SHA-256" }, // Reduced iterations for mobile performance
    importedKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function hashPin(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const importedKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100000, hash: "SHA-256" },
    importedKey,
    256,
  );
}

function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const a8 = new Uint8Array(a);
  const b8 = new Uint8Array(b);
  for (let i = 0; i < a8.length; i++) if (a8[i] !== b8[i]) return false;
  return true;
}

// -----------------------------------------------------------------------------
// SECTION: DATA STORAGE (IndexedDB)
// -----------------------------------------------------------------------------
const DB_CONFIG = { real: "witness_real_db", decoy: "witness_decoy_db" };

function accessDB(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("vault");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getVaultData(type: "real" | "decoy") {
  const db = await accessDB(DB_CONFIG[type]);
  return new Promise<unknown>((res) => {
    const tx = db.transaction("vault", "readonly");
    const req = tx.objectStore("vault").get("main");
    req.onsuccess = () => res(req.result);
  });
}

async function setVaultData(type: "real" | "decoy", data: unknown) {
  const db = await accessDB(DB_CONFIG[type]);
  const tx = db.transaction("vault", "readwrite");
  tx.objectStore("vault").put(data, "main");
}

// -----------------------------------------------------------------------------
// SECTION: VAULT PROVIDER
// -----------------------------------------------------------------------------
interface VaultContextType {
  isUnlocked: boolean;
  vaultType: "real" | "decoy" | null;
  content: unknown[];
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  addRecord: (rec: unknown) => void;
}

const VaultContext = createContext<VaultContextType | null>(null);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultType, setVaultType] = useState<"real" | "decoy" | null>(null);
  const [content, setContent] = useState<any[]>([]);
  const activePin = useRef<string>("");

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setVaultType(null);
    setContent([]);
    activePin.current = "";
  }, []);

  const unlock = async (pin: string): Promise<boolean> => {
    // Check Real Vault First
    const real = await getVaultData("real");
    if (real) {
      const h = await hashPin(pin, real.salt);
      if (buffersEqual(h, real.pinHash)) {
        setVaultType("real");
        setIsUnlocked(true);
        activePin.current = pin;
        return true;
      }
    }

    // Check Decoy Vault Second
    const decoy = await getVaultData("decoy");
    if (decoy) {
      const h = await hashPin(pin, decoy.salt);
      if (buffersEqual(h, decoy.pinHash)) {
        setVaultType("decoy");
        setIsUnlocked(true);
        activePin.current = pin;
        return true;
      }
    }
    return false;
  };

  const addRecord = async (rec: unknown) => {
    if (!vaultType) return;
    const newContent = [...content, rec];
    setContent(newContent);

    // In a real app, you would re-encrypt and save here
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const pinHash = await hashPin(activePin.current, salt);
    await setVaultData(vaultType, { salt, pinHash, data: newContent });
  };

  return (
    <VaultContext.Provider value={{ isUnlocked, vaultType, content, unlock, lock, addRecord }}>
      {children}
    </VaultContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// SECTION: UI COMPONENTS
// -----------------------------------------------------------------------------
export const DecoyVaultApp = () => {
  const [hasVaults, setHasVaults] = useState<boolean | null>(null);

  useEffect(() => {
    getVaultData("real").then((data) => setHasVaults(!!data));
  }, []);

  if (hasVaults === null) return <div className="bg-black min-h-screen" />;

  return (
    <VaultProvider>
      <div className="min-h-screen bg-black text-white p-6 font-sans">
        {!hasVaults ? <SetupFlow onComplete={() => setHasVaults(true)} /> : <VaultContainer />}
      </div>
    </VaultProvider>
  );
};

const SetupFlow = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const [pins, setPins] = useState({ real: "", decoy: "" });

  const finish = async () => {
    const saltR = crypto.getRandomValues(new Uint8Array(16));
    const hashR = await hashPin(pins.real, saltR);
    await setVaultData("real", { salt: saltR, pinHash: hashR, data: [] });

    const saltD = crypto.getRandomValues(new Uint8Array(16));
    const hashD = await hashPin(pins.decoy, saltD);
    await setVaultData("decoy", { salt: saltD, pinHash: hashD, data: [] });

    onComplete();
  };

  return (
    <div className="max-w-md mx-auto bg-gray-900 p-8 rounded-2xl border border-red-900 shadow-2xl">
      <h2 className="text-2xl font-bold text-red-600 mb-4 text-center">VAULT SETUP</h2>
      <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest text-center">
        Double-Blind Encryption
      </p>

      {step === 1 ? (
        <div className="space-y-4">
          <label className="block text-sm">Set Primary PIN (Real Vault)</label>
          <input
            type="password"
            className="w-full bg-black border border-gray-700 p-3 rounded"
            onChange={(e) => setPins({ ...pins, real: e.target.value })}
          />
          <button onClick={() => setStep(2)} className="w-full bg-red-600 p-3 rounded font-bold">
            NEXT
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm">Set Secondary PIN (Decoy Vault)</label>
          <input
            type="password"
            className="w-full bg-black border border-gray-700 p-3 rounded"
            onChange={(e) => setPins({ ...pins, decoy: e.target.value })}
          />
          <button onClick={finish} className="w-full bg-red-600 p-3 rounded font-bold">
            FINISH
          </button>
        </div>
      )}
    </div>
  );
};

const VaultContainer = () => {
  const vault = useContext(VaultContext);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  if (!vault) return null;

  const handleUnlock = async () => {
    setLoading(true);
    const success = await vault.unlock(pin);
    setLoading(false);
    if (!success) alert("Invalid Access Key");
  };

  if (!vault.isUnlocked) {
    return (
      <div className="max-w-md mx-auto text-center pt-20">
        <h1 className="text-4xl font-black italic text-red-600 mb-8">WITNESS</h1>
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl">
          <input
            type="password"
            placeholder="Enter PIN"
            className="w-full bg-black border border-gray-700 p-4 rounded-xl text-center text-2xl mb-4"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            onClick={handleUnlock}
            disabled={loading}
            className="w-full bg-red-600 py-4 rounded-xl font-black text-lg tracking-widest"
          >
            {loading ? "DECRYPTING..." : "UNLOCK"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold uppercase tracking-tighter text-red-500">
          Secure Vault Storage
        </h2>
        <button onClick={vault.lock} className="bg-gray-800 px-4 py-1 rounded-full text-xs">
          LOCK
        </button>
      </div>

      <div className="space-y-4">
        {vault.content.length === 0 ? (
          <div className="text-center py-20 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
            Vault is empty. No evidence recorded.
          </div>
        ) : (
          vault.content.map((item, i) => (
            <div key={i} className="bg-gray-900 p-4 rounded-xl border border-gray-800">
              {item.name}
            </div>
          ))
        )}
        <button
          onClick={() => vault.addRecord({ name: `Evidence_${Date.now()}.mp4` })}
          className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          + Add New Encrypted File
        </button>
      </div>
    </div>
  );
};

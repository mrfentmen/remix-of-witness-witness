import { describe, it, expect, beforeEach } from "vitest";
import {
  toHex,
  sha256Hex,
  encryptBlob,
  decryptToBlob,
  encryptChunk,
  decryptChunk,
  getEncryptionKey,
  looksLikeValidKeyB64,
} from "./witness-crypto";

beforeEach(() => {
  localStorage.clear();
});

describe("toHex", () => {
  it("converts Uint8Array to hex string", () => {
    const arr = new Uint8Array([0, 255, 16, 32]);
    expect(toHex(arr)).toBe("00ff1020");
  });

  it("converts ArrayBuffer to hex string", () => {
    const buf = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
    expect(toHex(buf)).toBe("deadbeef");
  });
});

describe("sha256Hex", () => {
  it("hashes an ArrayBuffer", async () => {
    const data = new TextEncoder().encode("hello");
    const hash = await sha256Hex(data.buffer);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("hashes a Blob", async () => {
    const blob = new Blob(["hello world"], { type: "text/plain" });
    const hash = await sha256Hex(blob);
    expect(hash).toHaveLength(64);
  });
});

describe("encryptBlob / decryptToBlob", () => {
  it("round-trips a small blob", async () => {
    const key = await getEncryptionKey("1234");
    const blob = new Blob(["secret evidence"], { type: "text/plain" });
    const { cipher, iv } = await encryptBlob(blob, key);
    expect(cipher.byteLength).toBeGreaterThan(0);
    const decrypted = await decryptToBlob(cipher, iv, key, "text/plain");
    const text = await decrypted.text();
    expect(text).toBe("secret evidence");
  });
});

describe("encryptChunk / decryptChunk", () => {
  it("round-trips a chunk", async () => {
    const key = await getEncryptionKey("5678");
    const chunk = new TextEncoder().encode("chunk data");
    const { cipher, iv } = await encryptChunk(chunk.buffer, key);
    expect(cipher.byteLength).toBeGreaterThan(0);
    const decrypted = await decryptChunk(cipher, iv, key);
    const text = new TextDecoder().decode(new Uint8Array(decrypted));
    expect(text).toBe("chunk data");
  });
});

describe("getEncryptionKey", () => {
  it("derives a key from a PIN", async () => {
    const key = await getEncryptionKey("1234");
    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
  });

  it("falls back to device key when no PIN", async () => {
    const key1 = await getEncryptionKey();
    const key2 = await getEncryptionKey();
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
  });

  it("throws on corrupted master key", async () => {
    localStorage.setItem("@Witness_master", "not-valid-base64!!!");
    await expect(getEncryptionKey()).rejects.toThrow("Vault key corrupted");
  });
});

describe("looksLikeValidKeyB64", () => {
  it("returns true for a valid 32-byte base64 key", () => {
    const valid = btoa(String.fromCharCode(...new Uint8Array(32)));
    expect(looksLikeValidKeyB64(valid)).toBe(true);
  });

  it("returns false for invalid base64", () => {
    expect(looksLikeValidKeyB64("not-valid!!!")).toBe(false);
  });

  it("returns false for wrong length", () => {
    const short = btoa(String.fromCharCode(...new Uint8Array(16)));
    expect(looksLikeValidKeyB64(short)).toBe(false);
  });
});

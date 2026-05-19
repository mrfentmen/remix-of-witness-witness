# Witness R.E.P — AI Context Memory

## Project Overview

A privacy-first recording & evidence preservation app built with **TanStack Start** + **Vite** + **React**, deployed to **Cloudflare Workers**. Features encrypted vault storage, crash-safe chunked recording, GPS tracking, and AI forensics.

## Technical Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (React Router v7) |
| Bundler | Vite |
| Language | TypeScript |
| Database | IndexedDB via `idb` + `fake-indexeddb` (tests) |
| CSS | Plain CSS (styles.css) |
| Testing | Vitest + @testing-library/react |
| CI/CD | GitHub Actions → Cloudflare Workers |
| Crypto | Web Crypto API (AES-GCM + PBKDF2) via `@peculiar/webcrypto` polyfill |

## Key Architecture Decisions

### 1. Blob Storage in IndexedDB

**Problem:** `fake-indexeddb`'s structured clone cannot serialize jsdom `Blob` objects. When a `Blob` is written to IndexedDB and read back, it returns an empty `{}` object with no data.

**Solution:** Store blob data as `Uint8Array` (`blobBytes` field) instead of raw `Blob`. Reconstruct `Blob` instances on retrieval.

**Files:** `src/lib/witness-db.ts`
- `RecordingChunk.blobBytes?: Uint8Array`
- `StoredRecording.blobBytes?: Uint8Array`
- `saveRecordingChunk()` — stores `blobBytes` (not `blob`) for unencrypted chunks
- `finalizeRecordingSession()` — reconstructs Blob from `blobBytes`
- `getRecordingBlob()` / `getRecordingRaw()` — reconstructs Blob from `blobBytes`

### 2. Cross-realm Typed Arrays (fake-indexeddb + @peculiar/webcrypto)

**Problem:** `fake-indexeddb` returns `Uint8Array`/`ArrayBuffer` from a **different JavaScript realm**. These objects pass `typeof` checks and `Object.prototype.toString` shows `[object Uint8Array]`, but **`instanceof` returns `false`**. The `@peculiar/webcrypto` polyfill uses `instanceof` internally to validate parameters, throwing `TypeError: iv: Is not of type '(ArrayBuffer or ArrayBufferView)'`.

**Solution:** Create in-realm copies by allocating fresh typed arrays and copying bytes with `.set()`.

**Files:** `src/lib/witness-db.ts`
- `toInRealmArrayBuffer(ab)` — copies bytes into new in-realm `ArrayBuffer`
- `toInRealmUint8Array(u8)` — copies bytes into new in-realm `Uint8Array`
- Applied in `finalizeRecordingSession()` (chunk decryption) and `getRecordingBlob()` (stored recording decryption)

### 3. PBKDF2 Performance in Tests

**Problem:** Default 150,000 PBKDF2 iterations used in production is extremely slow in pure-JS WebCrypto polyfills (jsdom), causing test timeouts (5s+).

**Solution:** Export `__setPBKDF2Iters(n)` to override iteration count in tests. Set to 10 iterations in test `beforeEach`.

**Files:** `src/lib/witness-crypto.ts`, `src/test/integration/recording-to-vault.test.ts`

## Test Infrastructure

| Test file | Environment | What it tests |
|---|---|---|
| `src/test/integration/recording-to-vault.test.ts` | jsdom | 6 integration tests: unencrypted, encrypted (+ decrypt), pause/resume, crash recovery, error handling, multiple recordings |
| `src/lib/witness-db.test.ts` | default | 8 unit tests for DB operations |
| `src/lib/witness-uploader.test.ts` | default | 5 unit tests for uploader |
| `src/lib/witness-crypto.test.ts` | default | Crypto tests |
| `src/hooks/use-media-recorder.test.ts` | default | 6 hook tests |

**Note:** The integration test file uses `// @vitest-environment jsdom` to provide browser APIs (Blob, MediaRecorder mock). This is why all the cross-realm issues occur — vitest runs the test in a jsdom realm but `fake-indexeddb` and `@peculiar/webcrypto` run in the Node realm.

**CI Pipeline** (`.github/workflows/deploy.yml`):
1. Setup Bun with caching
2. Install dependencies
3. Run unit tests (`--exclude integration`)
4. Run integration tests (all 6)
5. Build
6. Deploy to Cloudflare Workers

## Deployment

- **Live URL:** https://tanstack-start-app.contactae2000.workers.dev/
- **Auth:** The `/.env` file (gitignored) contains the Cloudflare API token
- **Worker config:** `wrangler.jsonc` (Cloudflare Workers configuration)

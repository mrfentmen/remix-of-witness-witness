// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Read a Blob to text in a way that works across environments.
 */
async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === "function") {
    return await blob.text();
  }
  const buf = await blob.arrayBuffer();
  return new TextDecoder().decode(buf);
}
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { useMediaRecorder } from "@/hooks/use-media-recorder";
import * as witnessDb from "@/lib/witness-db";
import type { RecordingMeta } from "@/lib/witness-db";


/* ------------------------------------------------------------------
 * Mock the cloud layer so the test stays offline / fast.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
 * Mock MediaRecorder & MediaStream (not available in jsdom).
 * ------------------------------------------------------------------ */
class MockBlobEvent extends Event {
  data: Blob;
  constructor(type: string, init: { data: Blob }) {
    super(type);
    this.data = init.data;
  }
}

let lastMockRecorder: MockMediaRecorder | null = null;

class MockMediaRecorder extends EventTarget {
  static isTypeSupported = () => true;
  state: "inactive" | "recording" | "paused" = "inactive";
  stream: MediaStream;
  mimeType: string;
  private chunkCounter = 0;

  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    super();
    this.stream = stream;
    this.mimeType = options?.mimeType || "video/webm";
    lastMockRecorder = this;
  }

  start(_timeslice?: number) {
    this.state = "recording";
    // Tests emit chunks manually for deterministic behaviour.
  }

  emitChunk(data?: string) {
    const payload = data ?? `chunk-${this.chunkCounter++}`;
    const blob = new Blob([payload], { type: this.mimeType || "video/webm" });
    this.dispatchEvent(new MockBlobEvent("dataavailable", { data: blob }));
  }

  stop() {
    this.state = "inactive";
    this.dispatchEvent(new Event("stop"));
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  /** Fire an error event the same way the browser would. */
  emitError(message = "Recorder error") {
    const ev = new Event("error") as Event & { error?: Error };
    ev.error = new Error(message);
    this.dispatchEvent(ev);
  }

  // The real MediaRecorder invokes onxxx properties when events fire.
  dispatchEvent(event: Event): boolean {
    const handler = (this as Record<string, unknown>)[`on${event.type}`];
    if (typeof handler === "function") {
      (handler as (e: Event) => void).call(this, event);
    }
    return super.dispatchEvent(event);
  }
}

class MockMediaStream {
  getTracks() {
    return [];
  }
  addTrack() {}
  removeTrack() {}
  getAudioTracks() {
    return [];
  }
  getVideoTracks() {
    return [];
  }
}

describe("Recording-to-Vault Integration", () => {
  beforeEach(async () => {
    localStorage.clear();
    witnessDb.__resetDBForTests();
    const db = await witnessDb.getDB();
    await db.clear("recordings");
    await db.clear("chunks");
    await db.clear("sessions");
    lastMockRecorder = null;
    // Force the hook to pick video/webm by making only that codec "supported".
    MockMediaRecorder.isTypeSupported = (type: string) => type === "video/webm";
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("MediaStream", MockMediaStream);
  });

  afterEach(async () => {
    cleanup();
    // Allow any pending DB / effect microtasks to finish before the next test.
    await new Promise((r) => setTimeout(r, 50));
    vi.unstubAllGlobals();
  });

  /* ── Helpers ─────────────────────────────────────────────── */

  function getRecorder() {
    if (!lastMockRecorder) throw new Error("No MockMediaRecorder instance created yet");
    return lastMockRecorder;
  }

  type HookResult = { current: ReturnType<typeof useMediaRecorder> };

  /** Wait for the hook to finish saving after stop(). */
  async function waitForStopped(result: HookResult) {
    await waitFor(
      () => {
        const s = result.current.state;
        if (s !== "stopped" && s !== "error") {
          throw new Error(`Still in state: ${s}`);
        }
      },
      { timeout: 5000 },
    );
  }

  /** Wait until the vault contains exactly N recordings. */
  async function waitForVaultCount(count: number) {
    await waitFor(
      async () => {
        const vault = await witnessDb.listRecordings();
        if (vault.length !== count) {
          throw new Error(`Vault has ${vault.length} recordings, expected ${count}`);
        }
      },
      { timeout: 5000 },
    );
  }

  /* ── 1. Unencrypted happy path ─────────────────────────────── */

  it("records unencrypted video, persists chunks, finalizes, and retrieves from vault", async () => {
    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe("recording");

    act(() => getRecorder().emitChunk("alpha"));
    act(() => getRecorder().emitChunk("bravo"));

    // Wait until chunks are persisted before stopping to avoid a race.
    await waitFor(
      async () => {
        const unfinalized = await witnessDb.recoverUnfinalizedSessions();
        expect(unfinalized).toHaveLength(1);
        expect(unfinalized[0].chunkCount).toBe(2);
      },
      { timeout: 10000 },
    );

    act(() => result.current.stop());
    await waitForStopped(result);
    await waitForVaultCount(1);

    // Hook should surface the finalized result
    expect(result.current.lastResult).not.toBeNull();
    expect(result.current.lastResult!.mimeType).toBe("video/webm");

    const vault = await witnessDb.listRecordings();
    expect(vault[0].encrypted).toBe(false);
    expect(vault[0].mimeType).toBe("video/webm");

    const unfinalized = await witnessDb.recoverUnfinalizedSessions();
    expect(unfinalized).toHaveLength(0);

    const retrieved = await witnessDb.getRecordingBlob(vault[0].id);
    expect(retrieved).not.toBeNull();
    const text = await readBlobText(retrieved!.blob);
    expect(text).toBe("alphabravo");
  });

  /* ── 2. Encrypted happy path ──────────────────────────────── */

  it("records encrypted video with PIN, decrypts from vault, and verifies integrity", async () => {
    const stream = new MediaStream();
    const { result } = renderHook(() =>
      useMediaRecorder(stream, { encrypt: true, pin: "witness-pin" }),
    );

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe("recording");

    act(() => getRecorder().emitChunk("secret-chunk-1"));
    act(() => getRecorder().emitChunk("secret-chunk-2"));

    await waitFor(
      async () => {
        const unfinalized = await witnessDb.recoverUnfinalizedSessions();
        expect(unfinalized[0].chunkCount).toBe(2);
      },
      { timeout: 10000 },
    );

    act(() => result.current.stop());
    await waitForStopped(result);
    await waitForVaultCount(1);

    const vault = await witnessDb.listRecordings();
    expect(vault[0].encrypted).toBe(true);

    const raw = await witnessDb.getRecordingRaw(vault[0].id);
    expect(raw).not.toBeNull();
    if (raw && raw.encrypted) {
      expect(raw.cipher.byteLength).toBeGreaterThan(0);
    }

    const decrypted = await witnessDb.getRecordingBlob(vault[0].id, "witness-pin");
    expect(decrypted).not.toBeNull();
    const text = await readBlobText(decrypted!.blob);
    expect(text).toBe("secret-chunk-1secret-chunk-2");

    await expect(witnessDb.getRecordingBlob(vault[0].id, "wrong-pin")).rejects.toThrow();
  });

  /* ── 3. Pause / resume during recording ───────────────────── */

  it("pauses and resumes while continuing to persist chunks", async () => {
    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe("recording");

    act(() => getRecorder().emitChunk("before-pause"));

    act(() => result.current.pause());
    expect(result.current.state).toBe("paused");

    // When the real recorder is paused it does not emit dataavailable.
    // handler is still registered, so the chunk would be saved.
    // We skip emitting during pause to match real behaviour.

    act(() => result.current.resume());
    expect(result.current.state).toBe("recording");

    act(() => getRecorder().emitChunk("after-resume"));

    await waitFor(
      async () => {
        const unfinalized = await witnessDb.recoverUnfinalizedSessions();
        expect(unfinalized[0].chunkCount).toBe(2);
      },
      { timeout: 10000 },
    );

    act(() => result.current.stop());
    await waitForStopped(result);
    await waitForVaultCount(1);

    const blob = await witnessDb.getRecordingBlob((await witnessDb.listRecordings())[0].id);
    const text = await readBlobText(blob!.blob);
    expect(text).toBe("before-pauseafter-resume");
  });

  /* ── 4. Crash recovery flow ──────────────────────────────── */

  it("recovers an unfinalized session after simulated crash", async () => {
    const stream = new MediaStream();

    // First mount: start recording but never let the hook see onstop.
    const { result, unmount } = renderHook(() => useMediaRecorder(stream));

    await act(async () => {
      await result.current.start();
    });
    expect(lastMockRecorder).not.toBeNull();
    act(() => getRecorder().emitChunk("crash-chunk-1"));
    act(() => getRecorder().emitChunk("crash-chunk-2"));

    // Ensure both chunks are persisted before we simulate the crash.
    await waitFor(
      async () => {
        const unfinalized = await witnessDb.recoverUnfinalizedSessions();
        expect(unfinalized).toHaveLength(1);
        expect(unfinalized[0].chunkCount).toBe(2);
      },
      { timeout: 10000 },
    );

    // Override stop() so the cleanup effect (which calls rec.stop())
    // does not dispatch the "stop" event → onstop never runs → session stays unfinalized.
    const rec = getRecorder();
    const originalStop = rec.stop.bind(rec);
    rec.stop = () => {
      rec.state = "inactive";
      // Intentionally do NOT dispatch "stop" event.
    };
    unmount();
    rec.stop = originalStop;

    // Verify the session is still unfinalized
    const unfinalized = await witnessDb.recoverUnfinalizedSessions();
    expect(unfinalized).toHaveLength(1);
    expect(unfinalized[0].chunkCount).toBe(2);

    // Second mount: hook should surface the recoverable session
    const { result: result2 } = renderHook(() => useMediaRecorder(stream));
    await waitFor(() => expect(result2.current.recoverable).not.toBeNull());
    expect(result2.current.recoverable!.chunkCount).toBe(2);

    await act(async () => {
      await result2.current.recoverSession();
    });
    await waitFor(() => expect(result2.current.recoverable).toBeNull());
    await waitForVaultCount(1);

    const vault = await witnessDb.listRecordings();
    const blob = await witnessDb.getRecordingBlob(vault[0].id);
    const text = await readBlobText(blob!.blob);
    expect(text).toBe("crash-chunk-1crash-chunk-2");
  });

  /* ── 5. Recorder error still finalizes partial recording ─ */

  it("finalizes a partial recording when the recorder errors", async () => {
    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe("recording");

    act(() => getRecorder().emitChunk("partial-1"));
    act(() => getRecorder().emitChunk("partial-2"));

    await waitFor(
      async () => {
        const unfinalized = await witnessDb.recoverUnfinalizedSessions();
        expect(unfinalized[0].chunkCount).toBe(2);
      },
      { timeout: 10000 },
    );

    act(() => getRecorder().emitError("MediaRecorder crashed"));
    await waitForStopped(result);
    await waitForVaultCount(1);

    expect(result.current.error).toContain("MediaRecorder crashed");

    const vault = await witnessDb.listRecordings();
    const blob = await witnessDb.getRecordingBlob(vault[0].id);
    const text = await readBlobText(blob!.blob);
    expect(text).toBe("partial-1partial-2");
  });

  /* ── 6. Multiple recordings are independently stored ─────── */

  it("stores multiple recordings independently in the vault", async () => {
    const stream = new MediaStream();
    const ids: string[] = [];

    for (let i = 0; i < 3; i++) {
      lastMockRecorder = null;
      const { result } = renderHook(() => useMediaRecorder(stream));

      await act(async () => {
        await result.current.start();
      });
      act(() => getRecorder().emitChunk(`recording-${i}-a`));
      act(() => getRecorder().emitChunk(`recording-${i}-b`));

      await waitFor(
        async () => {
          const unfinalized = await witnessDb.recoverUnfinalizedSessions();
          expect(unfinalized[0].chunkCount).toBe(2);
        },
        { timeout: 10000 },
      );

      act(() => result.current.stop());
      await waitForStopped(result);
      await waitForVaultCount(i + 1);

      const vault = await witnessDb.listRecordings();
      ids.push(vault[0].id);
    }

    const vault = await witnessDb.listRecordings();
    expect(vault).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});

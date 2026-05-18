// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMediaRecorder } from "./use-media-recorder";

vi.mock("@/lib/witness-db", () => ({
  startRecordingSession: vi.fn().mockResolvedValue("session-123"),
  saveRecordingChunk: vi.fn().mockResolvedValue({
    id: "session-123",
    createdAt: Date.now(),
    durationMs: 1000,
    mimeType: "video/webm",
    sizeBytes: 1024,
    sha256: "abc",
    encrypted: false,
    gps: null,
    thumbnailDataUrl: null,
  }),
  finalizeRecordingSession: vi.fn().mockResolvedValue({
    id: "session-123",
    createdAt: Date.now(),
    durationMs: 1000,
    mimeType: "video/webm",
    sizeBytes: 1024,
    sha256: "abc",
    encrypted: false,
    gps: null,
    thumbnailDataUrl: null,
  }),
  recoverUnfinalizedSessions: vi.fn(),
  discardSession: vi.fn(),
  getRecordingBlob: vi.fn().mockResolvedValue({
    blob: new Blob(["test"], { type: "video/webm" }),
    mimeType: "video/webm",
  }),
  __resetDBForTests: vi.fn(),
}));

class MockBlobEvent extends Event {
  data: Blob;
  constructor(type: string, init: { data: Blob }) {
    super(type);
    this.data = init.data;
  }
}

class MockMediaRecorder extends EventTarget {
  static isTypeSupported = () => true;
  state = "inactive";
  stream: MediaStream;
  mimeType: string;
  private timer?: ReturnType<typeof setInterval>;

  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    super();
    this.stream = stream;
    this.mimeType = options?.mimeType || "";
  }

  start(timeslice?: number) {
    this.state = "recording";
    if (timeslice) {
      this.timer = setInterval(() => {
        this.dispatchEvent(
          new MockBlobEvent("dataavailable", {
            data: new Blob(["chunk"], { type: this.mimeType || "video/webm" }),
          }),
        );
      }, timeslice);
    }
  }

  stop() {
    this.state = "inactive";
    if (this.timer) clearInterval(this.timer);
    this.dispatchEvent(new Event("stop"));
  }

  pause() {
    this.state = "paused";
    if (this.timer) clearInterval(this.timer);
  }

  resume() {
    this.state = "recording";
  }

  // EventTarget.dispatchEvent does NOT invoke onxxx properties by default.
  // The real MediaRecorder does, so we mimic that for our hook tests.
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

describe("useMediaRecorder", () => {
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("MediaStream", MockMediaStream);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts in inactive state", () => {
    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));
    expect(result.current.state).toBe("inactive");
    expect(result.current.error).toBeNull();
  });

  it("transitions to recording on start", async () => {
    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe("recording");
  });

  it("transitions to stopped after stop", async () => {
    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe("recording");

    act(() => {
      result.current.stop();
    });

    await waitFor(() => expect(result.current.state).toBe("stopped"));
    expect(result.current.lastResult).not.toBeNull();
    expect(result.current.lastResult?.mimeType).toBe("video/webm");
  });

  it("pauses and resumes correctly", async () => {
    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe("recording");

    act(() => {
      result.current.pause();
    });
    expect(result.current.state).toBe("paused");

    act(() => {
      result.current.resume();
    });
    expect(result.current.state).toBe("recording");
  });

  it("shows recoverable session when unfinalized sessions exist", async () => {
    const dbModule = await import("@/lib/witness-db");
    vi.mocked(dbModule.recoverUnfinalizedSessions).mockResolvedValue([
      {
        sessionId: "crash-id",
        startedAt: Date.now() - 60000,
        chunkCount: 5,
        mimeType: "video/webm",
        totalSizeBytes: 102400,
        encrypt: false,
        gps: null,
        thumbnailDataUrl: null,
        category: null,
        gpsTrack: null,
        quality: null,
        zoom: null,
        nightMode: null,
        continuity: null,
        covert: null,
        notes: null,
        tags: null,
        finalized: false,
      },
    ]);

    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await waitFor(() => expect(result.current.recoverable).not.toBeNull());
    expect(result.current.recoverable?.sessionId).toBe("crash-id");
    expect(result.current.recoverable?.chunkCount).toBe(5);
  });

  it("dismisses recovery session", async () => {
    const dbModule = await import("@/lib/witness-db");
    vi.mocked(dbModule.recoverUnfinalizedSessions).mockResolvedValue([
      {
        sessionId: "discard-id",
        startedAt: Date.now() - 30000,
        chunkCount: 2,
        mimeType: "video/webm",
        totalSizeBytes: 51200,
        encrypt: false,
        gps: null,
        thumbnailDataUrl: null,
        category: null,
        gpsTrack: null,
        quality: null,
        zoom: null,
        nightMode: null,
        continuity: null,
        covert: null,
        notes: null,
        tags: null,
        finalized: false,
      },
    ]);

    const stream = new MediaStream();
    const { result } = renderHook(() => useMediaRecorder(stream));

    await waitFor(() => expect(result.current.recoverable).not.toBeNull());

    await act(async () => {
      await result.current.dismissRecovery();
    });

    expect(result.current.recoverable).toBeNull();
  });
});

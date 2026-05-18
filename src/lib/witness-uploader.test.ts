import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

    uploadUrl: "https://s3.example.com/upload",
  }),
}));

}));

}));

}));

  setString: vi.fn(),
  STORAGE_KEYS: {
    wifiOnly: "@Witness_wifiOnly",
    pin: "@Witness_pin",
  },
}));

  getRecordingRaw: vi.fn(),
}));

interface MockXHR {
  open: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  setRequestHeader: ReturnType<typeof vi.fn>;
  upload: { onprogress: ((this: XMLHttpRequestUpload, ev: ProgressEvent) => void) | null };
  status: number;
  onload: ((this: XMLHttpRequest, ev: ProgressEvent) => void) | null;
  onerror: ((this: XMLHttpRequest, ev: ProgressEvent) => void) | null;
  ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent) => void) | null;
  onabort: ((this: XMLHttpRequest, ev: ProgressEvent) => void) | null;
  onloadend: ((this: XMLHttpRequest, ev: ProgressEvent) => void) | null;
}

function createMockXHR() {
  const xhr: MockXHR = {
    open: vi.fn(),
    send: vi.fn(),
    abort: vi.fn(),
    setRequestHeader: vi.fn(),
    upload: { onprogress: null },
    status: 200,
    onload: null,
    onerror: null,
    ontimeout: null,
    onabort: null,
    onloadend: null,
  };
    setTimeout(() => {
      if (xhr.onload) xhr.onload();
    }, 10);
  });
  return xhr;
}

describe("witness-uploader", () => {
  let uploaderModule: typeof import("./witness-uploader");
  let dbModule: typeof import("./witness-db");

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();

    uploaderModule = await import("./witness-uploader");
    dbModule = await import("./witness-db");


    vi.stubGlobal("XMLHttpRequest", function MockXMLHttpRequest() {
      return createMockXHR();
    } as unknown as typeof XMLHttpRequest);

    const { isWifiOrUnknown } = await import("./network");
    const { getFlagWithDefault } = await import("./witness-storage");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getUploadState returns idle for unknown id", () => {
    const state = uploaderModule.getUploadState("unknown-id");
    expect(state.status).toBe("idle");
    expect(state.progress).toBe(0);
  });

  it("resetUpload removes upload state", async () => {
    const { uploadRecording, getUploadState, resetUpload } = uploaderModule;

    try {
      await uploadRecording("test-id");
    } catch {
      /* expected — recording not found */
    }

    expect(getUploadState("test-id").status).toBe("error");
    resetUpload("test-id");
    expect(getUploadState("test-id").status).toBe("idle");
  });

  it("uploadRecording uploads encrypted recording successfully", async () => {
    const cipher = new Uint8Array([1, 2, 3]).buffer;
    const iv = new Uint8Array([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

      meta: {
        id: "rec-1",
        createdAt: Date.now(),
        durationMs: 1000,
        mimeType: "video/webm",
        sizeBytes: 1024,
        sha256: "abc123",
        encrypted: true,
        gps: null,
        thumbnailDataUrl: null,
      },
      encrypted: true,
      cipher,
      iv,
    } as unknown);

    const { uploadRecording, getUploadState } = uploaderModule;
    await uploadRecording("rec-1");
    expect(getUploadState("rec-1").status).toBe("done");
    expect(getUploadState("rec-1").objectKey).toBe("recordings/rec-1.witness.enc");
  });

  it("uploadRecording respects WiFi-only gate", async () => {
    const networkModule = await import("./network");

    const storageModule = await import("./witness-storage");

    const { uploadRecording, getUploadState } = uploaderModule;
    await uploadRecording("rec-wifi");
    expect(getUploadState("rec-wifi").status).toBe("waiting-wifi");
  });

  it("retryPendingUploads retries errored uploads", async () => {

    const { uploadRecording, retryPendingUploads, getUploadState } = uploaderModule;

    try {
      await uploadRecording("retry-id");
    } catch {
      /* expected */
    }
    expect(getUploadState("retry-id").status).toBe("error");

      meta: {
        id: "retry-id",
        createdAt: Date.now(),
        durationMs: 100,
        mimeType: "video/webm",
        sizeBytes: 10,
        sha256: "hash",
        encrypted: false,
        gps: null,
        thumbnailDataUrl: null,
      },
      encrypted: false,
      blob: new Blob(["x"], { type: "video/webm" }),
    } as unknown);

    await retryPendingUploads();
    expect(getUploadState("retry-id").status).toBe("done");
  });
});

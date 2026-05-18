import { describe, it, expect, beforeEach, vi } from "vitest";

}));

describe("witness-db", () => {
  let dbModule: typeof import("./witness-db");

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    dbModule = await import("./witness-db");
    dbModule.__resetDBForTests();
    const db = await dbModule.getDB();
    await db.clear("recordings");
    await db.clear("chunks");
    await db.clear("sessions");
  });

  it("startRecordingSession creates a session", async () => {
    const sessionId = await dbModule.startRecordingSession({
      mimeType: "video/webm",
      encrypt: false,
      gps: null,
      thumbnailDataUrl: null,
    });
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(0);
  });

  it("saveRecordingChunk persists data", async () => {
    const sessionId = await dbModule.startRecordingSession({
      mimeType: "video/webm",
      encrypt: false,
      gps: null,
      thumbnailDataUrl: null,
    });
    const chunk = new Blob(["chunk1"], { type: "video/webm" });
    await dbModule.saveRecordingChunk(sessionId, chunk);

    const sessions = await dbModule.recoverUnfinalizedSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].chunkCount).toBe(1);
    expect(sessions[0].totalSizeBytes).toBe(chunk.size);
  });

  it("finalizeRecordingSession creates a recording without encryption", async () => {
    const sessionId = await dbModule.startRecordingSession({
      mimeType: "video/webm",
      encrypt: false,
      gps: null,
      thumbnailDataUrl: null,
    });
    const chunk = new Blob(["test data"], { type: "video/webm" });
    await dbModule.saveRecordingChunk(sessionId, chunk);

    const meta = await dbModule.finalizeRecordingSession(sessionId, 1000);
    expect(meta.id).toBe(sessionId);
    expect(meta.mimeType).toBe("video/webm");
    expect(meta.durationMs).toBe(1000);
    expect(meta.encrypted).toBe(false);

    const recordings = await dbModule.listRecordings();
    expect(recordings).toHaveLength(1);

    const unfinalized = await dbModule.recoverUnfinalizedSessions();
    expect(unfinalized).toHaveLength(0);
  });

  it("finalizeRecordingSession creates an encrypted recording", async () => {
    const sessionId = await dbModule.startRecordingSession({
      mimeType: "video/webm",
      encrypt: true,
      gps: null,
      thumbnailDataUrl: null,
    });
    const chunk = new Blob(["secret"], { type: "video/webm" });
    await dbModule.saveRecordingChunk(sessionId, chunk, "1234");

    const meta = await dbModule.finalizeRecordingSession(sessionId, 500, "1234");
    expect(meta.encrypted).toBe(true);

    const raw = await dbModule.getRecordingRaw(sessionId);
    expect(raw).not.toBeNull();
    if (raw && raw.encrypted) {
      expect(raw.cipher.byteLength).toBeGreaterThan(0);
    }
  });

  it("getRecordingBlob decrypts an encrypted recording", async () => {
    const sessionId = await dbModule.startRecordingSession({
      mimeType: "video/webm",
      encrypt: true,
      gps: null,
      thumbnailDataUrl: null,
    });
    const chunk = new Blob(["decrypt me"], { type: "video/webm" });
    await dbModule.saveRecordingChunk(sessionId, chunk, "1234");

    await dbModule.finalizeRecordingSession(sessionId, 500, "1234");

    const result = await dbModule.getRecordingBlob(sessionId, "1234");
    expect(result).not.toBeNull();
    if (result) {
      const text = await result.blob.text();
      expect(text).toBe("decrypt me");
    }
  });

  it("deleteRecording removes a recording", async () => {
    const meta = await dbModule.saveRecording({
      blob: new Blob(["x"], { type: "video/webm" }),
      mimeType: "video/webm",
      durationMs: 100,
      gps: null,
      thumbnailDataUrl: null,
      encrypt: false,
    });

    let recordings = await dbModule.listRecordings();
    expect(recordings).toHaveLength(1);

    await dbModule.deleteRecording(meta.id);
    recordings = await dbModule.listRecordings();
    expect(recordings).toHaveLength(0);
  });

  it("discardSession removes unfinalized session", async () => {
    const sessionId = await dbModule.startRecordingSession({
      mimeType: "video/webm",
      encrypt: false,
      gps: null,
      thumbnailDataUrl: null,
    });
    await dbModule.saveRecordingChunk(sessionId, new Blob(["x"], { type: "video/webm" }));

    let sessions = await dbModule.recoverUnfinalizedSessions();
    expect(sessions).toHaveLength(1);

    await dbModule.discardSession(sessionId);
    sessions = await dbModule.recoverUnfinalizedSessions();
    expect(sessions).toHaveLength(0);
  });

  it("updateRecordingDetails patches metadata", async () => {
    const meta = await dbModule.saveRecording({
      blob: new Blob(["x"], { type: "video/webm" }),
      mimeType: "video/webm",
      durationMs: 100,
      gps: null,
      thumbnailDataUrl: null,
      encrypt: false,
    });

    const updated = await dbModule.updateRecordingDetails(meta.id, {
      title: "Updated",
      description: "Desc",
    });
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Updated");
    expect(updated?.description).toBe("Desc");
  });
});

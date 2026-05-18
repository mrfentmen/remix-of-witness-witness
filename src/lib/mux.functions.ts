import { createServerFn } from "@tanstack/react-start";

export interface MuxLiveStream {
  streamId: string;
  streamKey: string;
  playbackId: string;
  rtmpUrl: string;
  whipUrl: string;
  playbackUrl: string;
}

export const createMuxLiveStream = createServerFn({ method: "POST" }).handler(
  async (): Promise<MuxLiveStream> => {
    const id = process.env.MUX_TOKEN_ID;
    const secret = process.env.MUX_TOKEN_SECRET;
    if (!id || !secret) throw new Error("Mux credentials not configured");

    const auth = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetch("https://api.mux.com/video/v1/live-streams", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playback_policy: ["public"],
        new_asset_settings: { playback_policy: ["public"] },
        latency_mode: "low",
        reconnect_window: 60,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Mux create stream failed (${res.status}): ${t}`);
    }
    const json = (await res.json()) as {
      data: {
        id: string;
        stream_key: string;
        playback_ids: { id: string; policy: string }[];
      };
    };
    const playbackId = json.data.playback_ids[0]?.id;
    if (!playbackId) throw new Error("Mux returned no playback ID");
    const streamKey = json.data.stream_key;
    return {
      streamId: json.data.id,
      streamKey,
      playbackId,
      rtmpUrl: "rtmps://global-live.mux.com:443/app",
      whipUrl: `https://global-live.mux.com/api/v2/live/${streamKey}/whip`,
      playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
    };
  },
);

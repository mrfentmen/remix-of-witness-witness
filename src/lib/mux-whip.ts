// WHIP (WebRTC-HTTP Ingest Protocol) publisher for Mux live streams.
// Pushes a MediaStream from the browser directly to Mux without RTMP.

export interface WhipSession {
  pc: RTCPeerConnection;
  resourceUrl: string | null;
  stop: () => Promise<void>;
}

export async function publishWhip(whipUrl: string, stream: MediaStream): Promise<WhipSession> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    bundlePolicy: "max-bundle",
  });

  // Add tracks (sendonly).
  for (const track of stream.getTracks()) {
    pc.addTransceiver(track, { direction: "sendonly", streams: [stream] });
  }

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering to complete (Mux WHIP expects a complete SDP).
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(resolve, 3000); // safety
  });

  const res = await fetch(whipUrl, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: pc.localDescription?.sdp ?? "",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    pc.close();
    throw new Error(`WHIP publish failed (${res.status}): ${t}`);
  }
  const answer = await res.text();
  const resourceUrl = res.headers.get("location");
  await pc.setRemoteDescription({ type: "answer", sdp: answer });

  const stop = async () => {
    try {
      if (resourceUrl) {
        const url = resourceUrl.startsWith("http")
          ? resourceUrl
          : new URL(resourceUrl, whipUrl).toString();
        await fetch(url, { method: "DELETE" }).catch(() => undefined);
      }
    } finally {
      pc.getSenders().forEach((s) => s.track?.stop());
      pc.close();
    }
  };

  return { pc, resourceUrl, stop };
}

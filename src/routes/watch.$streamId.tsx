import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { Radio, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { toast } from "sonner";

export const Route = createFileRoute("/watch/$streamId")({
  head: () => ({
    meta: [
      { title: "Live stream — Witness R.E.P" },
      {
        name: "description",
        content: "Live stream link shared from a Witness R.E.P SOS alert.",
      },
    ],
  }),
  component: WatchScreen,
});

function WatchScreen() {
  const { streamId } = Route.useParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "offline" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const playbackUrl = `https://stream.mux.com/${streamId}.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    let cancelled = false;

    const attachNative = () => {
      video.src = playbackUrl;
      video.addEventListener("loadedmetadata", () => {
        if (!cancelled) setStatus("live");
      });
      video.addEventListener("error", () => {
        if (!cancelled) setStatus("offline");
      });
    };

    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, liveSyncDuration: 2 });
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) {
          setStatus("live");
          void video.play().catch(() => undefined);
        }
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (cancelled) return;
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setStatus("offline");
          } else {
            setStatus("error");
            setErrorMsg(data.details);
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      attachNative();
    } else {
      setStatus("error");
      setErrorMsg("HLS playback not supported in this browser");
    }

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [playbackUrl]);

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Live stream" />
      <section className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card">
            <Radio className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Playback ID
            </p>
            <p className="truncate font-mono text-xs">{streamId}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              toast.success("Watch link copied");
            }}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground active:bg-secondary"
            aria-label="Copy watch link"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black">
          <video
            ref={videoRef}
            playsInline
            controls
            autoPlay
            muted
            className="h-full w-full bg-black"
          />
          {status !== "live" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/60 text-center">
              <div className="px-6">
                {status === "loading" && (
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Connecting…
                  </p>
                )}
                {status === "offline" && (
                  <>
                    <p className="text-sm font-semibold text-foreground">Stream offline</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Waiting for the streamer to come online. This page will auto-recover when the
                      feed starts.
                    </p>
                  </>
                )}
                {status === "error" && (
                  <>
                    <p className="text-sm font-semibold text-foreground">Playback error</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {errorMsg ?? "Try refreshing this page."}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
          {status === "live" && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />
              Live
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This page is shared from a Witness R.E.P SOS alert. Stay with the stream and call
          emergency services if needed.
        </p>
      </section>
    </main>
  );
}

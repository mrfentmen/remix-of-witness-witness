// Service worker registration + install-prompt + background-sync bridge.
// Production-only: never registers in the Lovable preview iframe or on
// preview hosts so we can't poison the editor cache.
let registered = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
let waitingReg: ServiceWorkerRegistration | null = null;
let updateAvailable = false;
const updateListeners = new Set<() => void>();

function emitUpdate() {
  updateListeners.forEach((l) => l());
}

function trackWaiting(reg: ServiceWorkerRegistration) {
  if (reg.waiting && navigator.serviceWorker.controller) {
    waitingReg = reg;
    updateAvailable = true;
    emitUpdate();
  }
  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        waitingReg = reg;
        updateAvailable = true;
        emitUpdate();
      }
    });
  });
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com") || h === "localhost";
}
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function registerPwa(onSwMessage?: (msg: { type: string }) => void): void {
  if (registered || typeof window === "undefined") return;
  registered = true;

  // Capture install prompt regardless of host so it's ready to fire post-publish.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
  });

  if (!("serviceWorker" in navigator)) return;

  if (isPreviewHost() || isInIframe() || import.meta.env.DEV) {
    // Defensive: nuke any leftover SW registrations in preview/iframe.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      })
      .catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        trackWaiting(reg);
        // Periodically check for updates while the tab is open.
        const checkUpdate = () => {
          reg.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkUpdate();
        });
        setInterval(checkUpdate, 30 * 60 * 1000);
      })
      .catch((err) => {
        console.warn("[witness] SW registration failed", err);
      });
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && typeof event.data === "object" && "type" in event.data) {
      onSwMessage?.(event.data as { type: string });
    }
  });
}

export function getUpdateAvailable(): boolean {
  return updateAvailable;
}

export function subscribeUpdate(fn: () => void): () => void {
  updateListeners.add(fn);
  return () => updateListeners.delete(fn);
}

export async function applyUpdate(): Promise<void> {
  const reg = waitingReg ?? (await navigator.serviceWorker.getRegistration());
  const waiting = reg?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
  // Fallback in case controllerchange doesn't fire.
  setTimeout(() => {
    if (!reloaded) {
      reloaded = true;
      window.location.reload();
    }
  }, 3000);
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}
export function subscribeInstallPrompt(fn: () => void): () => void {
  promptListeners.add(fn);
  return () => promptListeners.delete(fn);
}
export async function triggerInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  promptListeners.forEach((l) => l());
  return choice.outcome;
}

// Ask the SW to register a Background Sync. Falls back silently elsewhere.
export async function requestBackgroundSync(tag = "witness-upload-sync"): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sync = (
      reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;
    if (!sync) return false;
    await sync.register(tag);
    return true;
  } catch {
    return false;
  }
}

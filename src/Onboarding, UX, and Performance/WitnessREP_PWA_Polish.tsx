// WitnessREP_PWA_Polish.tsx
// Single-file TypeScript React implementation for PWA polish, asset branding, onboarding, auth, haptics, background sync.
// Includes: PWA install/update banner, landing hero, onboarding wizard, support hub, auth screens, media asset stubs,
// haptic feedback engine, service worker sync retry. Exports all components/hooks. MainApp demo at bottom.

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ------------------------------
// SECTION: VANILLA SVG ICONS (Replacing Lucide)
// ------------------------------
const Icon = ({
  name,
  size = 24,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) => {
  const icons: Record<string, React.ReactNode> = {
    camera: (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    mapPin: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    heart: (
      <path d="M20.84 4.61a5.5 5.06 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    refresh: (
      <>
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    mail: (
      <>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    checkCircle: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    chevronLeft: <polyline points="15 18 9 12 15 6" />,
    x: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ),
    smartphone: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </>
    ),
    tablet: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </>
    ),
    monitor: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    bitcoin: (
      <>
        <path d="M11.75 14.25c2.35 0 4.25-1.9 4.25-4.25s-1.9-4.25-4.25-4.25" />
        <path d="M11.75 22.75c2.35 0 4.25-1.9 4.25-4.25s-1.9-4.25-4.25-4.25" />
        <line x1="9.75" y1="1.75" x2="9.75" y2="5.75" />
        <line x1="9.75" y1="18.75" x2="9.75" y2="22.75" />
        <line x1="13.75" y1="1.75" x2="13.75" y2="5.75" />
        <line x1="13.75" y1="18.75" x2="13.75" y2="22.75" />
        <path d="M9.75 5.75H6.75a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
        <path d="M13.75 5.75h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
      </>
    ),
    ethereum: (
      <>
        <path d="m12 2 3.5 6.5L12 12 8.5 8.5 12 2z" />
        <path d="m12 22-3.5-6.5L12 12l3.5 3.5L12 22z" />
        <path d="m12 12 3.5-3.5L19 12l-7 7-7-7 3.5-3.5L12 12z" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    trendingUp: (
      <>
        <polyline points="23 6 13.5 17 8.5 12 1 17" />
        <polyline points="17 6 23 6 23 12" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
};

// ------------------------------
// SECTION: Haptic Feedback Engine
// ------------------------------
export function useWitnessHaptics() {
  const shortPulse = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
  }, []);
  const doublePulse = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([50, 50, 100]);
  }, []);
  const longPulse = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(300);
  }, []);
  return { shortPulse, doublePulse, longPulse };
}

// ------------------------------
// SECTION: Service Worker & Sync Retry
// ------------------------------
export function useBackgroundSync() {
  const [syncRegistered, setSyncRegistered] = useState(false);

  const registerSync = useCallback(async () => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      "SyncManager" in window
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register("upload-metadata");
        setSyncRegistered(true);
      } catch (err) {
        console.warn("Background sync failed", err);
      }
    }
  }, []);

  const retryFailedUploads = useCallback(() => {
    console.log("Retrying failed metadata uploads via simulated background sync");
  }, []);

  useEffect(() => {
    registerSync();
  }, [registerSync]);

  return { syncRegistered, retryFailedUploads };
}

// ------------------------------
// SECTION: PWA Install & Update Banner
// ------------------------------
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Reactive Witness app settings. Backed by localStorage; broadcasts changes
// across the app (and across tabs via the storage event).
import { useSyncExternalStore } from "react";
import {
  getFlagWithDefault,
  getNumber,
  setFlag,
  setNumber,
  getString,
  setString,
  STORAGE_KEYS,
} from "./witness-storage";

export interface WitnessSettings {
  encrypt: boolean;
  gps: boolean;
  anonymous: boolean;
  autoStopMinutes: number; // 0 = disabled
  autoSosOnLive: boolean;
  wifiOnly: boolean;
  shareLocation: boolean;
  notifSosReceived: boolean;
  notifShareRequest: boolean;
  notifLiveNearby: boolean;
  publicLiveLocation: PublicLiveLocationMode;
  airGap: boolean;
  stealthAppMasking: boolean;
  dashcamMode: boolean;
  policeConnect: boolean;
  privacyBlur: boolean;
}

export type PublicLiveLocationMode = "contacts" | "public";
export const DEFAULT_PUBLIC_LIVE_LOCATION: PublicLiveLocationMode = "contacts";

function readPublicLiveLocation(): PublicLiveLocationMode {
  const raw = getString(STORAGE_KEYS.publicLiveLocation);
  return raw === "public" ? "public" : "contacts";
}

export const AUTO_STOP_OPTIONS = [0, 1, 5, 15, 30, 60] as const;
export const DEFAULT_AUTO_STOP_MIN = 30;

function read(): WitnessSettings {
  return {
    encrypt: getFlagWithDefault(STORAGE_KEYS.encrypt, true),
    gps: getFlagWithDefault(STORAGE_KEYS.gps, true),
    anonymous: getFlagWithDefault(STORAGE_KEYS.anonymous, false),
    autoStopMinutes: getNumber(STORAGE_KEYS.autoStopMin, DEFAULT_AUTO_STOP_MIN),
    autoSosOnLive: getFlagWithDefault(STORAGE_KEYS.autoSosOnLive, false),
    wifiOnly: getFlagWithDefault(STORAGE_KEYS.wifiOnly, false),
    shareLocation: getFlagWithDefault(STORAGE_KEYS.shareLocation, false),
    notifSosReceived: getFlagWithDefault(STORAGE_KEYS.notifSosReceived, true),
    notifShareRequest: getFlagWithDefault(STORAGE_KEYS.notifShareRequest, true),
    notifLiveNearby: getFlagWithDefault(STORAGE_KEYS.notifLiveNearby, false),
    publicLiveLocation: readPublicLiveLocation(),
    airGap: getFlagWithDefault(STORAGE_KEYS.airGap, false),
    stealthAppMasking: getFlagWithDefault(STORAGE_KEYS.stealthAppMasking, false),
    dashcamMode: getFlagWithDefault(STORAGE_KEYS.dashcamMode, false),
    policeConnect: getFlagWithDefault(STORAGE_KEYS.policeConnect, false),
    privacyBlur: getFlagWithDefault(STORAGE_KEYS.privacyBlur, false),
  };
}

let cache: WitnessSettings = read();
const listeners = new Set<() => void>();

function emit() {
  cache = read();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  const watched = new Set<string>([
    STORAGE_KEYS.encrypt,
    STORAGE_KEYS.gps,
    STORAGE_KEYS.anonymous,
    STORAGE_KEYS.autoStopMin,
    STORAGE_KEYS.autoSosOnLive,
    STORAGE_KEYS.wifiOnly,
    STORAGE_KEYS.shareLocation,
    STORAGE_KEYS.notifSosReceived,
    STORAGE_KEYS.notifShareRequest,
    STORAGE_KEYS.notifLiveNearby,
    STORAGE_KEYS.publicLiveLocation,
    STORAGE_KEYS.airGap,
    STORAGE_KEYS.stealthAppMasking,
    STORAGE_KEYS.dashcamMode,
    STORAGE_KEYS.policeConnect,
    STORAGE_KEYS.privacyBlur,
  ]);
  window.addEventListener("storage", (e) => {
    if (e.key && watched.has(e.key)) emit();
  });
}

export function getSettings(): WitnessSettings {
  return cache;
}

export function setEncrypt(v: boolean) {
  setFlag(STORAGE_KEYS.encrypt, v);
  emit();
}
export function setGps(v: boolean) {
  setFlag(STORAGE_KEYS.gps, v);
  emit();
}
export function setAnonymous(v: boolean) {
  setFlag(STORAGE_KEYS.anonymous, v);
  emit();
}
export function setAutoStopMinutes(v: number) {
  setNumber(STORAGE_KEYS.autoStopMin, Math.max(0, Math.floor(v)));
  emit();
}
export function setAutoSosOnLive(v: boolean) {
  setFlag(STORAGE_KEYS.autoSosOnLive, v);
  emit();
}
export function setWifiOnly(v: boolean) {
  setFlag(STORAGE_KEYS.wifiOnly, v);
  emit();
}
export function setShareLocation(v: boolean) {
  setFlag(STORAGE_KEYS.shareLocation, v);
  emit();
}
export function setNotifSosReceived(v: boolean) {
  setFlag(STORAGE_KEYS.notifSosReceived, v);
  emit();
}
export function setNotifShareRequest(v: boolean) {
  setFlag(STORAGE_KEYS.notifShareRequest, v);
  emit();
}
export function setNotifLiveNearby(v: boolean) {
  setFlag(STORAGE_KEYS.notifLiveNearby, v);
  emit();
}

export function setPublicLiveLocation(v: PublicLiveLocationMode) {
  setString(STORAGE_KEYS.publicLiveLocation, v);
  emit();
}
export function setAirGap(v: boolean) {
  setFlag(STORAGE_KEYS.airGap, v);
  emit();
}
export function setStealthAppMasking(v: boolean) {
  setFlag(STORAGE_KEYS.stealthAppMasking, v);
  emit();
}
export function setDashcamMode(v: boolean) {
  setFlag(STORAGE_KEYS.dashcamMode, v);
  emit();
}
export function setPoliceConnect(v: boolean) {
  setFlag(STORAGE_KEYS.policeConnect, v);
  emit();
}
export function setPrivacyBlur(v: boolean) {
  setFlag(STORAGE_KEYS.privacyBlur, v);
  emit();
}

export function hasAckedPublicLiveLocation(): boolean {
  return getString(STORAGE_KEYS.publicLiveLocationAck) === "1";
}

export function ackPublicLiveLocation() {
  setString(STORAGE_KEYS.publicLiveLocationAck, "1");
}

export function useSettings(): WitnessSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cache,
    () => cache,
  );
}

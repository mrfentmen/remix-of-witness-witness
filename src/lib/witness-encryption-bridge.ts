// Single key-management facade re-exporting the existing crypto + cloud-key
// helpers so vault components can depend on one entry point.
export {
  encryptBlob,
  decryptToBlob,
  getEncryptionKey,
  sha256Hex,
  toHex,
} from "@/lib/witness-crypto";
export type { EncryptedPayload } from "@/lib/witness-crypto";
export {
  hasLocalMasterKey,
  getMasterKey,
  clearLocalMasterKey,
  provisionMasterKey,
  recoverMasterKey,
  fetchProfileKeyState,
} from "@/lib/cloud-key";
export type { ProfileKeyState } from "@/lib/cloud-key";

## Batch 4: Accessibility, Multi-Device Sync, Youth Education, Master Orchestrator

This is a large integration touching the app shell, settings, signup, vault, and camera. Here's how I'll ship it without breaking existing routing or recorder logic.

### 1. Accessibility + i18n (global)

**New files:**

- `src/lib/witness-i18n.ts` — translation dictionary (en/es/ht), `useTranslation()` hook backed by `useSyncExternalStore`, persisted to localStorage.
- `src/lib/witness-a11y.ts` — `A11yConfig` store (text scale, high contrast, left-handed, voice commands, reduced motion, speech rate). Applies CSS custom property `--a11y-text-scale` and `.high-contrast` / `.left-handed` classes on `<html>`.
- `src/hooks/use-voice-commands.ts` — Web Speech API wrapper. Commands: start/stop recording, go live, SOS, open vault, open map. Localized per language.
- `src/hooks/use-reduced-motion.ts` — `prefers-reduced-motion` listener that feeds the a11y store.
- `src/components/witness/a11y-announcer.tsx` — ARIA live region.
- `src/components/witness/a11y-settings-panel.tsx` — settings UI block.

**Edits:**

- `src/routes/__root.tsx` — mount announcer, init a11y store + reduced motion listener, register global voice commands (navigate via router).
- `src/styles.css` — add `:root { font-size: calc(16px * var(--a11y-text-scale, 1)); }`, `.high-contrast` token overrides, `.left-handed` flex-row-reverse helper.
- `src/routes/settings.tsx` — embed `<A11ySettingsPanel />` (language, text scale, contrast, left-handed, voice, speech rate).
- `src/routes/camera.tsx` — apply `left-handed` class to bottom button row; replace hardcoded labels with `t("camera.*")`; add missing `aria-label`s to icon buttons.
- Headers and primary CTAs across `index.tsx`, `vault.tsx`, `map.tsx`, `sos.tsx`, `auth.tsx`, `login.tsx`, `signup.tsx`, `onboarding.tsx`, `screen-header.tsx` — wrap visible strings with `t(...)`. Strings without translation keys fall back to English.

### 2. Multi-Device Sync

**Migration:** new `devices` table (`id`, `user_id`, `device_id` unique per user, `name`, `is_primary`, `last_sync_at`) + RLS (owner-only) + realtime publication.

**New files:**

- `src/lib/witness-devices.ts` — CRUD + Supabase realtime subscription on `devices` filtered by `user_id`.
- `src/hooks/use-device-sync.ts` — generates/persists local `device_id`, registers on login, listens to realtime, exposes pairing code flow.
- `src/components/witness/manage-devices-sheet.tsx` — list, pair (generate/enter code), unlink, primary toggle.
- `src/components/witness/sync-conflict-modal.tsx` — fires when the same `recordings.id` exists locally and remotely with different `recorded_at` (detected during cloud-recordings reconcile). User picks "keep local", "keep remote", "keep both".

**Edits:**

- `src/routes/settings.tsx` — add "Manage Devices" entry in account section.
- `src/lib/cloud-recordings.ts` — surface conflict events to the modal queue (no behavior change otherwise).

### 3. Youth Education

**Migration:** add `profile_type` (`text`, default `'standard'`, check in `('standard','student')`) and `points` (`integer`, default 0), `badges` (`text[]`, default `'{}'`) to `profiles`.

**New files:**

- `src/lib/witness-youth.ts` — profile type helpers, points/badges award logic, content-filter level derivation.
- `src/lib/witness-curriculum.ts` — scenarios + curriculum modules (typed, no `any`).
- `src/routes/curriculum.tsx` — Know Your Rights Curriculum screen (scenarios, quizzes, badge awards). Visible only to `student` accounts.
- `src/components/witness/ambassador-badge.tsx` — badge chip.

**Edits:**

- `src/routes/signup.tsx` — add account-type selector (Standard / Student under 18 with parental consent checkbox); writes `profile_type` to `profiles`.
- `src/routes/map.tsx` — when `profile_type === 'student'`, filter out incident categories above their content level (e.g. hide `brutality` for `safe`).
- `src/routes/index.tsx` — show Curriculum tile only for student accounts.
- `src/lib/witness-account.ts` — extend profile type to include `profile_type`, `points`, `badges`.

### 4. Master Orchestrator

**New files:**

- `src/lib/witness-orchestrator.tsx` — `WitnessProvider` context wrapping: a11y, i18n, current user, device sync state, emergency state, encryption bridge. Backed by `useReducer` for global actions (`EMERGENCY_TRIGGER`, `EMERGENCY_CLEAR`, etc.).
- `src/lib/witness-encryption-bridge.ts` — single facade over existing `witness-crypto.ts` + `cloud-key.ts`. All vault components (recording-details-sheet, vault.tsx, witness-export.ts, witness-uploader.ts) get key material through this bridge instead of importing directly.
- `src/components/witness/emergency-overlay.tsx` — full-screen overlay rendered at root when `state.emergency === true`. Dismiss requires PIN.

**Edits:**

- `src/routes/__root.tsx` — wrap `<Outlet />` in `<WitnessProvider>`; render `<EmergencyOverlay />` and `<SyncConflictModal />` siblings.
- "Detained" buttons in `camera.tsx` and the loop-recording flush handler dispatch `EMERGENCY_TRIGGER` (in addition to existing flush behavior). The overlay then takes over the screen — existing routes are NOT replaced; navigation history is preserved.
- Vault-related files swap direct crypto imports for the encryption bridge (mechanical refactor, same behavior).

### Constraints honored

- No replacement of `useMediaRecorder`, `useCameraStream`, routing, or the route tree.
- All `any` types eliminated — typed dictionaries for translations, typed voice command map, typed device records, typed reducer actions.
- No new API keys required.
- Trending news still skipped.

### Open question

The `WitnessREP_Integration_Master.tsx` upload includes a vanilla `Icon` component re-implementing lucide. **I'll skip that** — the project already uses `lucide-react`. Confirm or tell me to swap.

Approve and I'll build batch 4.

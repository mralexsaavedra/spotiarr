---
name: spotiarr-zustand
description: "Trigger: Zustand, store, client state, useDownloadStatusStore, usePreferencesStore, usePlayerStore, ephemeral state, persist middleware. spotiarr Zustand rules: exactly 3 stores, patterns for selectors and bulk hooks."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Activation Contract

Load when adding client-side state, touching Zustand stores, or deciding whether something belongs in Zustand vs TanStack Query.

## Hard Rules

- **Exactly 3 stores.** `usePreferencesStore`, `useDownloadStatusStore`, `usePlayerStore`. Do not create a 4th without explicit architectural decision documented in a proposal.
- Server state → TanStack Query. UI/client-only state → Zustand. Never mix.
- `useServerEvents` invalidates TanStack Query caches — it does NOT write to Zustand stores.
- No inline store creation inside components. Stores are singletons in `apps/frontend/src/store/`.

## The Three Stores

### `useDownloadStatusStore` — ephemeral

- **File**: `apps/frontend/src/store/useDownloadStatusStore.ts`
- No `persist` middleware — state is lost on page refresh (intentional).
- Holds in-memory Maps of Spotify URL → status (playlist, track, album track count).
- Updated via `syncFromResponse(data)` from TanStack Query callbacks.
- Never write to this store from event handlers or SSE listeners directly.

**Exported selector hooks (prefer these over raw store access):**

| Hook                                              | Returns                                        |
| ------------------------------------------------- | ---------------------------------------------- |
| `usePlaylistDownloaded(url, expectedTrackCount?)` | `boolean`                                      |
| `usePlaylistDownloading(url)`                     | `boolean`                                      |
| `useBulkPlaylistStatus(items)`                    | `Map<string, { isDownloaded, isDownloading }>` |
| `useBulkTrackStatus(urls)`                        | `Map<string, TrackStatusEnum>`                 |

Use bulk hooks in list components to avoid per-item store subscriptions.

### `usePreferencesStore` — persisted

- **File**: `apps/frontend/src/store/usePreferencesStore.ts`
- Uses `persist` middleware with `name: "spotiarr-preferences"` (localStorage key).
- Holds durable UI preferences that survive page refresh.
- Current state: `isSidebarCollapsed`, `toggleSidebar`, `setSidebarCollapsed`.

### `usePlayerStore` — partially persisted (approved exception)

- **File**: `apps/frontend/src/store/usePlayerStore.ts`
- Uses `persist` middleware with `name: "spotiarr-player"`, `partialize` keeps only `{ volume, isMuted }`.
- Holds global audio playback state: `queue`, `currentIndex`, `isPlaying`, `currentTime`, `duration`, `error`, plus volume/mute.
- The single `<audio>` element is owned by `GlobalPlayerBar` and bound via `setAudioElement`; internal handlers (`_onTimeUpdate`, `_onEnded`, etc.) are wired by the bar and not called from controllers.
- **Dispatch pattern**: page controllers build a `QueueItem[]` snapshot from their domain data (normalizing source DTO fields like `trackUrl` or `audioUrl` to `QueueItem.audioUrl`) and call `playQueue(items, startIndex)`.
- **Shared binding hook**: use `usePlayerQueueBinding(queueItems)` (`apps/frontend/src/hooks/usePlayerQueueBinding.ts`) to read `{ currentTrackId, isPlaying, hasPlayableTracks, playFromIndex, onPlayTrack, onPauseTrack }`. Do not subscribe to the same selectors manually in new controllers.
- **Approved exception** to the prior store-count convention; rationale recorded in the store file header and the `sdd/global-player-bar/proposal` SDD artifact.

### Auth gate — ephemeral React state (not a store)

`useTokenGate` (`apps/frontend/src/hooks/controllers/useTokenGate.ts`) deliberately uses local `useState`, not a 4th Zustand store:

- One-time startup concern; no component outside `TokenGate` needs to subscribe to it.
- Ephemeral by design — "unlocked" must not survive a page reload (a store with `persist` would break this).
- Preserves the 3-store ceiling without a documented proposal.

Promoting it to a store requires a written SDD proposal.

## Adding State

**To `useDownloadStatusStore`:** Add field to `DownloadStatusState` interface + initial value + update action. If the field maps URLs to values, add a typed selector hook (follow `usePlaylistDownloaded` pattern).

**To `usePreferencesStore`:** Add field to `PreferencesState` interface + initial value + setter/toggle. No extra config — `persist` covers all fields automatically.

**New store (discouraged):** Requires architectural justification recorded in an SDD proposal. Mixed strategy (partial persist via `partialize`) is permitted when the store covers state with different lifetimes — see `usePlayerStore` for the canonical example.

## Selector Performance

- Use granular selectors: `store((state) => state.specificField)` not `store()`.
- Use `useShallow` (from `zustand/react/shallow`) for selectors returning objects or arrays.
- For list components reading N items: use bulk hooks (`useBulkPlaylistStatus`, `useBulkTrackStatus`) to batch subscriptions.

## References

- Stores: `apps/frontend/src/store/`
- Bulk hooks source: `useDownloadStatusStore.ts` — `useBulkPlaylistStatus`, `useBulkTrackStatus`
- Player binding hook: `apps/frontend/src/hooks/usePlayerQueueBinding.ts`
- Global player bar: `apps/frontend/src/components/organisms/GlobalPlayerBar.tsx`
- Shared enums: `packages/shared/src/index.ts` — `PlaylistStatusEnum`, `TrackStatusEnum`

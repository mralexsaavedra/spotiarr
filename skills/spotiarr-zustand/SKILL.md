---
name: spotiarr-zustand
description: "Trigger: Zustand, store, client state, usePlayerStore, usePreferencesStore, playerUISlice, ephemeral state, persist middleware. spotiarr Zustand rules: 2 stores + player UI slice, server state stays in TanStack Query, patterns for selectors and bulk hooks."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.2"
---

## Activation Contract

Load when adding client-side state, touching Zustand stores, or deciding whether something belongs in Zustand vs TanStack Query.

## Hard Rules

- **Two stores + one player UI slice.** `usePreferencesStore` and `usePlayerStore` are the only Zustand stores; `playerUISlice` is a slice composed into `usePlayerStore`. Do not add a new store without an architectural decision recorded in an SDD proposal.
- Server state → TanStack Query. UI/client-only state → Zustand. Never mix.
- Download status is **not** a Zustand store — it is TanStack Query state (see below). This is the canonical example of the rule above.
- `useServerEvents` invalidates TanStack Query caches — it does NOT write to Zustand stores.
- No inline store creation inside components. Stores are singletons in `apps/frontend/src/store/`.

## The Stores

### `usePreferencesStore` — persisted

- **File**: `apps/frontend/src/store/usePreferencesStore.ts`
- Uses `persist` middleware with `name: "spotiarr-preferences"` (localStorage key).
- Holds durable UI preferences that survive page refresh.
- Current state: `isSidebarCollapsed`, `toggleSidebar`, `setSidebarCollapsed`.

### `usePlayerStore` — partially persisted

- **File**: `apps/frontend/src/store/usePlayerStore.ts`
- Uses `persist` middleware with `name: "spotiarr-player"`, `partialize` keeps only `{ volume, isMuted }`.
- Holds global audio playback state: `queue`, `currentIndex`, `isPlaying`, `currentTime`, `duration`, `error`, plus volume/mute.
- Composes `playerUISlice` (`apps/frontend/src/store/playerUISlice.ts`) for player UI state (e.g. fullscreen/queue panel visibility).
- The single `<audio>` element is owned by `GlobalPlayerBar` and bound via `setAudioElement`; internal handlers (`_onTimeUpdate`, `_onEnded`, etc.) are wired by the bar and not called from controllers.
- **Dispatch pattern**: page controllers build a `QueueItem[]` snapshot from their domain data (normalizing source DTO fields like `trackUrl` or `audioUrl` to `QueueItem.audioUrl`) and call `playQueue(items, startIndex)`.
- **Shared binding hook**: use `usePlayerQueueBinding(queueItems)` (`apps/frontend/src/hooks/usePlayerQueueBinding.ts`) to read `{ currentTrackId, isPlaying, hasPlayableTracks, playFromIndex, onPlayTrack, onPauseTrack }`. Do not subscribe to the same selectors manually in new controllers.

## Download Status — TanStack Query, not a store

Download status used to be a Zustand store; it is now server state served by TanStack Query.

- **Query hook**: `useDownloadStatusQuery` (`apps/frontend/src/hooks/queries/useDownloadStatusQuery.ts`) — `queryKey: queryKeys.downloadStatus`, `queryFn: playlistService.getDownloadStatus()`, `staleTime: Infinity`. Invalidated by `useServerEvents` on download events.
- **Response shape** (`DownloadStatusResponse`): `playlistStatusMap`, `albumTrackCountMap`, `trackStatusMap`.
- **Derived selector hooks** (`apps/frontend/src/hooks/queries/useDownloadStatus.ts`) — prefer these over reading the query data directly:

| Hook                                              | Returns                                        |
| ------------------------------------------------- | ---------------------------------------------- |
| `usePlaylistDownloaded(url, expectedTrackCount?)` | `boolean`                                      |
| `usePlaylistDownloading(url)`                     | `boolean`                                      |
| `useBulkPlaylistStatus(items)`                    | `Map<string, { isDownloaded, isDownloading }>` |
| `useBulkTrackStatus(urls)`                        | `Map<string, TrackStatusEnum>`                 |

Pure derivers `deriveIsDownloaded` / `deriveIsDownloading` back the hooks and are unit-testable in isolation. Use bulk hooks in list components to avoid per-item subscriptions.

### Auth gate — ephemeral React state (not a store)

`useTokenGate` (`apps/frontend/src/hooks/controllers/useTokenGate.ts`) deliberately uses local `useState`, not a Zustand store:

- One-time startup concern; no component outside `TokenGate` needs to subscribe to it.
- Ephemeral by design — "unlocked" must not survive a page reload (a store with `persist` would break this).

Promoting it to a store requires a written SDD proposal.

## Adding State

**To `usePreferencesStore`:** Add field to `PreferencesState` interface + initial value + setter/toggle. No extra config — `persist` covers all fields automatically.

**To `usePlayerStore`:** Add field to the state interface + initial value + action; if it is UI-only player state, add it to `playerUISlice`. Extend `partialize` only when the field must survive a reload.

**Download-status-shaped state:** Add it to the `DownloadStatusResponse` contract and a derived selector hook in `hooks/queries/useDownloadStatus.ts` — do not put it in a store.

**New store (discouraged):** Requires architectural justification recorded in an SDD proposal. Mixed strategy (partial persist via `partialize`) is permitted when the store covers state with different lifetimes — see `usePlayerStore` for the canonical example.

## Selector Performance

- Use granular selectors: `store((state) => state.specificField)` not `store()`.
- Use `useShallow` (from `zustand/react/shallow`) for selectors returning objects or arrays.
- For list components reading N items: use bulk hooks (`useBulkPlaylistStatus`, `useBulkTrackStatus`) to batch subscriptions.

## References

- Stores: `apps/frontend/src/store/` (`usePlayerStore.ts`, `usePreferencesStore.ts`, `playerUISlice.ts`)
- Download status (TanStack Query): `apps/frontend/src/hooks/queries/useDownloadStatus.ts`, `useDownloadStatusQuery.ts`
- Player binding hook: `apps/frontend/src/hooks/usePlayerQueueBinding.ts`
- Global player bar: `apps/frontend/src/components/organisms/GlobalPlayerBar.tsx`
- Shared enums: `packages/shared/src/index.ts` — `PlaylistStatusEnum`, `TrackStatusEnum`

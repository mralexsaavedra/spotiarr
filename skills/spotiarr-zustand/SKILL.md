---
name: spotiarr-zustand
description: "Trigger: Zustand, store, client state, useDownloadStatusStore, usePreferencesStore, ephemeral state, persist middleware. spotiarr Zustand rules: exactly 2 stores, patterns for selectors and bulk hooks."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load when adding client-side state, touching Zustand stores, or deciding whether something belongs in Zustand vs TanStack Query.

## Hard Rules

- **Exactly 2 stores.** Do not create new stores without explicit architectural decision.
- Server state → TanStack Query. UI/client-only state → Zustand. Never mix.
- `useServerEvents` invalidates TanStack Query caches — it does NOT write to Zustand stores.
- No inline store creation inside components. Stores are singletons in `apps/frontend/src/store/`.

## The Two Stores

### `useDownloadStatusStore` — ephemeral

- **File**: `apps/frontend/src/store/useDownloadStatusStore.ts`
- No `persist` middleware — state is lost on page refresh (intentional).
- Holds in-memory Maps of Spotify URL → status (playlist, track, album track count).
- Updated via `syncFromResponse(data)` from TanStack Query callbacks.
- Never write to this store from event handlers or SSE listeners directly.

**Exported selector hooks (prefer these over raw store access):**

| Hook                                              | Returns                                                     |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `usePlaylistDownloaded(url, expectedTrackCount?)` | `boolean`                                                   |
| `usePlaylistDownloading(url)`                     | `boolean`                                                   |
| `useTrackStatus(url)`                             | `TrackStatusEnum \| undefined`                              |
| `useDownloadStatusSnapshot()`                     | `{ playlistStatusMap, trackStatusMap, albumTrackCountMap }` |
| `useBulkPlaylistStatus(items)`                    | `Map<string, { isDownloaded, isDownloading }>`              |
| `useBulkTrackStatus(urls)`                        | `Map<string, TrackStatusEnum>`                              |

Use bulk hooks in list components to avoid per-item store subscriptions.

### `usePreferencesStore` — persisted

- **File**: `apps/frontend/src/store/usePreferencesStore.ts`
- Uses `persist` middleware with `name: "spotiarr-preferences"` (localStorage key).
- Holds durable UI preferences that survive page refresh.
- Current state: `isSidebarCollapsed`, `toggleSidebar`, `setSidebarCollapsed`.

## Adding State

**To `useDownloadStatusStore`:** Add field to `DownloadStatusState` interface + initial value + update action. If the field maps URLs to values, add a typed selector hook (follow `usePlaylistDownloaded` pattern).

**To `usePreferencesStore`:** Add field to `PreferencesState` interface + initial value + setter/toggle. No extra config — `persist` covers all fields automatically.

**New store (discouraged):** Requires architectural justification. Must be either fully ephemeral or fully persisted — no mixed strategy in a single store.

## Selector Performance

- Use granular selectors: `store((state) => state.specificField)` not `store()`.
- Use `useShallow` (from `zustand/react/shallow`) for selectors returning objects or arrays.
- For list components reading N items: use bulk hooks (`useBulkPlaylistStatus`, `useBulkTrackStatus`) to batch subscriptions.

## References

- Stores: `apps/frontend/src/store/`
- Bulk hooks source: `useDownloadStatusStore.ts` — `useBulkPlaylistStatus`, `useBulkTrackStatus`
- Shared enums: `packages/shared/src/index.ts` — `PlaylistStatusEnum`, `TrackStatusEnum`

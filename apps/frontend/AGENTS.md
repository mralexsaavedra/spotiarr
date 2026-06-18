# AGENTS.md — Frontend

Workspace: `apps/frontend` · React 19, Vite, TanStack Query v5, Zustand, Tailwind 4

> Overrides root `AGENTS.md` on conflict. Root instructions still apply.

## Stack

- React 19
- Vite (bundler) · React Router v7 (lazy + Suspense + RouteErrorBoundary)
- TanStack Query v5 — server state (queries + mutations)
- Zustand — client state (2 stores + a player UI slice, single-file with co-located selector hooks)
- Tailwind CSS v4 · `cn()` utility for conditional classes

## Structure

```
src/
├── app/             App.tsx
├── components/      atoms/ molecules/ organisms/ layouts/ skeletons/ errors/
├── config/          app.ts, links.ts, navigation.ts, version.ts
├── contexts/        ToastContext
├── hooks/
│   ├── controllers/ view-level logic (useHomeController, useAlbumDetailController…, useChatController)
│   ├── mutations/   TanStack useMutation wrappers
│   ├── queries/     TanStack useQuery wrappers
│   ├── useServerEvents.ts  ← SSE / real-time sync
│   └── useLanguageSync.ts  ← syncs UI_LANGUAGE backend setting
├── locales/         en.json, es.json
├── routes/          routes.ts, Routing.tsx
├── lib/             aiProgressBus.ts (in-memory event bus bridging AI playlist SSE progress)
├── services/        raw HTTP clients (ai/artist/history/library/playlist/search/settings/track)
├── store/           usePlayerStore.ts, usePreferencesStore.ts, playerUISlice.ts
├── views/           15 page-level route screens (Home, PlaylistDetail…, Chat)
└── utils/           cache.ts, cn.ts, date.ts
```

## Hard Rules

- View logic goes in `hooks/controllers/` — NOT inside view components.
- Server state → `hooks/queries/` and `hooks/mutations/` (TanStack Query). Client state → `store/`.
- Real-time updates → `useServerEvents` invalidates TanStack Query caches on SSE events (download progress, queue updates, AI playlist progress, etc.). AI playlist progress events are bridged through `lib/aiProgressBus.ts` — do NOT add manual `EventSource` subscriptions elsewhere.
- `usePreferencesStore` persists to `localStorage` (`spotiarr-preferences`). Download status is server state managed by TanStack Query (`hooks/queries/useDownloadStatus.ts`), not a Zustand store.
- `useLanguageSync` controls the active language from the `UI_LANGUAGE` backend setting — never call `i18n.changeLanguage()` manually.
- Use `cn()` from `src/utils/cn.ts` for conditional Tailwind classes.
- Instance auth gate → `components/organisms/TokenGate.tsx` wraps the authenticated app. Gate state is EPHEMERAL React state in `useTokenGate` (hooks/controllers) — NOT a Zustand store. Do not add a 4th store for auth.
- `httpClient` fires `setUnauthorizedHandler` on any non-auth 401; wire that handler only in `useTokenGate`, never add a second 401 handler.

## Validation

```bash
pnpm --filter frontend run lint
pnpm --filter frontend run test:run
pnpm --filter frontend run build
```

## Skills

| Trigger                       | Skill                         |
| ----------------------------- | ----------------------------- |
| React components or hooks     | `react-best-practices`        |
| Tailwind CSS styling          | `tailwind-css-patterns`       |
| TanStack Query, data fetching | `vercel-react-best-practices` |
| SSE / real-time sync          | `spotiarr-sse`                |
| UI components or pages        | `frontend-design`             |
| Vite config                   | `vite`                        |
| Accessibility                 | `accessibility`               |
| TypeScript types              | `typescript-advanced-types`   |
| i18n / translations           | `spotiarr-i18n`               |

# Spotify API Migration Plan

## Problema

Desde febrero 2025, Spotify restringió los quotas de la API para apps en Development Mode.
El resultado: el backend genera demasiados requests al mismo tiempo y recibe 429s frecuentes,
especialmente durante el sync de lanzamientos.

---

## Diagnóstico: qué llama a qué

### Vista de artista (`GET /api/artists/:id`)

| Call | Endpoint Spotify                       | Auth      | Condición                |
| ---- | -------------------------------------- | --------- | ------------------------ |
| 1    | `GET /v1/artists/{id}`                 | App token | Solo si no está en DB    |
| 2    | `GET /v1/artists/{id}/albums?limit=10` | App token | Solo si no está cacheado |

**Impacto real: bajo.** DB fallback evita la mayoría. Máximo 2 calls.

---

### Vista de release (`GET /api/artists/:id/albums/:albumId/tracks`)

| Call | Endpoint Spotify                           | Auth      | Condición                        |
| ---- | ------------------------------------------ | --------- | -------------------------------- |
| 1    | `GET /v1/albums/{albumId}`                 | App token | Solo si no está cacheado         |
| 2..N | `GET /v1/albums/{albumId}/tracks?limit=50` | App token | Una call por página de 50 tracks |

**Impacto: medio.** Un álbum de 150 tracks = 4 calls. Secuencial por diseño.

---

### Feed sync — `FeedSyncWorker` (el problema principal)

| Call             | Endpoint Spotify                                                   | Auth       | Condición                          |
| ---------------- | ------------------------------------------------------------------ | ---------- | ---------------------------------- |
| 1..P             | `GET /v1/me/following?type=artist&limit=50`                        | User token | Una call por página de 50 artistas |
| Por cada artista | `GET /v1/artists/{id}/albums?limit=10&include_groups=album,single` | App token  | SIEMPRE                            |

**Impacto: alto.** Con 50 artistas seguidos = 51+ calls por ciclo de sync.
Este es el patrón N+1 que genera la mayoría de 429s.

---

## Estrategia de migración

### Qué DEBE seguir en Spotify

Spotify es la única fuente de verdad para datos de usuario:

- Lista de artistas seguidos (`/v1/me/following`)
- Playlists del usuario (`/v1/playlists`, `/v1/me/playlists`)
- Librería del usuario (`/v1/me/tracks`, `/v1/me/albums`)
- Autenticación OAuth

Estos no se pueden migrar porque requieren el token de usuario.

---

### Qué SE PUEDE migrar

| Dato                               | Uso actual    | API alternativa                 | Motivo                    |
| ---------------------------------- | ------------- | ------------------------------- | ------------------------- |
| Discografía de artista             | Vista artista | Deezer (+ MusicBrainz fallback) | Sin quota issues          |
| Lanzamientos recientes por artista | Feed sync     | Deezer (+ MusicBrainz fallback) | Elimina el N+1            |
| Tracks de un álbum                 | Vista release | Deezer (+ MusicBrainz fallback) | Datos más completos       |
| Metadatos de álbum (cover, fecha)  | Ambas vistas  | Deezer (cover art incluida)     | Sin CoverArtArchive extra |

---

## APIs alternativas evaluadas

> **Contexto de deployment**: Spotiarr corre en Mac (dev) y homelab Docker (prod), ambos en la
> misma red doméstica → mismo IP externo. Esto afecta directamente qué API es viable como primaria.

### Deezer ⭐ Recomendada principal

- **URL**: `https://api.deezer.com/`
- **Auth**: No requiere API key para lectura
- **Rate limit**: 50 req/5s por IP ≈ 10 req/s
- **Con dos instancias en mismo IP**: uso real ~2-3 req/s → margen amplio
- **Cobertura**: Buena para mainstream y catálogos grandes; cubre la mayoría de artistas de Spotify
- **Cover art**: Incluida directamente en las respuestas
- **Fortalezas**: Rate limit tolerante para multi-instancia, sin API key, respuesta rápida
- **Debilidades**: Puede faltar catálogo de artistas muy indie o regionales

**Endpoints clave:**

```
# Buscar artista (para obtener Deezer ID desde nombre)
GET /search/artist?q={name}&limit=1

# Álbumes de un artista
GET /artist/{deezerId}/albums

# Tracks de un álbum
GET /album/{deezerAlbumId}/tracks
```

### MusicBrainz ⭐ Recomendado suplementario

- **URL**: `https://musicbrainz.org/ws/2/`
- **Auth**: No requiere API key (requiere User-Agent identificativo)
- **Rate limit**: 1 req/s por IP
- **Con dos instancias en mismo IP**: efectivamente 0.5 req/s cada una → demasiado lento como primaria
- **Cobertura**: Más completo que Deezer para back-catalog, artistas indie, ISRCs, fechas exactas
- **Fortalezas**: Datos canónicos, linkeo directo desde Spotify ID via URL lookup, open data permanente
- **Uso recomendado**: Enriquecer datos que Deezer no tiene (ISRC, release exacta, artistas no-mainstream)

**Endpoints clave:**

```
# Lookup MBID desde Spotify Artist ID (una sola vez, guardar en DB)
GET /ws/2/url?resource=https://open.spotify.com/artist/{spotifyId}&inc=artist-rels&fmt=json

# Release groups de un artista (álbumes, singles, EPs)
GET /ws/2/release-group?artist={mbid}&type=album|single|ep&fmt=json&limit=100
```

### iTunes Search API (fallback de cover art)

- **Auth**: No requiere API key
- **Rate limit**: No documentado, tolerante
- **Cobertura**: Solo catálogo iTunes Store
- **Uso recomendado**: Fallback de cover art cuando Deezer no tiene imagen

---

## Diseño de dos caminos (crítico)

### Problema: MusicBrainz/Deezer son demasiado lentos para requests interactivos sin caché

Si el usuario navega a un artista que no está en DB, hacer un lookup a Deezer/MusicBrainz
en tiempo real bloquea la UX. Spotify sigue siendo necesario como fallback interactivo.

### Solución: modo `interactive` vs modo `sync`

```
INTERACTIVE (usuario esperando — respuesta < 500ms esperada)
  1. DB hit?           → return inmediato
  2. No hit            → Spotify (rápido, token de app)
                         → guardar resultado en DB para próxima vez

BACKGROUND SYNC (nadie esperando — BullMQ worker)
  1. DB hit con TTL?   → skip artista
  2. TTL expirado      → Deezer primario (10 req/s, tolerante)
                         → MusicBrainz si Deezer no encuentra artista
                         → Spotify fallback si ambos fallan
                         → guardar en DB con TTL 24h
```

`music-catalog.service.ts` expone dos métodos:

- `getForInteractive(artistId)` → path rápido, Spotify fallback
- `syncArtist(artistId)` → path lento, Deezer/MusicBrainz

Los workers usan `syncArtist`. Los controllers usan `getForInteractive`.

---

## Consideraciones multi-instancia (Mac dev + homelab Docker)

### Situación actual

Ambas instancias comparten el mismo IP externo (red doméstica).
Consecuencia por API:

| API         | Límite                                    | Impacto multi-instancia                              |
| ----------- | ----------------------------------------- | ---------------------------------------------------- |
| Spotify     | Quota de app (compartida por credentials) | **Ya compiten hoy** — mismo CLIENT_ID                |
| Deezer      | 50 req/5s por IP                          | Mac + homelab juntos usan ~2-3 req/s → sin problema  |
| MusicBrainz | 1 req/s por IP                            | Competencia real si ambas hacen bootstrap simultáneo |

### Problema del bootstrap duplicado

Cada instancia tiene su propio SQLite → si el homelab ya tiene los Deezer IDs cacheados,
el Mac los vuelve a fetchear en su propio bootstrap.

### Solución: Redis como caché compartida de IDs externos

Redis ya existe en el stack (BullMQ). Se puede usar para cachear:

- `deezer:artist:{spotifyId}` → Deezer artist ID (TTL: permanente / 30 días)
- `deezer:album:{spotifyAlbumId}` → Deezer album ID (TTL: permanente / 30 días)

Si ambas instancias apuntan al mismo Redis, el bootstrap solo ocurre una vez.
Si usan Redis separados (dev vs prod), cada una bootstrapea independientemente — aceptable
dado que el bootstrap es background y Deezer tiene margen suficiente.

---

## Plan de implementación

### Fase 1: Feed Sync sin Spotify (mayor impacto)

**Objetivo**: Eliminar las N calls por artista en `FeedSyncWorker`.

**Approach**:

1. Añadir columna `deezerId String?` a tabla `Artist` en Prisma
2. Durante el sync, resolver Deezer ID desde nombre del artista (`GET /search/artist?q={name}`) — una vez, se guarda permanentemente
3. En `FeedSyncWorker`, para cada artista: `GET /artist/{deezerId}/albums` → filtrar por fecha de lanzamiento reciente
4. Fallback a MusicBrainz si Deezer no encuentra el artista
5. Fallback final a Spotify si ninguno funciona

**Archivos afectados**:

- `apps/backend/src/infrastructure/external/providers/deezer/deezer.client.ts` → nuevo
- `apps/backend/src/infrastructure/workers/feed-sync.worker.ts`
- `apps/backend/src/infrastructure/external/release-feed.service.ts` → nuevo (orquesta Deezer + fallbacks)
- `apps/backend/prisma/schema.prisma` → añadir `deezerId String?` a `Artist`
- Migration de DB

**Beneficio esperado**: 50 calls Spotify por sync → 0 calls Spotify (todo va a Deezer)

---

### Fase 2: Vista de artista sin Spotify ✅ Completado

**Objetivo**: La discografía en la vista de artista no consume quota de Spotify.

**Approach implementado**:

1. Si `deezerId` conocido: `GET /artist/{deezerId}/albums` → devuelve discografía completa con cover art
2. Spotify solo como fallback interactivo cuando el artista no está en DB aún
3. Cache en DB con TTL de 24h

**Archivos afectados**:

- `apps/backend/src/infrastructure/database/feed.repository.ts` → añadido `getArtistAlbumsFreshness()`
- `apps/backend/src/infrastructure/external/release-feed.service.ts` → añadido `getArtistDiscography()` sin filtro de 30 días
- `apps/backend/src/infrastructure/external/providers/deezer/deezer.client.ts` → paginación automática de álbumes
- `apps/backend/src/application/use-cases/artists/get-artist-detail.use-case.ts` → nuevo
- `apps/backend/src/application/use-cases/artists/get-artist-albums.use-case.ts` → nuevo
- `apps/backend/src/presentation/controllers/artist.controller.ts` → delega a use cases
- `apps/backend/src/container.ts` → wiring de use cases

**Verificación**:

- ✅ Tests de Vitest cubren: cache fresco, cache stale con refresh Deezer, resolución de deezerId, fallback a Spotify, preservación de 429, paginación de álbumes
- ✅ `getActiveArtistReleases()` mantiene filtro de 30 días sin cambios de comportamiento
- ✅ `getAlbumTracks` migrado en Phase 3: Deezer primero, MusicBrainz fallback, Spotify solo como fallback terminal
- ✅ Build y lint pasan

**Warming UX (artist-catalog-warming-ux)**:

- Cuando un artista no está cacheado y el refresh interactivo excede el timeout de 500ms (o recibe 429), el backend devuelve `catalogRefreshPending: true` junto con la lista vacía de álbumes.
- El frontend detecta `catalogRefreshPending && albums.length === 0` y muestra "Actualizando discografía…" en lugar de "Sin discografía disponible".
- El frontend hace refetch automático con límite de 2 intentos y delay de 1500ms, evitando polling infinito.
- Una vez que los álbumes están en la DB, la siguiente visita (o refetch) muestra la discografía completa sin intervención del usuario.

---

### Fase 3: Vista de release sin Spotify ✅ Completado

**Objetivo**: Los tracks de un álbum vienen de Deezer.

**Approach implementado**:

1. Resolver Deezer album ID desde el Spotify album ID vía nombre + artista
2. `GET /album/{deezerAlbumId}/tracks` → tracklist completo con duración, número de track
3. Fallback a MusicBrainz para artistas no encontrados en Deezer
4. Fallback final a Spotify

**Archivos afectados**:

- `apps/backend/src/infrastructure/external/providers/deezer/deezer.client.ts` → ampliar con album tracks
- `apps/backend/src/infrastructure/external/music-catalog.service.ts` → método `getAlbumTracks()`
- `apps/backend/src/presentation/controllers/artist.controller.ts` → `getAlbumTracks()`
- `apps/backend/prisma/schema.prisma` → `ArtistAlbumCache` con `deezerAlbumId String?` y `mbAlbumId String?` para mapeo persistente de álbumes

---

### Fase 4: Preview de álbum sin Spotify (pendiente)

**Problema detectado**: Click en álbum de discografía → frontend llama
`materializeAlbumSpotifyUrl` (apps/backend/src/application/use-cases/artists/materialize-album-spotify-url.use-case.ts)
porque ruta `PLAYLIST_PREVIEW` requiere URL Spotify. Ese use case pega directo a Spotify
(`findArtistAlbumByName` + `searchAlbumByName`) sin fallback Deezer/MB → `circuit_open`
cuando quota Spotify agotada.

**Causa raíz**: Álbumes vienen de Deezer (Fase 2), no traen `spotifyUrl`. Navegación a
preview asume URL Spotify como identificador único — contrato acoplado al proveedor.

**Insight clave**: Tracks NO necesitan `spotifyUrl` para descargarse. `yt-dlp` busca en
YouTube por `(artist, name)` (apps/backend/src/infrastructure/external/youtube-search.service.ts:126).
URL Spotify hoy solo es clave de navegación, no insumo de descarga.

**Approach propuesto**:

1. **Backend resuelve fuente**. Endpoint único `GET /api/albums/:artistId/:albumId`
   (o reutilizar `/artists/:id/albums/:albumId/tracks` ampliado):
   - DB hit (Track + AlbumCache fresco) → devuelve tracks cacheados directo
   - Miss → `GetAlbumTracksUseCase` (Deezer → MB → Spotify last resort) → persiste → devuelve
   - Mismo shape de respuesta siempre. Frontend ignora la fuente.
2. **Una sola vista** `Playlist`. Eliminar duplicado `PlaylistPreview` vs `PlaylistDetail`.
   Hook controller único consume endpoint backend; no rama por fuente.
3. Ruta nueva `/album/:artistId/:albumId` para álbumes internos. Mantener
   `PLAYLIST_PREVIEW?url=` solo para "user pega URL Spotify ajena" (input legítimo).
4. `useAlbumPreviewNavigation` skip `materializeAlbumSpotifyUrl`; navega directo a ruta
   interna.
5. Eliminar `materializeAlbumSpotifyUrl` use case + endpoint + ruta frontend.

**Por qué backend-resuelve y no frontend-ramifica**:

- Frontend desacoplado del proveedor — no sabe si datos vienen de DB, Deezer, MB o Spotify.
- Un solo contrato HTTP → menos branches, menos tests duplicados.
- Backend ya tiene `GetAlbumTracksUseCase` con cascada — extender con DB-first es trivial.
- Cache invalidation, TTL, warming UX se centralizan en una capa.

**Archivos afectados (estimado)**:

- `apps/backend/src/application/use-cases/artists/get-album-tracks.use-case.ts` → DB-first lookup
- `apps/backend/src/application/use-cases/artists/materialize-album-spotify-url.use-case.ts` → eliminar
- `apps/backend/src/presentation/controllers/artist.controller.ts` → quitar endpoint materialize
- `apps/backend/src/presentation/routes/artist.routes.ts` → quitar ruta
- `apps/frontend/src/routes/routes.ts` → ruta `ALBUM_DETAIL` (interna)
- `apps/frontend/src/routes/Routing.tsx` → wiring
- `apps/frontend/src/views/PlaylistPreview.tsx` → fusionar en `Playlist.tsx`
- `apps/frontend/src/views/PlaylistDetail.tsx` → fusionar en `Playlist.tsx`
- `apps/frontend/src/hooks/controllers/usePlaylistPreviewController.ts` → unificar con detail
- `apps/frontend/src/hooks/useAlbumPreviewNavigation.ts` → skip materialize, navega a ruta interna
- `apps/frontend/src/services/artist.service.ts` → quitar `materializeAlbumSpotifyUrl`

**Beneficio esperado**: 0 calls a Spotify al abrir preview de álbum desde discografía.
Cierra último path interactivo que genera `circuit_open` en operación normal.

---

### Fase 4.5: Eliminar N+1 residual en feed.controller fallback (pendiente)

**Problema detectado**: `feed.controller.getRecentReleases` y `feed.controller.getArtists`
(apps/backend/src/presentation/controllers/feed.controller.ts:18,28) usan fallback directo
a `SpotifyUserLibraryService.getFollowedArtistsRecentReleases` cuando la DB está vacía.
Ese método sigue siendo el patrón N+1 original — una call por cada artista seguido
(apps/backend/src/infrastructure/external/spotify-user-library.service.ts:198-260).

**Cuándo se dispara**: Bootstrap inicial, primer arranque tras `prisma migrate reset`, o
purga manual de cache. Bajo en frecuencia, alto en impacto cuando ocurre (50+ calls
secuenciales a Spotify).

**Approach propuesto**:

1. Reemplazar fallback en `feed.controller.getRecentReleases` por `ReleaseFeedService`
   (Deezer-first, ya disponible desde Fase 1).
2. `getFollowedArtists` puede mantenerse — devuelve solo la lista de seguidos (1 call
   paginada, no N+1) y requiere user token de Spotify (no migrable).
3. Una vez sin consumidores, eliminar `getFollowedArtistsRecentReleases` y método
   `fetchWithAppToken` para `/v1/artists/{id}/albums` dentro de `SpotifyUserLibraryService`.

**Archivos afectados**:

- `apps/backend/src/presentation/controllers/feed.controller.ts` → cambiar fallback a `ReleaseFeedService`
- `apps/backend/src/infrastructure/external/spotify-user-library.service.ts` → eliminar `getFollowedArtistsRecentReleases`
- `apps/backend/src/container.ts` → wiring si cambian dependencias

**Beneficio esperado**: 0 calls Spotify en bootstrap inicial. Cierra el último N+1 vivo.

---

## Cleanup post-implementación (Fase 4 + 4.5)

Una vez completadas Fase 4 y 4.5, eliminar código muerto:

### Backend

| Item                                                           | Razón                        |
| -------------------------------------------------------------- | ---------------------------- |
| `MaterializeAlbumSpotifyUrlUseCase`                            | Sin consumidores tras Fase 4 |
| `GET /:id/albums/:albumId/spotify-url` ruta                    | Sin uso                      |
| `SpotifyArtistClient.findArtistAlbumByName`                    | Solo lo usaba materialize    |
| `SpotifySearchClient.searchAlbumByName`                        | Solo lo usaba materialize    |
| `SpotifyUserLibraryService.getFollowedArtistsRecentReleases`   | Eliminado en Fase 4.5        |
| `SpotifyService.getPlaylistDetail` rama `Album` (líneas 58-67) | Path álbum interno migrado   |
| Tests asociados a los anteriores                               | Limpieza                     |

### Frontend

| Item                                                      | Razón                         |
| --------------------------------------------------------- | ----------------------------- |
| `artistService.materializeAlbumSpotifyUrl`                | Sin consumidores              |
| `PlaylistPreview` o `PlaylistDetail` (uno fusionado)      | Decisión Fase 4               |
| `usePlaylistPreviewController` (si se unifica con detail) | Fusión                        |
| Ruta `PLAYLIST_PREVIEW` para álbumes internos             | Sustituida por `ALBUM_DETAIL` |
| i18n key `artist.errors.materializeSpotifyUrl`            | Sin referencia                |

### Verificación de dead code

- `pnpm --filter backend run lint` con `noUnusedLocals` activo
- `rg -n "<symbol>" apps/` por cada item antes de borrar
- Tests de regresión para flujos críticos (sync, vista artista, descarga)

---

## Estrategia de matching: Spotify ID → Deezer ID

### Para artistas (primaria)

```
GET https://api.deezer.com/search/artist?q={artistName}&limit=5
```

Comparar nombre exacto (case-insensitive). Guardar `deezerId` en DB permanentemente.
Una sola call por artista, nunca se repite.

### Para álbumes

```
GET https://api.deezer.com/search/album?q={artistName}+{albumName}&limit=5
```

Comparar nombre + artista. Guardar `ArtistAlbumCache.deezerAlbumId` en DB permanentemente.

### Fallback: Spotify ID → MusicBrainz MBID (para artistas no en Deezer)

MusicBrainz permite lookup directo desde Spotify URL:

```
GET /ws/2/url?resource=https://open.spotify.com/artist/{spotifyId}&inc=artist-rels&fmt=json
GET /ws/2/url?resource=https://open.spotify.com/album/{spotifyId}&inc=release-rels&fmt=json
```

Guardar `mbid` en DB permanentemente. Solo se ejecuta si Deezer no encontró el artista.

---

## Caching recomendado

| Dato                            | Dónde                                             | TTL           | Justificación                                 |
| ------------------------------- | ------------------------------------------------- | ------------- | --------------------------------------------- |
| `deezerId` de artista           | SQLite (columna `Artist.deezerId`)                | Permanente    | ID no cambia nunca                            |
| `deezerAlbumId` de álbum        | SQLite (columna `ArtistAlbumCache.deezerAlbumId`) | Permanente    | ID no cambia nunca                            |
| `mbAlbumId` de álbum (fallback) | SQLite (columna `ArtistAlbumCache.mbAlbumId`)     | Permanente    | ID no cambia nunca                            |
| `mbid` de artista (fallback)    | SQLite (columna `Artist.mbid`)                    | Permanente    | ID no cambia nunca                            |
| Discografía de artista          | SQLite (tabla `Album`)                            | 24h (TTL col) | Lanzamientos no cambian por hora              |
| Tracks de un álbum              | SQLite (tabla `Track`)                            | 7 días        | Tracklist de álbum no cambia                  |
| Lanzamientos recientes (feed)   | SQLite (feed cache)                               | 1h            | Puede haber nuevas salidas                    |
| Deezer/MB IDs (multi-instancia) | Redis (opcional)                                  | 30 días       | Evita bootstrap duplicado entre Mac y homelab |

---

## Riesgos

| Riesgo                                                  | Probabilidad                      | Mitigación                                                                    |
| ------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| Artista no encontrado en Deezer (muy indie/regional)    | Media                             | Fallback a MusicBrainz → Spotify                                              |
| Match incorrecto en Deezer por nombre ambiguo           | Baja-media                        | Comparar nombre + género/popularidad; marcar como `needsReview` si score bajo |
| Deezer cambia o restringe su API pública                | Baja                              | MusicBrainz como fallback; Spotify como last resort                           |
| Bootstrap lento con MusicBrainz (1 req/s) como fallback | Baja (pocos artistas llegan aquí) | Rate limiter dedicado para MB, no bloquea path principal                      |
| Dos instancias bootstrapean simultáneamente (mismo IP)  | Media                             | Redis como caché compartida de IDs; si no, Deezer tiene margen suficiente     |

---

## Refactor de infraestructura y naming

### Problema actual

Los archivos `spotify-artist.client.ts`, `spotify-album.client.ts`, etc. mezclan dos
responsabilidades: "llamar a Spotify" y "dar datos de artistas/álbumes". Si cambiamos
el proveedor, el nombre miente y el dominio está acoplado al nombre del proveedor.

### Estructura propuesta

```
infrastructure/external/
  providers/
    spotify/                          ← solo lo que requiere Spotify (auth, user data)
      spotify-auth.service.ts
      spotify-http.client.ts
      spotify-user-library.service.ts ← followed artists, playlists, user library
      spotify-search.client.ts        ← search (Spotify tiene mejor search que Deezer)
    deezer/
      deezer.client.ts                ← nuevo
    musicbrainz/
      musicbrainz.client.ts           ← nuevo

  music-catalog.service.ts            ← nuevo — orquesta proveedores
  release-feed.service.ts             ← nuevo — lanzamientos recientes por artista
```

### Archivos a renombrar/mover (cuando se implemente)

| Actual                     | Nuevo                                        | Motivo                |
| -------------------------- | -------------------------------------------- | --------------------- |
| `spotify-artist.client.ts` | `providers/spotify/spotify-artist.client.ts` | Claridad de proveedor |
| `spotify-album.client.ts`  | `providers/spotify/spotify-album.client.ts`  | Idem                  |
| `spotify-track.client.ts`  | `providers/spotify/spotify-track.client.ts`  | Idem                  |
| `spotify-base.client.ts`   | `providers/spotify/spotify-base.client.ts`   | Idem                  |
| `spotify-track.mapper.ts`  | `providers/spotify/spotify-track.mapper.ts`  | Idem                  |
| `spotify.types.ts`         | `providers/spotify/spotify.types.ts`         | Idem                  |

Los archivos de `providers/spotify/` siguen existiendo — Spotify no desaparece,
solo deja de ser el único proveedor de catalog data.

---

## Archivos nuevos a crear

```
apps/backend/src/infrastructure/external/
  providers/
    deezer/
      deezer.client.ts              ← cliente HTTP Deezer (artistas, álbumes, tracks)
    musicbrainz/
      musicbrainz.client.ts         ← cliente HTTP MusicBrainz (fallback artistas indie)
  music-catalog.service.ts          ← orquesta Deezer → MusicBrainz → Spotify para catalog data
  release-feed.service.ts           ← lanzamientos recientes por artista (feed sync path)
```

---

## Criterio de éxito

- Feed sync completo con 50 artistas: 0 calls a Spotify (solo Spotify para followed artists list)
- Vista de artista: 0 calls a Spotify si MBID conocido
- Vista de release: 0 calls a Spotify si MBID conocido
- Sin 429s durante operación normal por 14 días consecutivos

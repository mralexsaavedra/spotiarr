# Arquitectura y Decisiones Técnicas

Este documento detalla la filosofía del proyecto, la elección de tecnologías y la estructura del código. Sirve como guía para entender por qué SpotiArr está construido de esta manera.

## 1. La Iniciativa

SpotiArr nace de la necesidad de cerrar la brecha entre el descubrimiento de música en **Spotify** y la colección de medios local (self-hosted) en servidores como **Jellyfin** o **Plex**.

Aunque existen herramientas como _Lidarr_, la integración directa para descargar playlists de Spotify con metadatos perfectos a menudo requiere configuraciones complejas o múltiples herramientas. SpotiArr busca ser una solución "todo en uno":

- **De:** "Me gusta esta playlist/álbum en Spotify".
- **A:** "Ya está en mi servidor, con carátula, tags y organizado por carpetas", sin pasos intermedios.

## 2. Estrategia Monorepo

Para este proyecto, se eligió una arquitectura de **Monorepo** gestionada por **pnpm workspaces**.

### ¿Por qué Monorepo?

1.  **Código Compartido (`shared`):**
    - Tenemos un paquete `@spotiarr/shared` que contiene tipos TypeScript (DTOs), constantes y utilidades.
    - **Beneficio:** Evita la duplicación. Si definimos la interfaz de una `Track` en el backend, el frontend la consume directamente. Si cambia, TypeScript nos avisa de los errores de compilación en ambos lados.

2.  **Tooling Unificado:**
    - Configuraciones centrales para ESLint, Prettier y TypeScript (`packages/eslint-config`, `packages/tsconfig`).
    - **Beneficio:** Todo el código sigue el mismo estándar. No hay peleas por estilos; el repo lo impone automáticamente.

3.  **Gestión Atómica:**
    - Versionado y despliegue conjunto. Un solo commit puede contener la migración de base de datos (Backend) y el componente UI que consume esos nuevos datos (Frontend).

### ¿Por qué pnpm?

- **Eficiencia:** Es mucho más rápido que npm/yarn y utiliza un _store_ global, ahorrando cientos de megas en disco al no duplicar `node_modules`.

## 3. Stack Tecnológico

La elección de tecnologías prioriza la **Modernidad**, el **Tipado (TypeScript)** y la **Experiencia de Desarrollo (DX)**.

### Frontend (`/apps/frontend`)

- **React 19:** Última versión para estar preparados para el futuro (aunque usamos modelo SPA).
- **Vite:** Build tool estándar. Arranque instantáneo y HMR rapidísimo.
- **Tailwind CSS v4:** Motor de estilos moderno y rápido.
- **Estado:**
  - **Zustand:** Estado UI global (modales, sidebar).
  - **TanStack Query:** Estado asíncrono (server state, caching).
- **React Router:** Navegación SPA.

### Backend (`/apps/backend`)

- **Node.js & Express:** Robusto y battle-tested.
- **Prisma ORM:** Tipado seguro con la DB. SQLite por defecto (fácil deployment).
- **BullMQ + Redis:** Sistema de colas robusto para manejar descargas pesadas en background.
- **Vercel AI SDK (`generateObject`):** Respuestas LLM estructuradas para la generación de playlists con IA.

### Core de Medios

- **yt-dlp:** Motor de descarga principal.
- **FFmpeg:** Conversión de audio y post-procesado.
- **Node-ID3:** Etiquetado de metadatos (Cover art, Artist, Album, etc.).

## 4. Estructura del Proyecto

### 4.1. Backend (Clean Architecture)

El backend sigue principios de **Clean Architecture** y **Domain-Driven Design (DDD)** simplificado.

```
apps/backend/src/
├── __tests__/           # Invariantes arquitectónicas (architecture.test.ts)
├── application/         # Lógica de aplicación
│   ├── ports/           # Contratos hexagonales (interfaces)
│   ├── services/        # Servicios de orquestación (SpotifyService, HealthService...)
│   └── use-cases/       # Casos de uso: CreateTrack, DownloadTrack...
├── domain/              # Modelo de dominio puro (entidades, reglas)
├── infrastructure/      # Implementaciones concretas
│   ├── database/        # Repositorios Prisma
│   ├── external/        # Integraciones (Spotify API, YouTube, Filesystem); providers/ai/ (adaptador, connection resolver, model listing)
│   ├── jobs/            # Tareas programadas (Cron Jobs)
│   └── messaging/       # Colas (BullMQ) y Eventos (SSE)
├── presentation/        # API Rest (Rutas y Controladores)
└── container.ts         # Inyección de Dependencias (DI) Manual
```

**Patrones de Backend utilizados:**

1.  **Dependency Injection (DI):** Todo se instancia en `container.ts` para testabilidad.
2.  **Repository Pattern:** Desacopla la lógica de negocio de la base de datos (Prisma).
3.  **Use Cases:** Cada acción del usuario tiene una clase dedicada, evitando servicios monolíticos.
4.  **Hexagonal Ports:** La capa `application` define contratos en `application/ports/`, y `infrastructure` aporta adapters concretos cableados en el contenedor.

#### 4.1.1. Límites de capa (enforced)

Las reglas de arquitectura están validadas por `apps/backend/src/__tests__/architecture.test.ts`:

- **R1:** `domain/` no tiene imports salientes hacia otras capas.
- **R2:** `application/` no importa `infrastructure/` directamente; depende vía puertos en `application/ports/`.
- **R3:** `presentation/` (código productivo) no importa ni `infrastructure` ni `@prisma/client`.
- **R4:** lecturas de `process.env` centralizadas en `infrastructure/setup/environment.ts`, con una única excepción documentada: fallback de `process.env.DOWNLOADS` en `container.ts`.

Este test se ejecuta dentro de `pnpm --filter backend run test:run`. Si alguien rompe un límite, falla CI.

### 4.2. Frontend (Atomic Design + Feature Driven)

El frontend está organizado para escalar, separando componentes visuales puros de la lógica de negocio y las vistas.

```
apps/frontend/src/
├── components/          # Elementos de UI reutilizables (Atomic Design)
│   ├── atoms/           # Botones, Inputs, Iconos básicos
│   ├── molecules/       # Campos de búsqueda, Cards simples
│   └── organisms/       # Cards complejas, Listas, Modales
├── views/               # Páginas completas (Screens de la aplicación); incluye Chat
├── lib/                 # aiProgressBus.ts (bus de eventos en memoria para progreso SSE de IA)
├── hooks/               # Custom Hooks Architecture
│   ├── controllers/     # Lógica de Vistas (ViewModel Pattern)
│   ├── queries/         # Wrappers de lectura API (React Query)
│   ├── mutations/       # Wrappers de escritura API (React Query)
│   └── useServerEvents  # Sincronización Real-time (SSE)
├── services/            # Fetchers puros
└── store/               # Estado Global UI (Zustand)
    ├── useDownloadStatusStore.ts
    ├── usePreferencesStore.ts
    └── usePlayerStore.ts # Tercer store aprobado para el estado de reproducción
```

**Patrones Avanzados de Hooks:**

1.  **Controller Pattern (`hooks/controllers`):**
    - Implementamos el patrón **ViewModel**.
    - En lugar de tener una vista como `PlaylistDetail.tsx` llena de lógica y `useEffect`, extraemos todo a un hook `usePlaylistDetailController`.
    - La vista solo se encarga de "pintar" lo que el controller le devuelve.
2.  **Logic Segregation:**
    - `queries/` y `mutations/` centralizan las keys de caché y las llamadas a la API.
    - Esto permite reutilizar la lógica de "obtener playlists" en cualquier componente sin repetir código.
3.  **Real-time Sync (`useServerEvents`):**
    - Un hook global escucha **Server-Sent Events** del backend.
    - Cuando llega un evento (ej: `track-downloaded`), invalida automáticamente las queries afectadas.
    - **Resultado:** La UI se actualiza sola sin que el usuario tenga que recargar, manteniendo la coherencia de datos "mágicamente".

## 5. Componentes Internos Destacados

### 5.1. Librería Compartida (`@spotiarr/shared`)

El pegamento entre backend y frontend. Define el lenguaje común del sistema:

- **Enums de Estado:** `TrackStatusEnum` (New, Searching, Downloading...) que controla la UI.
- **Formatos:** `SUPPORTED_AUDIO_FORMATS` (mp3, flac, opus, etc.).
- **i18n:** `APP_LOCALES` (es, en) para la internacionalización.

### 5.2. Integración Spotify (`SpotifyAuthService`)

Maneja la complejidad de OAuth2 de forma transparente:

- **Dual Token Strategy:** Usa _Client Credentials_ para búsquedas públicas y _Authorization Code_ para datos de usuario.
- **Auto-Refresh:** Almacena el `refresh_token` en base de datos cifrada y renueva el token automáticamente antes de que expire, garantizando que los Cron Jobs nocturnos nunca fallen por auth.
- **Estrategia de proveedores de catálogo:** Spotify sigue siendo la fuente de verdad para **auth y datos de usuario** (artistas seguidos, playlists, librería). Para **datos públicos de catálogo** (discografía, tracks, lanzamientos), el backend prioriza **Deezer** como primario, **MusicBrainz** como fallback secundario, y **Spotify** como fallback terminal. Esto mitiga las restricciones de quota de Spotify sin perder funcionalidad.

Nota: el orquestador de catálogo de alto nivel es `SpotifyService`, que vive en `application/services/spotify.service.ts` y recibe los clients de Spotify por constructor.

### 5.3. Health & Connectivity

- `application/services/health.service.ts` agrega los checks de conectividad.
- `application/ports/connectivity.port.ts` define el contrato `pingDatabase()`.
- `infrastructure/database/prisma-connectivity.adapter.ts` implementa ese contrato con `prisma.$queryRaw`.
- `GET /api/health` responde `200 { status: "ok" }` si todo está sano, o `503 { status: "degraded", components: { db: "down" } }` si falla DB.

### 5.4. Motor de Descarga (`YoutubeDownloadService`)

No es solo un script de shell. Es un wrapper inteligente sobre `yt-dlp`:

- **Configuración Dinámica:** Inyecta cookies del navegador para saltar restricciones de edad en YouTube.
- **Calidad Adaptativa:** Mapea la preferencia del usuario (Best/Good/Acceptable).
- **Seguridad:** Usa una copia local de `yt-dlp` en entornos restrictivos (como Docker) para asegurar permisos de ejecución.

### 5.5. Motor de Búsqueda (`YoutubeSearchService`)

La pieza clave para encontrar la canción correcta:

- Utiliza el operador `ytsearch1:` de yt-dlp.
- Soporta cookies del usuario para acceder a resultados "Premium" o verificados de YouTube Music.
- Realiza una búsqueda precisa formato `Artist - Track` para minimizar falsos positivos.

### 5.6. Server-Sent Events (SSE)

Implementación nativa sin librerías pesadas como Socket.io:

- El backend mantiene un array de conexiones abiertas (`events.routes.ts`).
- `SseEventBus` desacopla la lógica: cualquier servicio puede hacer `eventBus.emit('event')` sin saber nada de HTTP.
- Es unidireccional (Server -> Client), ideal para notificaciones de progreso.

### 5.7. Post-Procesado (`TrackPostProcessingService`)

Donde ocurre la magia de los metadatos:

- **ID3 Tags:** No solo añade Artista y Título. Inyecta Álbum, Año, Número de Pista, Disco y Carátula.
- **M3U Generator:** Regenera dinámicamente el archivo `.m3u8` de la playlist cada vez que se completa una descarga nueva.
- **File Organization:** Mueve los archivos a la estructura canónica `Artist/Album/Track.ext` que Jellyfin espera.

### 5.8. Reproductor Nativo y Streaming

La aplicación incluye un reproductor de música nativo robusto para la reproducción local:

- **Gestión de Estado:** `usePlayerStore` gestiona la cola activa, el estado de reproducción (reproduciendo/pausado), y los modos de aleatorio (shuffle) y repetición. Utiliza una arquitectura modular de slices (`playerUISlice`) para el estado efímero de la UI.
- **Media Session API:** Integrado con la API de Media Session del navegador para proporcionar controles a nivel de sistema operativo (pantalla de bloqueo, teclas multimedia, Bluetooth) y visualización de metadatos.
- **Streaming Seguro:** Un endpoint dedicado en el backend (`/api/audio/:trackId`) sirve los archivos de audio con soporte para peticiones HTTP Range, permitiendo el posicionamiento (seeking) y un buffering eficiente.
- **UI Responsiva:** Incluye una `GlobalPlayerBar` estilo Spotify para escritorio y una vista `NowPlayingFullscreen` para dispositivos móviles con gestos táctiles.
- **Gestión de Cola:** Soporta reordenación mediante drag-and-drop y transiciones fluidas entre pistas.

### 5.9. Generación de Playlists con IA (`AiPlaylistWorker`)

Flujo completo desde el chat hasta el archivo descargado:

1. **Generación LLM:** `GenerateAiPlaylistUseCase` invoca `OpenAiCompatibleAdapter` (Vercel AI SDK `generateObject`); el proveedor se lee de la tabla `Setting` en DB (`AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`). Proveedores soportados: `openai`, `gemini`, `openrouter`, `groq`, `nvidia`, `ollama`, `ollama-cloud`, `lmstudio`, `vercel`, `custom`.
2. **Resolución Spotify:** Las sugerencias del LLM se resuelven contra la API de Spotify para obtener tracks reales.
3. **Descarga:** `ai-playlist.worker.ts` reutiliza el pipeline normal de descarga.
4. **Progreso en tiempo real:** `AiPlaylistProgressEvent` se emite vía SSE → `useServerEvents` → `lib/aiProgressBus.ts` en el frontend.
5. **Resultado:** La playlist se guarda con `type=ai`, owner "SpotiArr AI", bajo `Playlists/<name>/`. Toda la configuración reside en DB; no hay variables de entorno de IA.

## 6. Modelo de Datos y Persistencia

Utilizamos **Prisma** con **SQLite** para una gestión de datos relacional robusta pero portable.

**Entidades Principales:**

- **Playlist:** Representa una lista de Spotify (álbum o playlist). Puede estar marcada como `subscribed` para actualizaciones automáticas. Las playlists generadas por IA tienen `type=ai` y owner "SpotiArr AI".
- **Track:** La unidad mínima. Contiene metadatos de Spotify y el estado de la descarga local (`New` -> `Searching` -> `Downloading` -> `Completed` -> `Error`).
- **Setting:** Almacenamiento clave-valor para la configuración del usuario (ej: formato de audio, ruta de descargas).
- **DownloadHistory:** Histórico inmutable de descargas completadas para estadísticas.

## 7. Automatización y Background Jobs

SpotiArr no es solo un descargador bajo demanda, es un sistema autónomo.

1.  **Sincronización de Playlists (`Cron Job`):**
    - Cada X minutos (configurable), el sistema revisa todas las playlists marcadas como `subscribed`.
    - Compara con Spotify API y si detecta pistas nuevas, las encola automáticamente.
2.  **Limpieza de Procesos Atascados:**
    - Un job vigila descargas que lleven demasiado tiempo en estado "Downloading" (zombies) y las marca como error para permitir reintentos, evitando bloqueos eternos.
3.  **Generación de Playlist con IA (bajo demanda):**
    - Disparado desde el AI Chat, no es un cron job. `ai-playlist.worker.ts` ejecuta: generación LLM → resolución Spotify → descarga → notificación SSE. El progreso se reporta en tiempo real vía `AiPlaylistProgressEvent`.

## 8. Seguridad y Validación

Implementamos una estrategia de **fail-fast** y validación estricta de datos.

- **Zod Schemas:** Todas las entradas de API (`presentation/routes/schemas`) y las variables de entorno (`environment.ts`) se validan con Zod. Si un dato no tiene el formato correcto, la aplicación rechaza la petición inmediatamente antes de tocar la lógica de negocio.
- **Error Handling Centralizado:** Middleware global (`error-handler.ts`) que captura cualquier excepción, la estandariza a una respuesta JSON segura (sin stack traces en producción) y previene caídas del servidor.
- **Rate Limiting Personal:** El worker de descargas (`track-download.worker.ts`) implementa su propio mecanismo de pausa basado en la configuración del usuario (`YT_DOWNLOADS_PER_MINUTE`) para ser "buenos ciudadanos" con los servidores de YouTube.

### 8.1. Autenticación de instancia (middleware `require-token`)

**Modelo de amenaza:** SpotiArr está diseñado para uso en red local de confianza. Cuando se expone a internet, una clave compartida protege la instancia completa sin necesidad de cuentas de usuario ni proveedores de identidad externos.

**Diseño:**

- **Opcional, activado por variable de entorno.** Cuando `SPOTIARR_TOKEN` no está configurado, el middleware no se monta — cero sobrecarga, cero cambio de comportamiento para despliegues en LAN.
- **Ubicación en capas.** El middleware `require-token` vive en la capa `presentation/`, registrado en el router de Express antes de todas las rutas `/api/*`. El valor del token se inyecta desde `container.ts` (raíz de composición), manteniendo el middleware ajeno a `process.env` y respetando el límite de capa R4.
- **Cookie HMAC-SHA256 sin estado.** Tras un desbloqueo exitoso (`POST /api/auth/unlock`), el servidor emite una cookie httpOnly, Secure, `SameSite=Strict` firmada con el propio token. Todas las llamadas API posteriores se validan contra esta cookie. Al estar firmada con el token, rotar `SPOTIARR_TOKEN` invalida de inmediato todas las sesiones activas — sin necesidad de almacén de sesiones.
- **Comparación en tiempo constante.** La verificación del token usa `crypto.timingSafeEqual` para prevenir ataques de temporización.
- **Rate limiting.** El endpoint de desbloqueo tiene límite de intentos por IP (`SPOTIARR_UNLOCK_RATELIMIT`, por defecto 5/min) para resistir ataques de fuerza bruta. `SPOTIARR_TRUST_PROXY` debe configurarse cuando se opera detrás de un proxy inverso para que la IP real del cliente se resuelva correctamente.
- **Transporte SSE.** Los Server-Sent Events (`/api/events`) están cubiertos por la misma verificación de cookie — no se necesita un token de autenticación separado para el flujo de eventos.
- **Lista de exclusión.** Tres rutas omiten el control: `POST /api/auth/unlock` (el flujo de desbloqueo en sí), `GET /api/health` (sondas de infraestructura) y `GET /api/auth/spotify/callback` (redirección OAuth — Spotify contacta esta URL del lado del servidor y no puede presentar la cookie).

**Contraparte en el frontend:** Cuando el backend devuelve `401`, la aplicación React muestra `<TokenGate>` — un formulario de desbloqueo a pantalla completa — en lugar de la UI normal. Una vez que la cookie está establecida, la aplicación se reanuda sin recargar la página.

### 8.2. Política CORS

**Modelo de amenaza:** El SPA y la API se sirven desde el mismo proceso Express, así que la aplicación es del mismo origen y no necesita CORS en absoluto. Un comodín `Access-Control-Allow-Origin: *` es, por tanto, pura superficie de ataque, especialmente en instancias expuestas a internet.

**Diseño:**

- **Opcional, activado por variable de entorno.** CORS está deshabilitado por defecto. El middleware `cors()` se monta solo cuando `SPOTIARR_CORS_ORIGIN` está definida; los despliegues del mismo origen nunca ven una cabecera CORS.
- **Lista explícita, nunca comodín.** `SPOTIARR_CORS_ORIGIN` es una lista de orígenes exactos separados por comas, validada al arranque para rechazar `*`. Cuando se habilita, CORS se ejecuta con `credentials: true` contra esa lista — la combinación `*` + credenciales es imposible por construcción (`buildCorsOptions` también elimina cualquier comodín como defensa en profundidad).
- **Ubicación de capa.** La lista se inyecta desde `container.ts` en el constructor de `EventsController`, de modo que el transporte SSE refleja la política global (devolviendo el origen de la petición solo cuando está en la lista) sin que la capa `presentation/` importe `getEnv` — el mismo patrón que respeta R4 que usa `require-token`.

## 9. Ciclo de Vida de una Descarga

El proceso más crítico de la aplicación funciona así:

1.  **Solicitud (Frontend -> API):**
    - El usuario pega una URL de Spotify.
    - Frontend llama a `POST /api/playlists`.

2.  **Ingesta (UseCase):**
    - `CreatePlaylistUseCase` obtiene metadatos de Spotify API.
    - Guarda las pistas en DB con estado `PENDING`.
    - Encola trabajos de descarga en **BullMQ**.

3.  **Procesamiento (Worker):**
    - Un worker de BullMQ toma el trabajo.
    - **Búsqueda:** `YoutubeSearchService` busca el mejor match de audio en YouTube/YoutubeMusic.
    - **Descarga:** `YoutubeDownloadService` invoca a `yt-dlp` para bajar el audio.
    - **Post-Procesado:** `TrackPostProcessingService`:
      - Convierte a MP3/M4A con **FFmpeg**.
      - Incrusta carátula y tags ID3.
      - Mueve el archivo a la carpeta final: `Downloads / Artista / Album / Track.mp3`.
      - Genera archivo `.m3u8` para la playlist.

4.  **Notificación (EventBus):**
    - El backend emite eventos Server-Sent Events (SSE).
    - El frontend recibe el evento y actualiza la barra de progreso en tiempo real sin recargar.

## 10. Infraestructura y Despliegue

Todo está contenerizado con **Docker** para garantizar reproducibilidad.

- **Redis:** Persistencia de colas.
- **Volúmenes:** Mapeo de carpetas locales para persistir descargas y base de datos.
- **Traefik (Optional):** Proxy inverso configurado para manejo de HTTPS (necesario para Auth de Spotify en remoto).

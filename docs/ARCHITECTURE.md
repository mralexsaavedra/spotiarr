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

### Core de Medios

- **yt-dlp:** Motor de descarga principal.
- **FFmpeg:** Conversión de audio y post-procesado.
- **Node-ID3:** Etiquetado de metadatos (Cover art, Artist, Album, etc.).

## 4. Estructura del Proyecto

### 4.1. Backend (Clean Architecture)

El backend sigue principios de **Clean Architecture** y **Domain-Driven Design (DDD)** simplificado.

```
apps/backend/src/
├── application/         # Lógica de negocio pura
│   ├── services/        # Servicios orquestadores (TrackService, PlaylistService)
│   └── use-cases/       # Acciones únicas: CreateTrack, DownloadTrack...
├── domain/              # Modelos y contratos (Interfaces)
├── infrastructure/      # Implementaciones concretas
│   ├── database/        # Repositorios Prisma
│   ├── external/        # Integraciones (Spotify API, YouTube, Filesystem)
│   ├── jobs/            # Tareas programadas (Cron Jobs)
│   └── messaging/       # Colas (BullMQ) y Eventos (SSE)
├── presentation/        # API Rest (Rutas y Controladores)
└── container.ts         # Inyección de Dependencias (DI) Manual
```

**Patrones de Backend utilizados:**

1.  **Dependency Injection (DI):** Todo se instancia en `container.ts` para testabilidad.
2.  **Repository Pattern:** Desacopla la lógica de negocio de la base de datos (Prisma).
3.  **Use Cases:** Cada acción del usuario tiene una clase dedicada, evitando servicios monolíticos.

### 4.2. Frontend (Atomic Design + Feature Driven)

El frontend está organizado para escalar, separando componentes visuales puros de la lógica de negocio y las vistas.

```
apps/frontend/src/
├── components/          # Elementos de UI reutilizables (Atomic Design)
│   ├── atoms/           # Botones, Inputs, Iconos básicos
│   ├── molecules/       # Campos de búsqueda, Cards simples
│   └── organisms/       # Cards complejas, Listas, Modales
├── views/               # Páginas completas (Screens de la aplicación)
├── hooks/               # Custom Hooks Architecture
│   ├── controllers/     # Lógica de Vistas (ViewModel Pattern)
│   ├── queries/         # Wrappers de lectura API (React Query)
│   ├── mutations/       # Wrappers de escritura API (React Query)
│   └── useServerEvents  # Sincronización Real-time (SSE)
├── services/            # Fetchers puros
└── store/               # Estado Global UI (Zustand)
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

### 5.3. Motor de Descarga (`YoutubeDownloadService`)

No es solo un script de shell. Es un wrapper inteligente sobre `yt-dlp`:

- **Configuración Dinámica:** Inyecta cookies del navegador para saltar restricciones de edad en YouTube.
- **Calidad Adaptativa:** Mapea la preferencia del usuario (Best/Good/Acceptable).
- **Seguridad:** Usa una copia local de `yt-dlp` en entornos restrictivos (como Docker) para asegurar permisos de ejecución.

### 5.4. Motor de Búsqueda (`YoutubeSearchService`)

La pieza clave para encontrar la canción correcta:

- Utiliza el operador `ytsearch1:` de yt-dlp.
- Soporta cookies del usuario para acceder a resultados "Premium" o verificados de YouTube Music.
- Realiza una búsqueda precisa formato `Artist - Track` para minimizar falsos positivos.

### 5.5. Server-Sent Events (SSE)

Implementación nativa sin librerías pesadas como Socket.io:

- El backend mantiene un array de conexiones abiertas (`events.routes.ts`).
- `SseEventBus` desacopla la lógica: cualquier servicio puede hacer `eventBus.emit('event')` sin saber nada de HTTP.
- Es unidireccional (Server -> Client), ideal para notificaciones de progreso.

### 5.6. Post-Procesado (`TrackPostProcessingService`)

Donde ocurre la magia de los metadatos:

- **ID3 Tags:** No solo añade Artista y Título. Inyecta Álbum, Año, Número de Pista, Disco y Carátula.
- **M3U Generator:** Regenera dinámicamente el archivo `.m3u8` de la playlist cada vez que se completa una descarga nueva.
- **File Organization:** Mueve los archivos a la estructura canónica `Artist/Album/Track.ext` que Jellyfin espera.

## 6. Modelo de Datos y Persistencia

Utilizamos **Prisma** con **SQLite** para una gestión de datos relacional robusta pero portable.

**Entidades Principales:**

- **Playlist:** Representa una lista de Spotify (álbum o playlist). Puede estar marcada como `subscribed` para actualizaciones automáticas.
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

## 8. Seguridad y Validación

Implementamos una estrategia de **fail-fast** y validación estricta de datos.

- **Zod Schemas:** Todas las entradas de API (`presentation/routes/schemas`) y las variables de entorno (`environment.ts`) se validan con Zod. Si un dato no tiene el formato correcto, la aplicación rechaza la petición inmediatamente antes de tocar la lógica de negocio.
- **Error Handling Centralizado:** Middleware global (`error-handler.ts`) que captura cualquier excepción, la estandariza a una respuesta JSON segura (sin stack traces en producción) y previene caídas del servidor.
- **Rate Limiting Personal:** El worker de descargas (`track-download.worker.ts`) implementa su propio mecanismo de pausa basado en la configuración del usuario (`YT_DOWNLOADS_PER_MINUTE`) para ser "buenos ciudadanos" con los servidores de YouTube.

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

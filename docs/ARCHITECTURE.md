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
    - Configuraciones centrales para ESLint, Prettier y TypeScript.
    - **Beneficio:** Todo el código sigue el mismo estándar. No hay peleas por si usar comillas simples o dobles; el repo lo impone.

3.  **Gestión Atómica:**
    - Versionado y despliegue conjunto. Un solo commit puede contener la migración de base de datos (Backend) y el componente UI que consume esos nuevos datos (Frontend).

### ¿Por qué pnpm?

- **Eficiencia:** Es mucho más rápido que npm/yarn y utiliza un _store_ global, ahorrando cientos de megas en disco al no duplicar `node_modules` en cada paquete.

## 3. Stack Tecnológico

La elección de tecnologías prioriza la **Modernidad**, el **Tipado (TypeScript)** y la **Experiencia de Desarrollo (DX)**.

### Frontend (`/src/frontend`)

- **React 19:** Utilizamos la versión más reciente para estar preparados para el futuro (Server Actions, mejoras en renderizado), aunque actualmente usamos principalmente el modelo de cliente SPA.
- **Vite:** El estándar actual para builds. Arranque instantáneo y Hot Module Replacement (HMR) extremadamente rápido.
- **Tailwind CSS v4:** Escribir CSS es tedioso; Tailwind nos permite iterar UI muy rápido. La versión 4 trae un motor nátivo mucho más rápido y simplificado.
- **Gestión de Estado Híbrida:**
  - **Zustand:** Para estado global de la interfaz (ej: "el modal está abierto", "el usuario colapsó el menú"). Es minimalista y evita el boilerplate de Redux.
  - **TanStack Query (React Query):** Para el estado asíncrono (datos del servidor). Maneja caché, reintentos y estados de carga ("loading", "error") automáticamente.
- **React Router:** Para el enrutamiento del lado del cliente.

### Backend (`/src/backend`)

- **Node.js & Express:** La opción segura y robusta. Aunque existen frameworks más modernos (Hono, Fastify), Express v5 ofrece el ecosistema más amplio y facilidad de integración.
- **Prisma ORM:**
  - **¿Por qué?:** Es la mejor herramienta para TypeScript. Genera tipos automáticamente basados en nuestro esquema de base de datos.
  - **DB:** SQLite por defecto (fácil, archivo único, sin configuración) pero cambiable a PostgreSQL fácilmente gracias a Prisma.
- **BullMQ + Redis:**
  - **El Corazón de las Descargas:** Descargar audio y convertirlo es costoso en CPU/tiempo. No podemos bloquear el servidor web.
  - **Solución:** Usamos colas. El usuario pide una descarga -> Se añade un trabajo a BullMQ -> Un "worker" procesa la descarga en segundo plano -> Se notifica el progreso vía WebSocket/Polling.

### Core de Medios

- **yt-dlp:** El motor de descarga más potente mantenido por la comunidad.
- **FFmpeg:** Para conversión de audio y manipulación de metadatos.
- **Node-ID3:** Para asegurar que los archivos MP3 tengan tags (ID3) correctos que Jellyfin/Plex puedan leer.

## 4. Infraestructura y Despliegue

Todo está contenerizado con **Docker**.

- Resuelve el problema de "en mi máquina funciona".
- Empaqueta dependencias del sistema difíciles de instalar manualmente (Python, FFmpeg, dependencias de compilación) en una imagen lista para usar.

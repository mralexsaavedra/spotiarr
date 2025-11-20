# TODO - SpotiArr Improvements

## 🔴 Críticas (Prioridad Alta)

### 1. Verificar instalación de dependencias TypeScript
- **Estado**: Pendiente
- **Descripción**: Ejecutar `pnpm install` en src/backend para resolver errores de @nestjs/typeorm y @nestjs/bullmq
- **Comando**: `cd src/backend && pnpm install`

### 2. Configurar GitHub Actions Secrets
- **Estado**: Pendiente
- **Descripción**: Añadir DOCKER_USERNAME y DOCKER_PASSWORD en GitHub repository settings
- **Pasos**:
  1. Ir a: https://github.com/mralexsaavedra/spotiarr/settings/secrets/actions
  2. Añadir `DOCKER_USERNAME` con tu usuario de Docker Hub
  3. Añadir `DOCKER_PASSWORD` con tu token de Docker Hub

### 3. Actualizar CHANGELOG.md v0.1.0
- **Estado**: Pendiente
- **Descripción**: Documentar todas las mejoras recientes
- **Incluir**:
  - Eliminación completa de tests (Jest, Karma, Jasmine)
  - Docker Compose completo (3 archivos: main, override, dev)
  - Consolidación de .env (de 3 a 1 archivo)
  - Consolidación de .gitignore (de 3 a 1 archivo)
  - Corrección de descripción del proyecto (Lidarr-inspired)
  - Actualización de toda la documentación (README, CONTRIBUTING)
  - Creación de .dockerignore
  - Optimización de Dockerfile
  - Mejora de GitHub Actions workflow

## 🟡 Importantes (Mejoras de Producción)

### 4. Crear script de validación de .env
- **Estado**: Pendiente
- **Descripción**: Implementar validación al inicio que verifique variables requeridas
- **Variables a validar**:
  - `SPOTIFY_CLIENT_ID` (requerido)
  - `SPOTIFY_CLIENT_SECRET` (requerido)
  - `REDIS_HOST` (requerido)
  - `REDIS_PORT` (requerido)
  - `DOWNLOADS_PATH` (requerido)
- **Implementación**: Crear función en `main.ts` que valide antes de bootstrap

### 5. Añadir endpoint /api/health
- **Estado**: Pendiente
- **Descripción**: Crear health check endpoint para monitoreo de producción
- **Checks a incluir**:
  - Estado de Redis (conexión activa)
  - Estado de base de datos SQLite
  - Espacio en disco disponible
  - Versión de la aplicación
- **Respuesta esperada**:
  ```json
  {
    "status": "healthy",
    "version": "0.1.0",
    "redis": "connected",
    "database": "connected",
    "diskSpace": "available"
  }
  ```

### 6. Implementar logging estructurado
- **Estado**: Pendiente
- **Descripción**: Añadir Winston o Pino para logging profesional
- **Características**:
  - Niveles: error, warn, info, debug
  - Formato JSON estructurado
  - Rotación de logs por tamaño/fecha
  - Logs diferentes para desarrollo y producción
- **Dependencias**: `winston` o `pino` + `pino-pretty`

### 7. Añadir rate limiting
- **Estado**: Pendiente
- **Descripción**: Implementar @nestjs/throttler para proteger endpoints
- **Configuración sugerida**:
  - Global: 100 requests por 15 minutos
  - `/api/playlist`: 20 requests por 15 minutos
  - `/api/track`: 50 requests por 15 minutos
- **Dependencias**: `@nestjs/throttler`

## 🟢 Opcionales (UX/DX)

### 8. Crear favicon personalizado
- **Estado**: Pendiente
- **Descripción**: Generar favicon.ico basado en logo.svg
- **Tareas**:
  - Convertir `assets/logo.svg` a favicon.ico (múltiples tamaños)
  - Añadir a `src/frontend/public/favicon.ico`
  - Verificar que `index.html` lo referencie correctamente
- **Herramientas**: https://realfavicongenerator.net/

### 9. Añadir variable NODE_ENV al .env.example
- **Estado**: Pendiente
- **Descripción**: Documentar NODE_ENV para diferenciar entornos
- **Valores**: `development`, `production`
- **Uso**:
  - Cambiar nivel de logs según entorno
  - Habilitar/deshabilitar dev tools
  - Ajustar configuración de CORS

### 10. Crear script de pre-commit con linting
- **Estado**: Pendiente
- **Descripción**: Configurar husky + lint-staged para linting automático
- **Configuración**:
  - Ejecutar ESLint en archivos .ts modificados
  - Ejecutar Prettier en archivos modificados
  - Prevenir commits con errores de lint
- **Dependencias**: `husky`, `lint-staged`
- **Archivos**: `.husky/pre-commit`, `.lintstagedrc.json`

---

## Notas

- Fecha de creación: 20 de noviembre de 2025
- Este documento se actualizará conforme se completen las tareas
- Para marcar como completada, cambiar **Estado** de "Pendiente" a "✅ Completado"

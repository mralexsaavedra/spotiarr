---
name: spotiarr-bullmq
description: >
  BullMQ queue/worker patterns for Spotiarr's async job processing.
  Trigger: When writing queue definitions, workers, job handlers, or cron jobs in the backend.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Defining queues for backend async processing
- Writing BullMQ workers and job handlers
- Enqueueing jobs from application services
- Configuring scheduled/cron backend jobs
- Working inside `apps/backend/`

## Critical Patterns

### Pattern 1: Layer placement

- Queue initialization: `infrastructure/setup/queues.ts` (singleton getter pattern)
- Queue service contract: `domain/services/track-queue.service.ts`
- Queue service implementation: `infrastructure/messaging/`
- Workers: `infrastructure/workers/` (one file per worker)
- Cron/scheduled jobs: `infrastructure/jobs/`
- Job enqueuing entrypoint: `application/` layer via domain queue service interface

**Real queue names** (from `infrastructure/setup/queues.ts`):

```ts
"track-download-processor"; // getTrackDownloadQueue()
"track-search-processor"; // getTrackSearchQueue()
"feed-sync-queue"; // getFeedSyncQueue()
"catalog-sync-queue"; // getCatalogSyncQueue()
```

Singleton getters throw `AppError(500, ...)` if accessed before initialization.

### Pattern 2: Job configuration

- Use custom job IDs for traceability: `${type}-${entityId}-${Date.now()}`
- Download jobs use exponential backoff:
  - `attempts: 3`
  - delay: `5000ms`
- Search jobs default to no retry:
  - `attempts: 1`
- Rate-limit downloads via `YT_DOWNLOADS_PER_MINUTE`
- Control search concurrency via `YT_SEARCH_CONCURRENCY`

### Pattern 3: Worker event handling

- `completed`: log job completion
- `drained`: trigger downstream actions (e.g. library scan, emit SSE events)
- `failed`: update entity status (e.g. track → Error), emit update events

### Pattern 4: Redis connection

- Centralize Redis host/port via `getEnv()`
- Reuse a singleton/shared Redis connection across queues

### Pattern 5: Cron jobs

- Keep scheduled jobs in `infrastructure/jobs/`
- Use `node-cron` for scheduling
- No locking mechanism exists; prevent overlapping runs at implementation level

### Pattern 6: Worker factory pattern

Workers are created via factory functions, not classes. Real example:

```ts
// infrastructure/workers/catalog-sync.worker.ts
export function createCatalogSyncWorker(): Worker {
  const worker = new Worker(
    CATALOG_SYNC_QUEUE,
    async () => {
      /* job handler */
    },
    {
      connection: { host: getEnv().REDIS_HOST, port: getEnv().REDIS_PORT },
      concurrency: 1,
      lockDuration: 30 * 60_000,
    },
  );
  worker.on("completed", (job) => {
    /* log */
  });
  worker.on("failed", (job, err) => {
    /* log + update status */
  });
  return worker;
}
```

### Pattern 7: Enqueuing from application layer

```ts
// application use-case enqueues via domain interface, infrastructure implements:
await getTrackSearchQueue().add("search-track", track, {
  jobId: `id-${track.id}`,
});
await getTrackDownloadQueue().add("download-track", track, {
  jobId: `download-${track.id}-${Date.now()}`,
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
});
```

### Gotchas

- No dead-letter queue (DLQ): jobs are lost after max attempts
- Workers may depend on settings not initialized yet
- `job.data` arrives unvalidated — consider Zod parse at worker entry for safety
- Job ID collisions can occur if the same entity is enqueued rapidly; use `Date.now()` suffix for download jobs

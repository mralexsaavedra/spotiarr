---
name: spotiarr-bullmq
description: "Trigger: BullMQ, queue, worker, job, cron, async job, enqueue. BullMQ patterns for spotiarr: real queue names, worker factory, job config, gotchas."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Load when defining queues, writing workers, enqueueing jobs, or configuring cron jobs in `apps/backend/`.

## Hard Rules

- Queue singletons initialized in `infrastructure/setup/queues.ts`. Accessing before init throws `AppError(500)`.
- Enqueue from `application/` layer via domain service interface — never directly from `presentation/`.
- Workers go in `infrastructure/workers/` (one file per worker, factory function pattern — not classes).
- Scheduled jobs go in `infrastructure/jobs/`. No locking mechanism — prevent overlapping at implementation level.
- `job.data` arrives unvalidated — Zod-parse at worker entry.

## Real Queue Names

```ts
"track-download-processor"; // getTrackDownloadQueue()
"track-search-processor"; // getTrackSearchQueue()
"feed-sync-queue"; // getFeedSyncQueue()
"catalog-sync-queue"; // getCatalogSyncQueue()
```

## Decision Gates

| Job type | Config                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| Download | `attempts: 3`, exponential backoff `delay: 5000ms`, `removeOnComplete: true`       |
| Search   | `attempts: 1` (no retry)                                                           |
| Job IDs  | `${type}-${entityId}` for dedup; `${type}-${entityId}-${Date.now()}` for downloads |

**Worker events to handle:** `completed` (log) · `drained` (trigger SSE events / library scan) · `failed` (update entity status → Error, emit SSE).

## Gotchas

- **No DLQ**: jobs are lost after max attempts.
- Job ID collisions: download jobs enqueued rapidly — always use `Date.now()` suffix.
- Workers may depend on settings not yet initialized — ensure container init order.

## References

- Queues setup: `apps/backend/src/infrastructure/setup/queues.ts`
- Workers: `apps/backend/src/infrastructure/workers/`
- Jobs (cron): `apps/backend/src/infrastructure/jobs/`

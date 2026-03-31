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

### Gotchas

- No dead-letter queue (DLQ): jobs are lost after max attempts
- Workers may depend on settings not initialized yet
- `job.data` is processed without explicit validation
- Job ID collisions can occur if the same entity is enqueued rapidly

## Commands

No specific commands. Refer to `spotiarr-workflow` for backend development commands.

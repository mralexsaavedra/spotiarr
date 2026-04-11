import { AppError } from "../../domain/errors/app-error.js";

interface RateLimiterOptions {
  maxConcurrency?: number;
  queueTimeoutMs?: number;
  maxQueueSize?: number;
  minIntervalMs?: number;
}

interface QueueItem<T> {
  run: () => void;
  reject: (reason?: unknown) => void;
  timeoutId: NodeJS.Timeout;
  started: boolean;
}

const DEFAULT_MAX_CONCURRENCY = 3;
const DEFAULT_QUEUE_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_QUEUE_SIZE = 500;
const DEFAULT_MIN_INTERVAL_MS = 200;

export class RateLimiter {
  private readonly maxConcurrency: number;
  private readonly queueTimeoutMs: number;
  private readonly maxQueueSize: number;
  private readonly minIntervalMs: number;

  private activeCount = 0;
  private lastExecTime = 0;
  private readonly queue: QueueItem<unknown>[] = [];

  constructor(options: RateLimiterOptions = {}) {
    this.maxConcurrency = Math.max(1, options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY);
    this.queueTimeoutMs = Math.max(1, options.queueTimeoutMs ?? DEFAULT_QUEUE_TIMEOUT_MS);
    this.maxQueueSize = Math.max(1, options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE);
    this.minIntervalMs = Math.max(0, options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS);
  }

  queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrency && this.queue.length === 0) {
      return this.execute(fn);
    }

    if (this.queue.length >= this.maxQueueSize) {
      console.warn("[RateLimiter] Queue overflow", {
        queueSize: this.queue.length,
        maxQueueSize: this.maxQueueSize,
        timestamp: new Date().toISOString(),
      });
      return Promise.reject(
        new AppError(503, "rate_limiter_overflow", "Rate limiter queue overflow."),
      );
    }

    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = {
        run: () => {
          item.started = true;
          clearTimeout(item.timeoutId);
          void this.execute(fn).then(resolve, reject);
        },
        reject,
        timeoutId: setTimeout(() => {
          if (item.started) {
            return;
          }

          const index = this.queue.indexOf(item as QueueItem<unknown>);
          if (index >= 0) {
            this.queue.splice(index, 1);
          }

          item.reject(
            new Error(
              `[RateLimiter] Queue timeout after ${this.queueTimeoutMs}ms waiting for an available slot`,
            ),
          );
        }, this.queueTimeoutMs),
        started: false,
      };

      this.queue.push(item as QueueItem<unknown>);
      this.processQueue();
    });
  }

  private async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Enforce minimum interval between request starts
    if (this.minIntervalMs > 0) {
      const elapsed = Date.now() - this.lastExecTime;
      if (elapsed < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
      }
    }
    this.lastExecTime = Date.now();
    this.activeCount += 1;

    try {
      return await fn();
    } finally {
      this.activeCount -= 1;
      this.processQueue();
    }
  }

  private processQueue(): void {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      next?.run();
    }
  }
}

import { EventEmitter } from "events";
import { container } from "@/container";
import type { EventBus } from "@/domain/events/event-bus";

export class AppEventBus extends EventEmitter implements EventBus {
  // Override emit to send to both internal listeners and SSE
  emit(event: string, data?: unknown): boolean {
    // 1. Emit to internal Node.js listeners
    const result = super.emit(event, data);

    // 2. Emit to Frontend via SSE
    // (We only send data if it's serializable, which it usually is in this app)
    container.eventsController.emit(event, data);

    return result;
  }
}

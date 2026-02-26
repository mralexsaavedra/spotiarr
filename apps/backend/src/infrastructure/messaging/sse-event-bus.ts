import { container } from "@/container";
import { EventBus } from "@/domain/events/event-bus";

export class SseEventBus implements EventBus {
  emit(event: string, data: unknown = {}): void {
    // (We only send data if it's serializable, which it usually is in this app)
    container.eventsController.emit(event, data);
  }
}

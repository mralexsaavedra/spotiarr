import { EventBus } from "../../domain/events/event-bus";
import { emitSseEvent } from "../../presentation/routes/events.routes";

export class SseEventBus implements EventBus {
  emit(event: string, data: unknown = {}): void {
    emitSseEvent(event, data);
  }
}

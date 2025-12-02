export interface EventBus {
  emit(event: string, data?: unknown): void;
}

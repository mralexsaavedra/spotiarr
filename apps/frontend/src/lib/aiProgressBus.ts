import type { AiPlaylistProgressEvent } from "@spotiarr/shared";

export type AiProgressListener = (event: AiPlaylistProgressEvent) => void;

const listeners = new Set<AiProgressListener>();

export const aiProgressBus = {
  on: (listener: AiProgressListener): void => {
    listeners.add(listener);
  },
  off: (listener: AiProgressListener): void => {
    listeners.delete(listener);
  },
  emit: (event: AiPlaylistProgressEvent): void => {
    listeners.forEach((fn) => fn(event));
  },
  removeAllListeners: (): void => {
    listeners.clear();
  },
};

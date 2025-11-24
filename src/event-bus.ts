import type { BusListener } from "./app-types.js";

export type EventBus<EventMap extends Record<string, unknown>> = {
  on<E extends keyof EventMap>(
    event: E,
    listener: BusListener<EventMap[E]>
  ): string;
  off<E extends keyof EventMap>(event: E, listenerId: string): void;
  emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): Promise<void>;
};

export function createEventBus<EventMap extends Record<string, unknown>>(): EventBus<EventMap> {
  const listeners = new Map<keyof EventMap, Map<string, BusListener<any>>>();
  let counter = 0;

  const on = <E extends keyof EventMap>(
    event: E,
    listener: BusListener<EventMap[E]>
  ): string => {
    const bucket = listeners.get(event) ?? new Map<string, BusListener<any>>();
    const id = `${String(event)}:${counter++}`;
    bucket.set(id, listener);
    listeners.set(event, bucket);
    return id;
  };

  const off = <E extends keyof EventMap>(event: E, listenerId: string): void => {
    const bucket = listeners.get(event);
    if (!bucket) return;
    bucket.delete(listenerId);
    if (!bucket.size) listeners.delete(event);
  };

  const emit = async <E extends keyof EventMap>(
    event: E,
    payload: EventMap[E]
  ): Promise<void> => {
    const bucket = listeners.get(event);
    if (!bucket) return;
    for (const listener of bucket.values()) {
      await (listener as BusListener<EventMap[E]>)(payload);
    }
  };

  return { on, off, emit };
}

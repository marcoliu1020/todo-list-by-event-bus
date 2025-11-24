import type { AppEventMap, DomActionPayload } from "./app-types.js";
import type { EventBus } from "./event-bus.js";

export function parseDataAttributes(element: HTMLElement): Record<string, string> {
  return Array.from(element.attributes).reduce<Record<string, string>>(
    (acc, attr) => {
      if (!attr.name.startsWith("data-") || attr.name === "data-action") {
        return acc;
      }
      const key = attr.name
        .slice(5)
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      return { ...acc, [key]: attr.value };
    },
    {}
  );
}

export function handleDataAction(
  appEvents: EventBus<AppEventMap>,
  element: HTMLElement,
  event: Event
): void {
  const action = element.dataset.action;
  if (!action) return;
  if (event.type === "submit") {
    event.preventDefault();
  }

  const data = parseDataAttributes(element);

  void appEvents.emit("dom:action", {
    action,
    element,
    data,
    originalEvent: event,
  });
}

import type { AppEventMap, DomActionPayload } from "./app-types.js";
import type { EventBus } from "./event-bus.js";

export function parseDataAttributes(element: HTMLElement): Record<string, string> {
  return Object.entries(element.dataset).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value == null) return acc;
      acc[key] = value;
      return acc;
    },
    {}
  );
}

function parseDataAttributesWithoutAction(element: HTMLElement): Record<string, string> {
  const { action: _action, ...rest } = parseDataAttributes(element);
  return rest;
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

  const data = parseDataAttributesWithoutAction(element);
  // console.log(`data:`, data);

  void appEvents.emit("dom:action", {
    action,
    element,
    data,
    originalEvent: event,
  });
}

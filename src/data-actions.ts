import type { AppEventMap, DomActionPayload } from "./app-types.js";
import type { EventBus } from "./event-bus.js";

export function parseDataAttributes(element: HTMLElement): Record<string, string> {
  return Object
    .entries(element.dataset)
    // .map(x => (console.log(x), x)) // print data
    .reduce<Record<string, string>>(
      function (acc, [key, value]) {
        if (key === "action" || value == null) return acc;
        return { ...acc, [key]: value };
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

import { createEventBus } from "./event-bus.js";
import { createRenderer } from "./renderer.js";
import { handleDataAction } from "./data-actions.js";
import {
  addTodo,
  clearCompleted,
  removeTodo,
  setFilter,
  toggleTodo,
} from "./todo-state.js";
import type { AppEventMap, DomActionPayload, AppState, Filter } from "./app-types.js";
import type { EventBus } from "./event-bus.js";

export function hasTodoDom(): boolean {
  return (
    typeof document !== "undefined" &&
    Boolean(document.querySelector("#todo-list")) &&
    Boolean(document.querySelector(".empty"))
  );
}

export function main(rootDocument: Document = document): void {
  const appEvents = createEventBus<AppEventMap>();
  const render = createRenderer(rootDocument);
  let appState: AppState = { todos: [], filter: "all" };

  const updateState = (updater: (state: AppState) => AppState): void => {
    appState = updater(appState);
    render(appState);
  };

  setupStateEventListeners(appEvents, updateState);

  const actionHandlers = createActionHandlers(appEvents);

  appEvents.on("dom:action", (payload: DomActionPayload) => {
    const handler = actionHandlers.get(payload.action);
    if (handler) handler(payload);
  });

  const dataActionHandler = createDataActionHandler(appEvents);

  rootDocument.addEventListener("click", dataActionHandler);
  rootDocument.addEventListener("submit", dataActionHandler);

  render(appState);
}

function setupStateEventListeners(
  appEvents: EventBus<AppEventMap>,
  updateState: (updater: (state: AppState) => AppState) => void
): void {
  appEvents.on("todo:add", ({ title }) =>
    updateState((state) => addTodo(state, title))
  );
  appEvents.on("todo:toggle", ({ id }) =>
    updateState((state) => toggleTodo(state, id))
  );
  appEvents.on("todo:remove", ({ id }) =>
    updateState((state) => removeTodo(state, id))
  );
  appEvents.on("todo:clearCompleted", () =>
    updateState((state) => clearCompleted(state))
  );
  appEvents.on("filter:set", ({ filter }) =>
    updateState((state) => setFilter(state, filter))
  );
}

function createDataActionHandler(appEvents: EventBus<AppEventMap>) {
  return (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionElement = target.closest<HTMLElement>("[data-action]");
    if (!actionElement) return;
    handleDataAction(appEvents, actionElement, event);
  };
}

function createActionHandlers(appEvents: EventBus<AppEventMap>) {
  const actionHandlers = new Map<string, (payload: DomActionPayload) => void>();

  actionHandlers.set("add-todo", ({ element }) => {
    if (!(element instanceof HTMLFormElement)) return;
    const formData = new FormData(element);
    const title = (formData.get("title") || "").toString().trim();
    if (!title) return;
    void appEvents.emit("todo:add", { title });
    element.reset();
  });

  actionHandlers.set("toggle-todo", ({ element }) => {
    const id = element.dataset.todoId;
    if (!id) return;
    void appEvents.emit("todo:toggle", { id });
  });

  actionHandlers.set("remove-todo", ({ element }) => {
    const id = element.dataset.todoId;
    if (!id) return;
    void appEvents.emit("todo:remove", { id });
  });

  actionHandlers.set("set-filter", ({ element }) => {
    const filter = element.dataset.filter as Filter | undefined;
    if (!filter) return;
    void appEvents.emit("filter:set", { filter });
  });

  actionHandlers.set("clear-completed", () => {
    void appEvents.emit("todo:clearCompleted", {});
  });

  return actionHandlers;
}

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

  // app state
  const useAppState = createAppState()
  const { getState, setState } = useAppState()

  appStateEventListeners(
    appEvents,
    getState,
    onChangeAppState
  );

  function onChangeAppState(state: AppState): void {
    setState(state)
    render(state);
  };

  const actionHandlers = createActionHandlers(appEvents);

  appEvents.on("dom:action", (payload: DomActionPayload) => {
    const handler = actionHandlers.get(payload.action);
    if (handler) handler(payload);
  });

  const dataActionHandler = createDataActionHandler(appEvents);

  rootDocument.addEventListener("click", dataActionHandler);
  rootDocument.addEventListener("submit", dataActionHandler);

  render(getState());
}

function createAppState(appState: AppState = { todos: [], filter: "all" }) {
  return function useAppState() {
    return {
      getState: () => appState,
      setState: (nextState: AppState) => appState = nextState
    }
  }
}

function appStateEventListeners(
  appEvents: EventBus<AppEventMap>,
  getState: () => AppState,
  onChange: (state: AppState) => void
): void {
  appEvents.on("todo:add", ({ title }) => {
    const appState = addTodo(getState(), title)
    onChange(appState)
  });
  appEvents.on("todo:toggle", ({ id }) => {
    const appState = toggleTodo(getState(), id)
    onChange(appState)
  });
  appEvents.on("todo:remove", ({ id }) => {
    const appState = removeTodo(getState(), id)
    onChange(appState)
  });
  appEvents.on("todo:clearCompleted", () => {
    const appState = clearCompleted(getState())
    onChange(appState)
  });
  appEvents.on("filter:set", ({ filter }) => {
    const appState = setFilter(getState(), filter)
    onChange(appState)
  });
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

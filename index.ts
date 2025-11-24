type Filter = "all" | "active" | "completed";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

type DomActionPayload = {
  action: string;
  element: HTMLElement;
  data: Record<string, string>;
  originalEvent: Event;
};

type AppEventMap = {
  "dom:action": DomActionPayload;
  "todo:add": { title: string };
  "todo:toggle": { id: string };
  "todo:remove": { id: string };
  "todo:clearCompleted": Record<string, never>;
  "filter:set": { filter: Filter };
};

type BusListener<Payload> = (payload: Payload) => void | Promise<void>;

type AppState = {
  todos: Todo[];
  filter: Filter;
};

main();

function main(): void {
  const appEvents = createEventBus<AppEventMap>();
  const render = createRenderer(document);
  let appState: AppState = { todos: [], filter: "all" };

  const updateState = (updater: (state: AppState) => AppState): void => {
    appState = updater(appState);
    render(appState);
  };

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

  appEvents.on("dom:action", (payload: DomActionPayload) => {
    const handler = actionHandlers.get(payload.action);
    if (handler) handler(payload);
  });

  setupDOMListeners(
    { document },
    (element, event) => void handleDataAction(appEvents, element, event)
  );

  render(appState);
}

function createEventBus<EventMap extends Record<string, unknown>>() {
  const listeners = new Map<keyof EventMap, Map<string, BusListener<any>>>();
  let counter = 0;

  const on = <E extends keyof EventMap>(
    event: E,
    listener: BusListener<EventMap[E]>
  ): string => {
    const bucket =
      listeners.get(event) ?? new Map<string, BusListener<any>>();
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

function parseDataAttributes(element: HTMLElement): Record<string, string> {
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

function handleDataAction(
  appEvents: ReturnType<typeof createEventBus<AppEventMap>>,
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

function createDelegatedHandler(
  handler: (element: HTMLElement, event: Event) => void
): EventListener {
  return (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionable = target.closest<HTMLElement>("[data-action]");
    if (!actionable) return;
    handler(actionable, event);
  };
}

function setupDOMListeners(
  dependencies: { document: Document },
  actionHandler: (element: HTMLElement, event: Event) => void
): () => void {
  const { document } = dependencies;
  const handlers = new Map<string, EventListener>();

  const bind = (type: string, listener: EventListener) => {
    document.addEventListener(type, listener);
    handlers.set(type, listener);
  };

  bind("click", createDelegatedHandler(actionHandler));
  bind("submit", createDelegatedHandler(actionHandler));

  return () => {
    handlers.forEach((listener, type) =>
      document.removeEventListener(type, listener)
    );
    handlers.clear();
  };
}

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTodo(title: string): Todo {
  return {
    id: randomId(),
    title,
    completed: false,
    createdAt: Date.now(),
  };
}

function addTodo(state: AppState, title: string): AppState {
  return {
    ...state,
    todos: [...state.todos, createTodo(title)],
  };
}

function toggleTodo(state: AppState, id: string): AppState {
  return {
    ...state,
    todos: state.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ),
  };
}

function removeTodo(state: AppState, id: string): AppState {
  return {
    ...state,
    todos: state.todos.filter((todo) => todo.id !== id),
  };
}

function clearCompleted(state: AppState): AppState {
  return {
    ...state,
    todos: state.todos.filter((todo) => !todo.completed),
  };
}

function setFilter(state: AppState, filter: Filter): AppState {
  return { ...state, filter };
}

function getVisibleTodos(state: AppState): Todo[] {
  switch (state.filter) {
    case "active":
      return state.todos.filter((todo) => !todo.completed);
    case "completed":
      return state.todos.filter((todo) => todo.completed);
    default:
      return state.todos;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTodoItem(todo: Todo): string {
  const label = todo.completed ? "Undo" : "Done";
  const status = todo.completed ? "is-done" : "";
  const toggleClass = todo.completed ? "action-btn btn-undo" : "action-btn btn-done";
  return `
    <li class="todo ${status}" data-todo-id="${todo.id}">
      <button type="button" class="${toggleClass}" data-action="toggle-todo" data-todo-id="${todo.id}" aria-pressed="${todo.completed}">
        ${label}
      </button>
      <span class="title">${escapeHtml(todo.title)}</span>
      <button type="button" class="action-btn btn-delete" data-action="remove-todo" data-todo-id="${todo.id}">Delete</button>
    </li>
  `;
}

function createRenderer(root: Document) {
  const listEl = root.querySelector<HTMLUListElement>("#todo-list");
  const emptyEl = root.querySelector<HTMLElement>(".empty");
  const filterButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-action="set-filter"]')
  );

  if (!listEl || !emptyEl) {
    throw new Error("Todo list elements not found in DOM.");
  }

  const setFilterState = (filter: Filter) => {
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === filter;
      btn.setAttribute("aria-pressed", String(isActive));
    });
  };

  return (state: AppState) => {
    const visible = getVisibleTodos(state);
    listEl.innerHTML = visible.map(renderTodoItem).join("");
    const hasTodos = Boolean(visible.length);
    emptyEl.style.display = hasTodos ? "none" : "block";
    setFilterState(state.filter);
  };
}

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

type Listener<EventMap> = <E extends keyof EventMap>(
  payload: EventMap[E]
) => void | Promise<void>;

const createEventBus = <EventMap extends Record<string, unknown>>() => {
  const listeners = new Map<keyof EventMap, Map<string, Listener<EventMap>>>();
  let counter = 0;

  const on = <E extends keyof EventMap>(
    event: E,
    listener: Listener<EventMap>
  ): string => {
    const bucket = listeners.get(event) ?? new Map<string, Listener<EventMap>>();
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
      await listener(payload);
    }
  };

  return { on, off, emit };
};

const appEvents = createEventBus<AppEventMap>();

const parseDataAttributes = (element: HTMLElement): Record<string, string> =>
  Array.from(element.attributes).reduce<Record<string, string>>((acc, attr) => {
    if (!attr.name.startsWith("data-") || attr.name === "data-action") {
      return acc;
    }
    const key = attr.name
      .slice(5)
      .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return { ...acc, [key]: attr.value };
  }, {});

const handleDataAction = (element: HTMLElement, event: Event): void => {
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
};

const createDelegatedHandler =
  (handler: (element: HTMLElement, event: Event) => void): EventListener =>
  (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionable = target.closest<HTMLElement>("[data-action]");
    if (!actionable) return;
    handler(actionable, event);
  };

const setupDOMListeners = (dependencies: { document: Document }) => {
  const { document } = dependencies;
  const handlers = new Map<string, EventListener>();

  const bind = (type: string, listener: EventListener) => {
    document.addEventListener(type, listener);
    handlers.set(type, listener);
  };

  bind("click", createDelegatedHandler(handleDataAction));
  bind("submit", createDelegatedHandler(handleDataAction));

  return () => {
    handlers.forEach((listener, type) =>
      document.removeEventListener(type, listener)
    );
    handlers.clear();
  };
};

const randomId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createTodo = (title: string): Todo => ({
  id: randomId(),
  title,
  completed: false,
  createdAt: Date.now(),
});

const addTodo = (state: AppState, title: string): AppState => ({
  ...state,
  todos: [...state.todos, createTodo(title)],
});

const toggleTodo = (state: AppState, id: string): AppState => ({
  ...state,
  todos: state.todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  ),
});

const removeTodo = (state: AppState, id: string): AppState => ({
  ...state,
  todos: state.todos.filter((todo) => todo.id !== id),
});

const clearCompleted = (state: AppState): AppState => ({
  ...state,
  todos: state.todos.filter((todo) => !todo.completed),
});

const setFilter = (state: AppState, filter: Filter): AppState => ({
  ...state,
  filter,
});

const getVisibleTodos = (state: AppState): Todo[] => {
  switch (state.filter) {
    case "active":
      return state.todos.filter((todo) => !todo.completed);
    case "completed":
      return state.todos.filter((todo) => todo.completed);
    default:
      return state.todos;
  }
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderTodoItem = (todo: Todo): string => {
  const label = todo.completed ? "Undo" : "Done";
  const status = todo.completed ? "is-done" : "";
  return `
    <li class="todo ${status}" data-todo-id="${todo.id}">
      <button type="button" class="secondary" data-action="toggle-todo" data-todo-id="${todo.id}" aria-pressed="${todo.completed}">
        ${label}
      </button>
      <span class="title">${escapeHtml(todo.title)}</span>
      <button type="button" data-action="remove-todo" data-todo-id="${todo.id}">Delete</button>
    </li>
  `;
};

type AppState = {
  todos: Todo[];
  filter: Filter;
};

const createRenderer = (root: Document) => {
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
};

const bootstrap = (): void => {
  const root = document;
  const render = createRenderer(root);
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

  const actionHandlers = new Map<
    string,
    (payload: DomActionPayload) => void
  >();

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

  appEvents.on("dom:action", (payload) => {
    const handler = actionHandlers.get(payload.action);
    if (handler) handler(payload);
  });

  setupDOMListeners({ document });
  render(appState);
};

bootstrap();

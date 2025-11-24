const createEventBus = () => {
  const listeners = new Map();
  let counter = 0;

  const on = (event, listener) => {
    const bucket = listeners.get(event) ?? new Map();
    const id = `${event}:${counter++}`;
    bucket.set(id, listener);
    listeners.set(event, bucket);
    return id;
  };

  const off = (event, listenerId) => {
    const bucket = listeners.get(event);
    if (!bucket) return;
    bucket.delete(listenerId);
    if (!bucket.size) listeners.delete(event);
  };

  const emit = async (event, payload) => {
    const bucket = listeners.get(event);
    if (!bucket) return;
    for (const listener of bucket.values()) {
      await listener(payload);
    }
  };

  return { on, off, emit };
};

const appEvents = createEventBus();

const parseDataAttributes = (element) =>
  Array.from(element.attributes).reduce((acc, attr) => {
    if (!attr.name.startsWith("data-") || attr.name === "data-action") {
      return acc;
    }
    const key = attr.name
      .slice(5)
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return { ...acc, [key]: attr.value };
  }, {});

const handleDataAction = (element, event) => {
  const action = element.dataset.action;
  if (!action) return;
  if (event.type === "submit") event.preventDefault();

  const data = parseDataAttributes(element);

  appEvents.emit("dom:action", {
    action,
    element,
    data,
    originalEvent: event,
  });
};

const createDelegatedHandler = (handler) => (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const actionable = target.closest("[data-action]");
  if (!actionable) return;
  handler(actionable, event);
};

const setupDOMListeners = (dependencies) => {
  const { document } = dependencies;
  const handlers = new Map();

  const bind = (type, listener) => {
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

const randomId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createTodo = (title) => ({
  id: randomId(),
  title,
  completed: false,
  createdAt: Date.now(),
});

const addTodo = (state, title) => ({
  ...state,
  todos: [...state.todos, createTodo(title)],
});

const toggleTodo = (state, id) => ({
  ...state,
  todos: state.todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  ),
});

const removeTodo = (state, id) => ({
  ...state,
  todos: state.todos.filter((todo) => todo.id !== id),
});

const clearCompleted = (state) => ({
  ...state,
  todos: state.todos.filter((todo) => !todo.completed),
});

const setFilter = (state, filter) => ({ ...state, filter });

const getVisibleTodos = (state) => {
  switch (state.filter) {
    case "active":
      return state.todos.filter((todo) => !todo.completed);
    case "completed":
      return state.todos.filter((todo) => todo.completed);
    default:
      return state.todos;
  }
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderTodoItem = (todo) => {
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

const createRenderer = (root) => {
  const listEl = root.querySelector("#todo-list");
  const emptyEl = root.querySelector(".empty");
  const filterButtons = Array.from(
    root.querySelectorAll('[data-action="set-filter"]')
  );

  const setFilterState = (filter) => {
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === filter;
      btn.setAttribute("aria-pressed", String(isActive));
    });
  };

  return (state) => {
    const visible = getVisibleTodos(state);
    listEl.innerHTML = visible.map(renderTodoItem).join("");
    const hasTodos = Boolean(visible.length);
    emptyEl.style.display = hasTodos ? "none" : "block";
    setFilterState(state.filter);
  };
};

const bootstrap = () => {
  const root = document;
  const render = createRenderer(root);
  let appState = { todos: [], filter: "all" };

  const updateState = (updater) => {
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

  const actionHandlers = new Map();

  actionHandlers.set("add-todo", ({ element }) => {
    if (!(element instanceof HTMLFormElement)) return;
    const formData = new FormData(element);
    const title = (formData.get("title") || "").toString().trim();
    if (!title) return;
    appEvents.emit("todo:add", { title });
    element.reset();
  });

  actionHandlers.set("toggle-todo", ({ element }) => {
    const id = element.dataset.todoId;
    if (!id) return;
    appEvents.emit("todo:toggle", { id });
  });

  actionHandlers.set("remove-todo", ({ element }) => {
    const id = element.dataset.todoId;
    if (!id) return;
    appEvents.emit("todo:remove", { id });
  });

  actionHandlers.set("set-filter", ({ element }) => {
    const filter = element.dataset.filter;
    if (!filter) return;
    appEvents.emit("filter:set", { filter });
  });

  actionHandlers.set("clear-completed", () => {
    appEvents.emit("todo:clearCompleted", {});
  });

  appEvents.on("dom:action", (payload) => {
    const handler = actionHandlers.get(payload.action);
    if (handler) handler(payload);
  });

  setupDOMListeners({ document });
  render(appState);
};

bootstrap();

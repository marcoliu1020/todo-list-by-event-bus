import type { AppState, Filter, Todo } from "./app-types.js";
export type { AppState, Filter, Todo };

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

export function addTodo(state: AppState, title: string): AppState {
  return {
    ...state,
    todos: [...state.todos, createTodo(title)],
  };
}

export function toggleTodo(state: AppState, id: string): AppState {
  return {
    ...state,
    todos: state.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ),
  };
}

export function removeTodo(state: AppState, id: string): AppState {
  return {
    ...state,
    todos: state.todos.filter((todo) => todo.id !== id),
  };
}

export function clearCompleted(state: AppState): AppState {
  return {
    ...state,
    todos: state.todos.filter((todo) => !todo.completed),
  };
}

export function setFilter(state: AppState, filter: Filter): AppState {
  return { ...state, filter };
}

export function getVisibleTodos(state: AppState): Todo[] {
  switch (state.filter) {
    case "active":
      return state.todos.filter((todo) => !todo.completed);
    case "completed":
      return state.todos.filter((todo) => todo.completed);
    default:
      return state.todos;
  }
}

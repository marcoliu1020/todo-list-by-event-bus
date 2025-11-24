import { getVisibleTodos } from "./todo-state.js";
import type { AppState, Filter, Todo } from "./app-types.js";

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

export function createRenderer(root: Document) {
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

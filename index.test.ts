import { describe, expect, test } from "vitest";
import {
  addTodo,
  clearCompleted,
  getVisibleTodos,
  parseDataAttributes,
  parseDataAttributesWithoutAction,
  removeTodo,
  setFilter,
  toggleTodo,
  type AppState,
} from "./index";

describe("todo state", () => {
  const baseState: AppState = { todos: [], filter: "all" };

  test("adds a todo with defaults", () => {
    const updated = addTodo(baseState, "Write tests");

    expect(updated.todos).toHaveLength(1);
    expect(updated.todos[0]).toMatchObject({
      title: "Write tests",
      completed: false,
    });
    expect(updated.todos[0].id).toBeTruthy();
    expect(baseState.todos).toHaveLength(0);
  });

  test("toggles a todo by id", () => {
    const withTodo = addTodo(baseState, "Ship feature");
    const id = withTodo.todos[0]?.id as string;

    const toggled = toggleTodo(withTodo, id);
    expect(toggled.todos[0]?.completed).toBe(true);

    const toggledBack = toggleTodo(toggled, id);
    expect(toggledBack.todos[0]?.completed).toBe(false);
  });

  test("removes a todo by id", () => {
    const withTodos = ["First", "Second"].reduce(
      (state, title) => addTodo(state, title),
      baseState
    );
    const removeId = withTodos.todos[0]?.id as string;

    const remaining = removeTodo(withTodos, removeId);
    expect(remaining.todos.map((t) => t.title)).toEqual(["Second"]);
    expect(withTodos.todos).toHaveLength(2);
  });

  test("clears completed todos", () => {
    const todoState = addTodo(baseState, "Cleanup");
    const completedState = toggleTodo(todoState, todoState.todos[0]!.id);

    const cleared = clearCompleted(completedState);
    expect(cleared.todos).toHaveLength(0);
  });

  test("filters visible todos", () => {
    const prepared = ["Active task", "Done task"].reduce(
      (state, title, index) => {
        const next = addTodo(state, title);
        return index === 1 ? toggleTodo(next, next.todos[1]!.id) : next;
      },
      baseState
    );

    expect(getVisibleTodos({ ...prepared, filter: "all" })).toHaveLength(2);
    expect(getVisibleTodos({ ...prepared, filter: "active" })).toEqual([
      expect.objectContaining({ title: "Active task", completed: false }),
    ]);
    expect(getVisibleTodos({ ...prepared, filter: "completed" })).toEqual([
      expect.objectContaining({ title: "Done task", completed: true }),
    ]);
  });

  test("sets the filter", () => {
    const updated = setFilter(baseState, "completed");
    expect(updated.filter).toBe("completed");
    expect(baseState.filter).toBe("all");
  });
});

describe("parseDataAttributes", () => {
  test("converts HTML 'data-' attributes to camelCase keys and includes data-action", () => {
    const button = document.createElement("button");
    button.setAttribute("data-action", "toggle-todo");
    button.setAttribute("data-todo-id", "123");
    button.setAttribute("data-created-at", "today");

    expect(parseDataAttributes(button)).toEqual({
      action: "toggle-todo",
      todoId: "123",
      createdAt: "today",
    });
  });

  test("converts HTML 'data-' attributes to camelCase keys and ignores data-action (withoutAction)", () => {
    const button = document.createElement("button");
    button.setAttribute("data-action", "toggle-todo");
    button.setAttribute("data-todo-id", "123");
    button.setAttribute("data-created-at", "today");

    expect(parseDataAttributesWithoutAction(button)).toEqual({
      todoId: "123",
      createdAt: "today",
    });
  });
});

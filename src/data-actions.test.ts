import { describe, expect, test } from "vitest";
import { parseDataAttributes, parseDataAttributesWithoutAction } from "./data-actions";

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
});

describe("parseDataAttributesWithoutAction", () => {
  test("converts HTML 'data-' attributes to camelCase keys and ignores data-action", () => {
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

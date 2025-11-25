export {
  addTodo,
  clearCompleted,
  getVisibleTodos,
  removeTodo,
  setFilter,
  toggleTodo,
} from "./src/todo-state.js";
export { parseDataAttributes, parseDataAttributesWithoutAction } from "./src/data-actions.js";
export type { AppState, Filter, Todo } from "./src/app-types.js";

import { hasTodoDom, main } from "./src/todo-app.js";

if (hasTodoDom()) {
  main();
}

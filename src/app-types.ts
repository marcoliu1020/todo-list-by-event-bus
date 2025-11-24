export type Filter = "all" | "active" | "completed";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

export type DomActionPayload = {
  action: string;
  element: HTMLElement;
  data: Record<string, string>;
  originalEvent: Event;
};

export type AppEventMap = {
  "dom:action": DomActionPayload;
  "todo:add": { title: string };
  "todo:toggle": { id: string };
  "todo:remove": { id: string };
  "todo:clearCompleted": Record<string, never>;
  "filter:set": { filter: Filter };
};

export type BusListener<Payload> = (payload: Payload) => void | Promise<void>;

export type AppState = {
  todos: Todo[];
  filter: Filter;
};

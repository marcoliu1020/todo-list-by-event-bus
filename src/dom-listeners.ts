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

export function setupDOMListeners(
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

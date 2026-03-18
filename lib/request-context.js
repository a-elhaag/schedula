import { AsyncLocalStorage } from "async_hooks";

const requestContextStorage = new AsyncLocalStorage();

export function getRequestContext() {
  return requestContextStorage.getStore() || {};
}

export function setRequestContext(context) {
  return requestContextStorage.run(context, () => {
    // Return a function that allows async operations within this context
    return Promise.resolve();
  });
}

export function withRequestContext(context, fn) {
  return requestContextStorage.run(context, fn);
}

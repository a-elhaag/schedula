/**
 * middleware.js
 * Next.js edge middleware entry point.
 * Delegates all logic to proxy.js so it stays decoupled and testable.
 */
export { proxy as middleware, config } from "./proxy.js";

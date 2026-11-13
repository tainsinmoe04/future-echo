/**
 * Shared environment for React component tests under node:test.
 *
 * - Installs a jsdom window/document before @testing-library/react loads.
 * - Resolves the "@/..." path aliases that tsc keeps verbatim in emitted JS.
 * - mockModule() swaps heavy modules (next/font, next/navigation, app state)
 *   for this test process only; node --test runs each file in its own process.
 *
 * Import this before @testing-library/react and any code under test;
 * environment polyfills (e.g. fake-indexeddb) may load earlier.
 */
import { JSDOM } from "jsdom";
import Module from "node:module";
import path from "node:path";

const compiledRoot = path.resolve(__dirname, "..", "..");
const compiledSrc = path.join(compiledRoot, "src");

type ResolveFilename = (request: string, parent?: unknown, isMain?: boolean, options?: unknown) => string;
const originalResolve = (Module as unknown as { _resolveFilename: ResolveFilename })._resolveFilename;

// tsc emits "@/..." imports unchanged; map them onto the compiled output.
(Module as unknown as { _resolveFilename: ResolveFilename })._resolveFilename = function (request: string, ...rest: unknown[]) {
  const mapped = request.startsWith("@/") ? path.join(compiledSrc, request.slice(2)) : request;
  return originalResolve.call(Module, mapped, ...rest);
} as ResolveFilename;

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });

const provided: Record<string, unknown> = {
  window: dom.window,
  document: dom.window.document,
  location: dom.window.location,
  history: dom.window.history,
  localStorage: dom.window.localStorage,
  sessionStorage: dom.window.sessionStorage,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
};
for (const name of [
  "HTMLElement", "HTMLDialogElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLButtonElement",
  "HTMLIFrameElement", "HTMLAnchorElement", "HTMLCanvasElement", "Element", "Node", "Event",
  "CustomEvent", "MouseEvent", "KeyboardEvent", "StorageEvent", "SVGElement", "DocumentFragment",
  "MutationObserver", "FileReader", "Blob",
]) provided[name] = (dom.window as unknown as Record<string, unknown>)[name];

for (const [name, value] of Object.entries(provided)) {
  if (value === undefined) continue;
  try {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  } catch {
    // A host-defined global (e.g. navigator) that cannot be replaced stays as is.
  }
}
// jsdom reflects the open attribute but has no modal top layer.
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = function () {
    if (this.open) throw new DOMException("InvalidStateError", "The dialog is already open.");
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** Replace a module's exports for this test process. Call before requiring the code under test. */
export function mockModule(request: string, exports: unknown): void {
  const filename = (Module as unknown as { _resolveFilename: ResolveFilename })._resolveFilename(request, module);
  (require.cache as Record<string, unknown>)[filename] = {
    id: filename, filename, loaded: true, exports, children: [], paths: [],
  };
}

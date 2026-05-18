import "@testing-library/jest-dom/vitest";
import { Crypto } from "@peculiar/webcrypto";
import "fake-indexeddb/auto";

// Polyfill Blob.prototype.text() for jsdom (used by integration tests).
if (typeof Blob !== "undefined" && !Blob.prototype.text) {
  Blob.prototype.text = function text(this: Blob): Promise<string> {
    return new Response(this).text();
  };
}

// jsdom lacks crypto.subtle; replace with a pure-JS WebCrypto that
// lives in the same realm as the DOM so TypedArray instanceof checks pass.
const webcrypto = new Crypto();
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// Polyfill localStorage for Node test environment
const store: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "navigator", {
  value: {
    connection: null,
    language: "en-US",
    languages: ["en-US", "en"],
    userAgent: "node",
    onLine: true,
    clipboard: undefined,
  },
  writable: true,
  configurable: true,
});

// Polyfill window so code that checks `typeof window !== "undefined"` works in Node
Object.defineProperty(globalThis, "window", {
  value: globalThis,
  writable: true,
  configurable: true,
});

if (typeof document === "undefined") {
  Object.defineProperty(globalThis, "document", {
    value: {
      createElement: (tag: string) => ({
        tagName: tag.toUpperCase(),
        setAttribute: () => {},
        appendChild: () => {},
        style: {},
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
      head: {
        appendChild: () => {},
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    },
    writable: true,
    configurable: true,
  });
}

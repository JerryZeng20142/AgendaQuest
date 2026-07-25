import "@testing-library/jest-dom/vitest"

const storageData = new Map<string, string>()
const storage: Storage = {
  get length() {
    return storageData.size
  },
  clear: () => storageData.clear(),
  getItem: (key) => storageData.get(key) ?? null,
  key: (index) => [...storageData.keys()][index] ?? null,
  removeItem: (key) => storageData.delete(key),
  setItem: (key, value) => storageData.set(key, String(value)),
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
})
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: storage,
})

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(Element.prototype, "scrollIntoView", {
  writable: true,
  value: () => undefined,
})

Object.defineProperties(Element.prototype, {
  hasPointerCapture: {
    configurable: true,
    value: () => false,
  },
  setPointerCapture: {
    configurable: true,
    value: () => undefined,
  },
  releasePointerCapture: {
    configurable: true,
    value: () => undefined,
  },
})

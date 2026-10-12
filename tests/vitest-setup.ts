// vitest-setup.ts
if (typeof window !== 'undefined') {
  const store = new Map<string, string>()
  const mockStorage: Storage = {
    length: 0,
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  })
}

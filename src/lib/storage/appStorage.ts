type StorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const memory = new Map<string, string>();

const memoryAdapter: StorageAdapter = {
  getItem: async (key) => memory.get(key) ?? null,
  setItem: async (key, value) => {
    memory.set(key, value);
  },
  removeItem: async (key) => {
    memory.delete(key);
  },
};

let adapter: StorageAdapter | null = null;

function resolveAdapter(): StorageAdapter {
  if (adapter) return adapter;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default as StorageAdapter;
    if (AsyncStorage?.getItem) {
      adapter = AsyncStorage;
      return adapter;
    }
  } catch {
    /* módulo nativo ainda não linkado — use memória até rebuild */
  }

  adapter = memoryAdapter;
  return adapter;
}

export async function appStorageGetItem(key: string): Promise<string | null> {
  return resolveAdapter().getItem(key);
}

export async function appStorageSetItem(key: string, value: string): Promise<void> {
  await resolveAdapter().setItem(key, value);
}

export async function appStorageRemoveItem(key: string): Promise<void> {
  await resolveAdapter().removeItem(key);
}

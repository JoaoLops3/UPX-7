type StorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function resolveAdapter(): StorageAdapter | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

export async function appStorageGetItem(key: string): Promise<string | null> {
  try {
    return resolveAdapter()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function appStorageSetItem(key: string, value: string): Promise<void> {
  try {
    resolveAdapter()?.setItem(key, value);
  } catch {
    /* quota / modo privado */
  }
}

export async function appStorageRemoveItem(key: string): Promise<void> {
  try {
    resolveAdapter()?.removeItem(key);
  } catch {
    /* ignora */
  }
}

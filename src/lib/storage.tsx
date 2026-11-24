import { createMMKV, type MMKV } from 'react-native-mmkv';

const fallbackStore = new Map<string, string>();
let mmkvInstance: MMKV | null | undefined;

function getStorage(): MMKV | null {
  if (mmkvInstance !== undefined) {
    return mmkvInstance;
  }
  try {
    mmkvInstance = createMMKV();
  } catch {
    mmkvInstance = null;
  }
  return mmkvInstance;
}

export function getItem<T>(key: string): T | null {
  try {
    const store = getStorage();
    const value = store ? store.getString(key) : fallbackStore.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T) {
  try {
    const raw = JSON.stringify(value);
    const store = getStorage();
    if (store) {
      store.set(key, raw);
    } else {
      fallbackStore.set(key, raw);
    }
  } catch {
    // Ignore storage write errors gracefully
  }
}

export async function removeItem(key: string) {
  try {
    const store = getStorage();
    if (store) {
      store.remove(key);
    } else {
      fallbackStore.delete(key);
    }
  } catch {
    // Ignore storage delete errors gracefully
  }
}

// Where settings live. The web build keeps them in localStorage; later builds can add other drivers behind the
// same interface.
export interface SettingsStore {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
}

// Shared with the prototype, so settings saved there carry over.
const PREFIX = 'gg2:';

// Values are stored as JSON under `gg2:<key>`. Storage can be missing, blocked or full (private windows, cookies
// disabled, quota exceeded): reads then return the fallback and writes are dropped, so the page always works.
// The storage is looked up on every call, inside the try, because merely touching localStorage can throw.
export function localStore(storage: () => Storage = () => localStorage): SettingsStore {
  return {
    get<T>(key: string, fallback: T): T {
      try {
        const v = storage().getItem(PREFIX + key);
        return v == null ? fallback : (JSON.parse(v) as T);
      } catch {
        return fallback;
      }
    },
    set(key: string, value: unknown): void {
      try {
        storage().setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        // storage unavailable
      }
    },
  };
}

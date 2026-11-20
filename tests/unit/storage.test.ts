import { describe, expect, it } from 'vitest';
import { localStore } from '../../src/platform/storage';

// An in-memory stand-in for localStorage.
function memory(): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

describe('localStore', () => {
  it('returns the fallback for a key never set', () => {
    const store = localStore(memory);
    expect(store.get('cell', 10)).toBe(10);
  });

  it('stores values as JSON under the gg2: prefix', () => {
    const backing = memory();
    const store = localStore(() => backing);
    store.set('tw:koi', { speed: 2, cursor: false });
    expect(backing.data.get('gg2:tw:koi')).toBe('{"speed":2,"cursor":false}');
    expect(store.get('tw:koi', {})).toEqual({ speed: 2, cursor: false });
  });

  it('keeps falsy values rather than falling back', () => {
    const backing = memory();
    const store = localStore(() => backing);
    store.set('grid', false);
    store.set('cell', 0);
    store.set('name', '');
    expect([store.get('grid', true), store.get('cell', 10), store.get('name', 'x')]).toEqual([false, 0, '']);
  });

  // As in the prototype, only a missing key gives the fallback; the animal-of-the-day code stores null on purpose.
  it('returns a stored null as null', () => {
    const backing = memory();
    backing.setItem('gg2:manual', 'null');
    expect(localStore(() => backing).get('manual', 'fallback')).toBe(null);
  });

  it('returns the fallback when the stored text is not JSON', () => {
    const backing = memory();
    backing.setItem('gg2:cell', '{oops');
    expect(localStore(() => backing).get('cell', 10)).toBe(10);
  });

  it('works when storage is unavailable', () => {
    const store = localStore(() => {
      throw new Error('SecurityError: the operation is insecure');
    });
    expect(store.get('cell', 10)).toBe(10);
    expect(() => store.set('cell', 12)).not.toThrow();
  });

  it('drops writes when storage is full', () => {
    const backing = memory();
    backing.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const store = localStore(() => backing);
    expect(() => store.set('cell', 12)).not.toThrow();
    expect(store.get('cell', 10)).toBe(10);
  });
});

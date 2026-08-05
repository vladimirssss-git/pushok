import { describe, it, expect } from 'vitest';
import { migrate, defaultSave, SAVE_VERSION, loadSave, writeSave, type SaveData } from '@/systems/save';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  } as Storage;
}

describe('save', () => {
  it('мусор превращается в дефолтный сейв, а не в исключение', () => {
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate('строка')).toEqual(defaultSave());
    expect(migrate({})).toEqual(defaultSave());
  });

  it('миграция сохраняет известные поля и проставляет текущую версию', () => {
    const old = { saveVersion: 0, level: 3, fish: 17, lives: 2, bestTimeMs: 42000 };
    const result = migrate(old);
    expect(result.saveVersion).toBe(SAVE_VERSION);
    expect(result.level).toBe(3);
    expect(result.fish).toBe(17);
    expect(result.bestTimeMs).toBe(42000);
  });

  it('запись и чтение переживают круг', () => {
    const storage = memoryStorage();
    const data: SaveData = { ...defaultSave(), fish: 9, level: 2 };
    writeSave(data, storage);
    expect(loadSave(storage)).toEqual(data);
  });
});

/**
 * Сохранение прогресса в localStorage.
 * Схема версионирована: меняешь структуру — добавляй миграцию,
 * иначе у всех, кто уже играл, прогресс исчезнет без ошибки в консоли.
 */
export const SAVE_VERSION = 1;
const STORAGE_KEY = 'pushok:save';

export interface SaveData {
  saveVersion: number;
  level: number;
  fish: number;
  lives: number;
  bestTimeMs: number | null;
}

export function defaultSave(): SaveData {
  return { saveVersion: SAVE_VERSION, level: 1, fish: 0, lives: 3, bestTimeMs: null };
}

/** Приводит любой прочитанный сейв к текущей версии. Чистая функция — тестируется. */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) return defaultSave();
  const data = raw as Partial<SaveData>;
  if (typeof data.saveVersion !== 'number') return defaultSave();

  const migrated: SaveData = {
    saveVersion: SAVE_VERSION,
    level: typeof data.level === 'number' ? data.level : 1,
    fish: typeof data.fish === 'number' ? data.fish : 0,
    lives: typeof data.lives === 'number' ? data.lives : 3,
    bestTimeMs: typeof data.bestTimeMs === 'number' ? data.bestTimeMs : null,
  };
  return migrated;
}

export function loadSave(storage: Storage = localStorage): SaveData {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Не удалось сохранить прогресс', err);
  }
}

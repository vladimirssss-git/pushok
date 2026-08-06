import type { LevelData } from './level';

/**
 * Уровни, собранные вручную в редакторе (`?editor` → `EditorScene`, кнопка
 * «Скачать» — скачивает готовый файл в этом же формате, им и заменить этот
 * файл). Если для номера уровня здесь есть запись — `GameScene` берёт её
 * вместо процедурной генерации (`systems/levelGenerator.ts`). Нет записи —
 * уровень как раньше строится процедурно. Пусто по умолчанию.
 */
export const CUSTOM_LEVELS: Partial<Record<number, LevelData>> = {};

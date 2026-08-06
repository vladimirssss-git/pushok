import { GAME } from './game';

/**
 * Уступ уровня. Координаты — верхняя грань платформы (topY) и левый край (leftX) в пикселях.
 * Расстановка теперь процедурная (`systems/levelGenerator.ts`), эти числа — только форма данных.
 */
export interface Ledge {
  leftX: number;
  topY: number;
  tiles: number;
}

const T = GAME.tileSize;

/** Верхняя грань пола. */
export const FLOOR_TOP_Y = GAME.height - T;

export const PLAYER_START = { x: 64, y: FLOOR_TOP_Y } as const;

/** Ширина уступа в тайлах — единственный источник для генератора уровней. */
export const LEDGE_TILES = 2;

/**
 * Чистый горизонтальный зазор между уступами не может быть меньше этого —
 * иначе платформы визуально слипаются в одну (зазор меньше ширины тайла
 * читается как единый блок), а прыжок между ними становится тривиальным.
 */
export const LEVEL_MIN_GAP = 32;

/** Уступы не поднимаются выше этой границы экрана. */
export const LEVEL_TOP_MARGIN = 40;

/** Нижняя грань уступа не опускается ближе этого расстояния к полу — иначе визуально сливается с ним. */
export const LEVEL_MIN_ABOVE_FLOOR = 8;

/** Число уступов на уровне 1; на каждом следующем уровне растёт на LEVEL_LEDGE_COUNT_PER_LEVEL. */
export const LEVEL_LEDGE_COUNT_BASE = 4;
export const LEVEL_LEDGE_COUNT_PER_LEVEL = 1;

/** Игра заканчивается победой после прохождения этого уровня. */
export const MAX_LEVEL = 5;

/** Собака патрулирует эту часть пола, пока не увидит Пушка. */
export const DOG_PATROL = { minX: GAME.width * 0.4, maxX: GAME.width - 60, y: FLOOR_TOP_Y } as const;

import { GAME } from './game';

/**
 * Уровень 1. Координаты — верхняя грань платформы (topY) и левый край (leftX) в пикселях.
 * Значения выведены из геометрии прыжка (см. `src/systems/jumpGeometry.ts`)
 * и проверяются тестом `test/jumpGeometry.test.ts`.
 *
 * Временная расстановка до перевода уровней в Tiled.
 */
export interface Ledge {
  leftX: number;
  topY: number;
  tiles: number;
}

const T = GAME.tileSize;

/** Верхняя грань пола. */
export const FLOOR_TOP_Y = GAME.height - T;

/** Подъём между соседними уступами — 55 px при высоте прыжка ~79 px. */
const STEP = 55;

export const LEVEL_1_LEDGES: readonly Ledge[] = [
  { leftX: 160, topY: FLOOR_TOP_Y - STEP, tiles: 2 },
  { leftX: 272, topY: FLOOR_TOP_Y - STEP * 2, tiles: 2 },
  { leftX: 384, topY: FLOOR_TOP_Y - STEP * 3, tiles: 2 },
  { leftX: 512, topY: FLOOR_TOP_Y - STEP * 4, tiles: 2 },
] as const;

/** Рыбки висят над серединой уступа на высоте подбора. */
export const LEVEL_1_FISH: ReadonlyArray<{ x: number; y: number }> = [
  { x: 96, y: FLOOR_TOP_Y - 24 },
  ...LEVEL_1_LEDGES.map((l) => ({
    x: l.leftX + (l.tiles * T) / 2,
    y: l.topY - 22,
  })),
];

export const PLAYER_START = { x: 64, y: FLOOR_TOP_Y } as const;

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

/**
 * Подъём между соседними уступами.
 *
 * Было 55px — проходило по независимым пределам высоты/дальности, но не
 * проходило по факту: Arcade Physics умеет «поймать угол» площадки почти
 * без разбега (тело чуть задевает передний торец сверху и приземляется
 * прямо у левого края) — в этом случае реальная дистанция до следующего
 * уступа равна почти всему шагу leftX→leftX, а не «чистому» зазору между
 * площадками. При stepUp=55 окно допустимых дистанций [28.7, 98.9]px было
 * недостаточно широким, чтобы вместить и разбег с дальнего края, и прыжок
 * от самого угла. Уменьшили до 45px — окно расширяется до [22.0, 105.6]px.
 * См. `test/jumpGeometry.test.ts` и devlog 2026-08-05.
 */
const STEP = 45;

/** Ширина уступа в тайлах. */
const LEDGE_TILES = 2;

/**
 * Чистый горизонтальный зазор между уступами (край предыдущего — край следующего),
 * при прыжке с разбега от дальнего края площадки.
 */
const GAP = 32;

const LEDGE_STEP_X = LEDGE_TILES * T + GAP;

/** Первый уступ — leftX подобран так, чтобы прыжок от PLAYER_START был не впритык. */
const LEDGE_1_LEFT_X = 130;

export const LEVEL_1_LEDGES: readonly Ledge[] = [
  { leftX: LEDGE_1_LEFT_X, topY: FLOOR_TOP_Y - STEP, tiles: LEDGE_TILES },
  { leftX: LEDGE_1_LEFT_X + LEDGE_STEP_X, topY: FLOOR_TOP_Y - STEP * 2, tiles: LEDGE_TILES },
  { leftX: LEDGE_1_LEFT_X + LEDGE_STEP_X * 2, topY: FLOOR_TOP_Y - STEP * 3, tiles: LEDGE_TILES },
  { leftX: LEDGE_1_LEFT_X + LEDGE_STEP_X * 3, topY: FLOOR_TOP_Y - STEP * 4, tiles: LEDGE_TILES },
] as const;

/**
 * Худший случай дистанции прыжка с уступа на уступ: игрок поймал угол
 * площадки почти без запаса и прыгает дальше от её левого края, без разбега.
 * Не вычитаем PLAYER.width — Arcade Physics при разрешении коллизии по углу
 * может приземлить игрока даже тогда, когда центр тела ещё левее leftX
 * (проверено эмпирически, см. devlog 2026-08-05).
 */
export function worstCaseGap(): number {
  return LEDGE_STEP_X;
}

/** Рыбки висят над серединой уступа на высоте подбора. */
export const LEVEL_1_FISH: ReadonlyArray<{ x: number; y: number }> = [
  { x: 96, y: FLOOR_TOP_Y - 24 },
  ...LEVEL_1_LEDGES.map((l) => ({
    x: l.leftX + (l.tiles * T) / 2,
    y: l.topY - 22,
  })),
];

export const PLAYER_START = { x: 64, y: FLOOR_TOP_Y } as const;

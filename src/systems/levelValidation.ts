import { GAME, LEDGE_TILES, LEVEL_MIN_GAP } from '@/config';
import type { Ledge } from '@/config/level';
import { isReachableAtGap } from './jumpGeometry';

const T = GAME.tileSize;
const LEDGE_WIDTH_PX = LEDGE_TILES * T;

export interface LevelValidationResult {
  /** Индексы уступов (в исходном порядке ledges[]), недостижимых от предыдущего по X. */
  unreachable: number[];
  /** Пары индексов уступов, которые пересекаются или стоят слишком близко. */
  tooClose: Array<[number, number]>;
  /** Индексы уступов, вышедших за границы экрана. */
  outOfBounds: number[];
  ok: boolean;
}

/**
 * Пересекаются ли (или стоят слишком близко) два уступа. Единый источник
 * этой проверки для процедурного генератора (`levelGenerator.ts`) и
 * редактора уровней (`EditorScene.ts`) — раньше было продублировано.
 */
export function ledgesTooClose(a: Ledge, b: Ledge, minGap: number = LEVEL_MIN_GAP): boolean {
  const aRight = a.leftX + a.tiles * T;
  const bRight = b.leftX + b.tiles * T;
  const xTooClose = a.leftX < bRight + minGap && aRight + minGap > b.leftX;
  const yOverlap = a.topY < b.topY + T && a.topY + T > b.topY;
  return xTooClose && yOverlap;
}

/**
 * Проверяет уровень целиком: допрыгиваемость по ПОРЯДКУ В МАССИВЕ (не по X!
 * — цепочка, что строит генератор, зигзагует влево-вправо, X не монотонен;
 * порядок в массиве — это порядок прохождения, для генератора это порядок
 * построения, для редактора — порядок добавления уступов дизайнером),
 * прыжок с разбега и без (`isReachableAtGap` из `jumpGeometry.ts`),
 * отсутствие пересечений между ЛЮБЫМИ уступами (не только соседними по
 * порядку) и выход за границы экрана. Не зависит от Phaser — используется и
 * «Проверить уровень» в редакторе, и юнит-тестами.
 */
export function validateLevel(
  ledges: readonly Ledge[],
  playerStart: { x: number; y: number },
  floorTopY: number,
): LevelValidationResult {
  const unreachable: number[] = [];
  const tooClose: Array<[number, number]> = [];
  const outOfBounds: number[] = [];

  let prevLeftX = playerStart.x;
  let prevRightX = playerStart.x;
  let prevTopY = floorTopY;

  for (let index = 0; index < ledges.length; index += 1) {
    const ledge = ledges[index]!;
    const width = ledge.tiles * T;
    if (ledge.leftX < 0 || ledge.leftX + width > GAME.width || ledge.topY <= 0 || ledge.topY >= floorTopY) {
      outOfBounds.push(index);
    }

    // Зигзаг мог пойти в любую сторону — гэп считаем от фактического
    // направления к предыдущему уступу, а не всегда «слева направо».
    const movingRight = ledge.leftX >= prevRightX;
    const bestGap = movingRight
      ? Math.max(0, ledge.leftX - prevRightX)
      : Math.max(0, prevLeftX - (ledge.leftX + width));
    const worstGap = movingRight
      ? Math.max(0, ledge.leftX - prevLeftX)
      : Math.max(0, prevRightX - (ledge.leftX + width));

    const stepUp = prevTopY - ledge.topY;
    if (!isReachableAtGap(stepUp, bestGap) || !isReachableAtGap(stepUp, worstGap)) {
      unreachable.push(index);
    }

    prevLeftX = ledge.leftX;
    prevRightX = ledge.leftX + width;
    prevTopY = ledge.topY;
  }

  for (let i = 0; i < ledges.length; i += 1) {
    for (let j = i + 1; j < ledges.length; j += 1) {
      if (ledgesTooClose(ledges[i]!, ledges[j]!)) tooClose.push([i, j]);
    }
  }

  return {
    unreachable,
    tooClose,
    outOfBounds,
    ok: unreachable.length === 0 && tooClose.length === 0 && outOfBounds.length === 0,
  };
}

/** Округляет координаты до ближайшего узла сетки тайлов. */
export function snapToGrid(x: number, y: number, tileSize: number = T): { x: number; y: number } {
  return {
    x: Math.round(x / tileSize) * tileSize,
    y: Math.round(y / tileSize) * tileSize,
  };
}

export { LEDGE_WIDTH_PX };

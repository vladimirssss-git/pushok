import { GAME, LEDGE_TILES, LEVEL_MIN_GAP, PLAYER } from '@/config';
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
  /** Индексы уступов, под которыми герою не хватает роста пройти. */
  noHeadroom: number[];
  ok: boolean;
}

/**
 * Хватает ли роста героя пройти под уступом: ближайшая поверхность НИЖЕ
 * (пол или другой уступ, пересекающийся с ним по X) должна отстоять от
 * нижней грани уступа минимум на `PLAYER.height` — иначе герой, идущий
 * понизу, застрянет головой в уступе вместо того, чтобы пройти под ним.
 */
export function hasHeadroomBelow(
  ledge: Ledge,
  others: readonly Ledge[],
  floorTopY: number,
  minClearance: number = PLAYER.height,
): boolean {
  const left = ledge.leftX;
  const right = ledge.leftX + ledge.tiles * T;
  const bottom = ledge.topY + T;

  let closestBelowTopY = floorTopY;
  for (const other of others) {
    if (other === ledge) continue;
    const oLeft = other.leftX;
    const oRight = other.leftX + other.tiles * T;
    const overlapsX = left < oRight && right > oLeft;
    if (overlapsX && other.topY > ledge.topY && other.topY < closestBelowTopY) {
      closestBelowTopY = other.topY;
    }
  }

  return closestBelowTopY - bottom >= minClearance;
}

/**
 * Достижим ли уступ-кандидат от конкретной точки отправления (другого
 * уступа или старта героя, `tiles` не задан — точка без ширины). Та же
 * физика, что и в `validateLevel`, но для одной пары, а не всей цепочки —
 * используется для живой подсветки во время перетаскивания в редакторе.
 */
export function isLedgeReachableFrom(
  candidate: Ledge,
  from: { leftX: number; topY: number; tiles?: number },
): boolean {
  const fromWidth = (from.tiles ?? 0) * T;
  const fromRightX = from.leftX + fromWidth;
  const candidateWidth = candidate.tiles * T;

  const movingRight = candidate.leftX >= fromRightX;
  const bestGap = movingRight
    ? Math.max(0, candidate.leftX - fromRightX)
    : Math.max(0, from.leftX - (candidate.leftX + candidateWidth));
  const worstGap = movingRight
    ? Math.max(0, candidate.leftX - from.leftX)
    : Math.max(0, fromRightX - (candidate.leftX + candidateWidth));

  const stepUp = from.topY - candidate.topY;
  return isReachableAtGap(stepUp, bestGap) && isReachableAtGap(stepUp, worstGap);
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
 * порядку), выход за границы экрана и запас по высоте под каждым уступом
 * (`hasHeadroomBelow` — герой должен пройти понизу, не застряв головой).
 * Не зависит от Phaser — используется и «Проверить уровень» в редакторе, и
 * юнит-тестами.
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

  const noHeadroom: number[] = [];
  for (let index = 0; index < ledges.length; index += 1) {
    if (!hasHeadroomBelow(ledges[index]!, ledges, floorTopY)) noHeadroom.push(index);
  }

  return {
    unreachable,
    tooClose,
    outOfBounds,
    noHeadroom,
    ok: unreachable.length === 0 && tooClose.length === 0 && outOfBounds.length === 0 && noHeadroom.length === 0,
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

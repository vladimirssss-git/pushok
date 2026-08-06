import { isReachableAtGap } from './jumpGeometry';

/** Разворот патрулирующего врага у границ маршрута. Чистая функция — тестируется без Phaser. */
export function reverseAtBounds(x: number, minX: number, maxX: number, direction: -1 | 1): -1 | 1 {
  if (x <= minX) return 1;
  if (x >= maxX) return -1;
  return direction;
}

/**
 * Видит ли враг цель во время погони: прямоугольная зона по X и Y вокруг
 * врага — без ограничения «только пол», иначе собака не смогла бы
 * преследовать Пушка по уступам.
 */
export function canSeeTargetAnywhere(
  enemyX: number,
  enemyY: number,
  targetX: number,
  targetY: number,
  rangeX: number,
  rangeY: number,
): boolean {
  return Math.abs(targetX - enemyX) <= rangeX && Math.abs(targetY - enemyY) <= rangeY;
}

/** Направление погони — прямо на цель по X. */
export function chaseDirection(enemyX: number, targetX: number): -1 | 1 {
  return targetX < enemyX ? -1 : 1;
}

/**
 * Нужно ли врагу прыгнуть, чтобы допрыгнуть до цели: та же физика, что и у
 * игрока (см. `jumpGeometry.ts`) — цель выше и в пределах дальности прыжка.
 * Цель ниже или на одном уровне — прыжок не нужен, враг просто идёт/падает.
 */
export function shouldJumpToTarget(enemyX: number, enemyY: number, targetX: number, targetY: number): boolean {
  const stepUp = enemyY - targetY;
  if (stepUp <= 0) return false;
  const gap = Math.abs(targetX - enemyX);
  return isReachableAtGap(stepUp, gap);
}

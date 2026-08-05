/** Разворот патрулирующего врага у границ маршрута. Чистая функция — тестируется без Phaser. */
export function reverseAtBounds(x: number, minX: number, maxX: number, direction: -1 | 1): -1 | 1 {
  if (x <= minX) return 1;
  if (x >= maxX) return -1;
  return direction;
}

/**
 * Видит ли враг цель: только по горизонтали в пределах дальности зрения и
 * только когда цель «внизу» — на полу, а не на уступе (иначе враг без прыжка
 * до неё не доберётся, гнаться бессмысленно).
 */
export function canSeeTarget(
  enemyX: number,
  targetX: number,
  targetY: number,
  floorY: number,
  rangeX: number,
  toleranceY: number,
): boolean {
  return Math.abs(targetY - floorY) <= toleranceY && Math.abs(targetX - enemyX) <= rangeX;
}

/** Направление погони — прямо на цель по X. */
export function chaseDirection(enemyX: number, targetX: number): -1 | 1 {
  return targetX < enemyX ? -1 : 1;
}

/**
 * Математика плавающего тач-стика — без Phaser и без импорта конфига:
 * все пороги приходят параметрами, поэтому поведение проверяется тестами
 * в отрыве от текущих настроек в `config/controls.ts`.
 */

export type MoveDirection = -1 | 0 | 1;
export type TouchZone = 'move' | 'jump';

/** Левая доля канваса управляет движением, остальная — прыжком. */
export function zoneOf(x: number, canvasWidth: number, moveZoneWidthRatio: number): TouchZone {
  return x < canvasWidth * moveZoneWidthRatio ? 'move' : 'jump';
}

/** Сдвиг пальца по X → направление. Внутри мёртвой зоны Пушок стоит. */
export function stickDirection(dx: number, deadZonePx: number): MoveDirection {
  if (dx >= deadZonePx) return 1;
  if (dx <= -deadZonePx) return -1;
  return 0;
}

/**
 * База стика подтягивается за пальцем, когда тот ушёл дальше `maxRadius`.
 * Без этого рука уползает к краю экрана и стик упирается в бортик.
 */
export function recenterOrigin(originX: number, pointerX: number, maxRadius: number): number {
  const dx = pointerX - originX;
  if (dx > maxRadius) return pointerX - maxRadius;
  if (dx < -maxRadius) return pointerX + maxRadius;
  return originX;
}

/** Смещение шляпки относительно базы, обрезанное радиусом. */
export function knobOffset(dx: number, maxRadius: number): number {
  return Math.max(-maxRadius, Math.min(maxRadius, dx));
}

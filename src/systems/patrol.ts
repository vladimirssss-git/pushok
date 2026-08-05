/** Разворот патрулирующего врага у границ маршрута. Чистая функция — тестируется без Phaser. */
export function reverseAtBounds(x: number, minX: number, maxX: number, direction: -1 | 1): -1 | 1 {
  if (x <= minX) return 1;
  if (x >= maxX) return -1;
  return direction;
}

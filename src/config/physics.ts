/**
 * Core game feel. Эти числа определяют, как ощущается управление Пушком.
 * Менять только с явного одобрения — см. "Approval gates" в CLAUDE.md.
 */
export const PHYSICS = {
  gravityY: 1400,
  runSpeed: 190,
  /** Ускорение разгона, px/s^2 */
  acceleration: 1600,
  /** Торможение при отпущенной клавише, px/s^2 */
  drag: 1800,
  jumpVelocity: -470,
  /** Сколько мс после схода с платформы прыжок ещё засчитывается */
  coyoteTimeMs: 90,
  /** Сколько мс прыжок буферизуется до приземления */
  jumpBufferMs: 120,
  maxFallSpeed: 900,
} as const;

import { PHYSICS } from '@/config';

/**
 * Геометрия прыжка, выведенная из физики.
 *
 * Уступ, поставленный «на глаз», может оказаться на пару пикселей выше прыжка —
 * игра при этом не падает и ничего не сообщает, просто уровень непроходим.
 * Поэтому расстановка платформ считается отсюда, а тест сверяет уровень с этими числами.
 */

/** Максимальная высота подъёма из состояния покоя, px. h = v² / (2g) */
export function maxJumpHeight(): number {
  return (PHYSICS.jumpVelocity * PHYSICS.jumpVelocity) / (2 * PHYSICS.gravityY);
}

/** Время в воздухе при прыжке с ровной поверхности на такую же, с. t = 2v / g */
export function jumpAirTimeSec(): number {
  return (2 * Math.abs(PHYSICS.jumpVelocity)) / PHYSICS.gravityY;
}

/** Максимальная дальность прыжка на полном разгоне, px. */
export function maxJumpDistance(): number {
  return PHYSICS.runSpeed * jumpAirTimeSec();
}

/**
 * Запас прочности: уровень строится на 70% от предельных значений.
 * Предел достижим только при идеальном вводе — уровень на пределе играется как сломанный.
 */
export const SAFETY_FACTOR = 0.7;

export function safeStepUp(): number {
  return maxJumpHeight() * SAFETY_FACTOR;
}

export function safeGap(): number {
  return maxJumpDistance() * SAFETY_FACTOR;
}

/** Достижим ли уступ: подъём и горизонтальный разрыв одновременно в пределах прыжка. */
export function isReachable(stepUpPx: number, gapPx: number): boolean {
  return stepUpPx <= maxJumpHeight() && gapPx <= maxJumpDistance();
}

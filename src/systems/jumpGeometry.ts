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

/**
 * Высота, набранная за t секунд после отталкивания (по той же параболе,
 * что и maxJumpHeight — просто не в вершине, а в произвольный момент).
 * h(t) = v·t − g·t²/2
 */
export function riseAtTime(tSec: number): number {
  const v = Math.abs(PHYSICS.jumpVelocity);
  return v * tSec - 0.5 * PHYSICS.gravityY * tSec * tSec;
}

/**
 * Высота, набранная к моменту, когда игрок горизонтально долетает
 * до дистанции gapPx от точки отталкивания.
 */
export function heightAtGap(gapPx: number): number {
  return riseAtTime(gapPx / PHYSICS.runSpeed);
}

/**
 * isReachable проверяет высоту и дальность прыжка независимо друг от друга —
 * этого недостаточно. Прыжок на уступ выше начального уровня — это гонка:
 * к моменту, когда игрок долетает горизонтально до передней грани уступа,
 * он должен УЖЕ быть на нужной высоте, иначе врежется в торец уступа сбоку
 * (bonk), а не запрыгнет на него. isReachable(55, 48) === true не спасает,
 * если игрок этот 48px пролетает раньше, чем поднимется на 55px.
 *
 * gapPx здесь — дистанция от точки отталкивания до ближнего края уступа
 * (а не «чистый» зазор между площадками), поэтому она зависит от того,
 * откуда игрок стартовал прыжок: от дальнего края предыдущей площадки
 * (лучший случай) или сразу после приземления, без разбега (худший случай,
 * см. `worstCaseGap` в `config/level.ts`).
 */
export function isReachableAtGap(stepUpPx: number, gapPx: number): boolean {
  return heightAtGap(gapPx) >= stepUpPx;
}

/**
 * Окно допустимых дистанций прыжка для заданного подъёма: высота набирается
 * не мгновенно и не держится вечно — до пика траектории она растёт, после
 * пика падает обратно, поэтому подходящих дистанций не одна точка, а диапазон
 * между «докуда допрыгнул на подъёме» и «докуда ещё не упал обратно».
 * Используется процедурной генерацией уровня, чтобы подбирать зазор под
 * случайный подъём, а не только проверять готовую пару чисел.
 * Возвращает null, если stepUpPx выше предела прыжка — окна не существует.
 */
export function gapWindowForStepUp(stepUpPx: number): { min: number; max: number } | null {
  const v = Math.abs(PHYSICS.jumpVelocity);
  const g = PHYSICS.gravityY;
  const discriminant = v * v - 2 * g * stepUpPx;
  if (discriminant < 0) return null;
  const sqrtD = Math.sqrt(discriminant);
  const t1 = Math.max(0, (v - sqrtD) / g);
  const t2 = (v + sqrtD) / g;
  return { min: t1 * PHYSICS.runSpeed, max: t2 * PHYSICS.runSpeed };
}

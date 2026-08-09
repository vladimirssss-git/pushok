import { GAME } from './game';

/**
 * Тач-управление (телефон/планшет без клавиатуры): плавающий стик в левой
 * части экрана и прыжок тапом в правой. Координаты и радиусы — в логических
 * пикселях канваса (см. `GAME.width/height`), `Phaser.Scale.FIT` масштабирует
 * их вместе со всей игрой.
 */
export const TOUCH_STICK = {
  /** Доля ширины канваса под зону движения; остальное — зона прыжка. */
  moveZoneWidthRatio: 0.5,
  /** Сдвиг пальца по X меньше этого — Пушок стоит на месте. */
  deadZonePx: 6,
  /** Дальше этого база стика едет за пальцем. */
  maxRadius: 34,
  baseRadius: 26,
  knobRadius: 13,
  alphaBase: 0.25,
  alphaKnob: 0.5,
  /** Вибрация на прыжок с тача, мс. 0 — выключить. В iOS Safari её нет. */
  hapticJumpMs: 10,
} as const;

/** Полупрозрачные иконки-подсказки до первого касания. Не мишени. */
export const TOUCH_CONTROLS = {
  hintRadius: 26,
  hintMargin: 20,
  alphaIdle: 0.3,
  color: 0xffffff,
} as const;

const r = TOUCH_CONTROLS.hintRadius;
const m = TOUCH_CONTROLS.hintMargin;

export const TOUCH_HINT_POSITIONS = {
  move: { x: m + r, y: GAME.height - m - r },
  jump: { x: GAME.width - m - r, y: GAME.height - m - r },
} as const;

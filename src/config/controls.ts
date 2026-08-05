import { GAME } from './game';

/**
 * Раскладка виртуальных тач-кнопок (телефон/планшет без клавиатуры).
 * Координаты — в логических пикселях канваса (см. `GAME.width/height`),
 * Phaser.Scale.FIT масштабирует их вместе со всей игрой.
 */
export const TOUCH_CONTROLS = {
  radius: 30,
  margin: 20,
  gapBetweenMoveButtons: 12,
  alphaIdle: 0.35,
  alphaPressed: 0.6,
  color: 0xffffff,
} as const;

const r = TOUCH_CONTROLS.radius;
const m = TOUCH_CONTROLS.margin;
const gap = TOUCH_CONTROLS.gapBetweenMoveButtons;

export const TOUCH_BUTTON_POSITIONS = {
  left: { x: m + r, y: GAME.height - m - r },
  right: { x: m + r * 3 + gap, y: GAME.height - m - r },
  jump: { x: GAME.width - m - r, y: GAME.height - m - r },
} as const;

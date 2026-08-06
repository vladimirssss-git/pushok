import { describe, it, expect } from 'vitest';
import {
  maxJumpHeight,
  maxJumpDistance,
  isReachable,
  isReachableAtGap,
  safeStepUp,
  safeGap,
  gapWindowForStepUp,
} from '@/systems/jumpGeometry';
import { GAME } from '@/config';

describe('геометрия прыжка', () => {
  it('высота прыжка считается из физики, а не берётся на глаз', () => {
    // v = 470, g = 1400 → h = v²/2g ≈ 78.9
    expect(maxJumpHeight()).toBeCloseTo(78.9, 1);
  });

  it('дальность прыжка положительна и больше ширины тайла', () => {
    expect(maxJumpDistance()).toBeGreaterThan(GAME.tileSize);
  });

  it('запас прочности меньше предела', () => {
    expect(safeStepUp()).toBeLessThan(maxJumpHeight());
    expect(safeGap()).toBeLessThan(maxJumpDistance());
  });

  it('isReachable отвергает подъём или разрыв за пределами прыжка', () => {
    expect(isReachable(maxJumpHeight() + 1, 10)).toBe(false);
    expect(isReachable(10, maxJumpDistance() + 1)).toBe(false);
    expect(isReachable(safeStepUp(), safeGap())).toBe(true);
  });
});

describe('окно допустимой дистанции для подъёма (gapWindowForStepUp)', () => {
  it('для подъёма 0 окно совпадает с [0, maxJumpDistance()]', () => {
    const window = gapWindowForStepUp(0);
    expect(window).not.toBeNull();
    expect(window!.min).toBeCloseTo(0, 5);
    expect(window!.max).toBeCloseTo(maxJumpDistance(), 5);
  });

  it('нет окна для подъёма выше предельной высоты прыжка', () => {
    expect(gapWindowForStepUp(maxJumpHeight() + 1)).toBeNull();
  });

  it('границы окна проходят isReachableAtGap, а чуть за ними — нет', () => {
    const stepUp = safeStepUp();
    const window = gapWindowForStepUp(stepUp)!;
    expect(isReachableAtGap(stepUp, window.min)).toBe(true);
    expect(isReachableAtGap(stepUp, window.max)).toBe(true);
    expect(isReachableAtGap(stepUp, window.min - 5)).toBe(false);
    expect(isReachableAtGap(stepUp, window.max + 5)).toBe(false);
  });

  it('для отрицательного подъёма (спуск) нижняя граница окна — ноль', () => {
    const window = gapWindowForStepUp(-40)!;
    expect(window.min).toBe(0);
  });
});
